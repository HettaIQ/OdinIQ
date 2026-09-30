"use server";

import { redirect } from "next/navigation";

import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const DEMO_EMAIL = "demo@odiniq.co.uk";
const DEMO_COMPANY_SLUG = "odin-demo";
const DEMO_ROLE_NAME = "Demo Viewer";

export async function enterDemo() {
  /*
   * The public demo is deliberately locked to a
   * specific OdinIQ-controlled demo account.
   *
   * Nothing supplied by the browser determines
   * the user, company or role.
   */
  const demoUser = await prisma.user.findUnique({
    where: {
      email: DEMO_EMAIL,
    },
    include: {
      memberships: {
        where: {
          active: true,
        },
        include: {
          company: true,
          role: true,
        },
      },
    },
  });

  if (!demoUser || !demoUser.active) {
    throw new Error(
      "The OdinIQ demo account is not available."
    );
  }

  /*
   * The demo account must remain a normal user.
   * Never allow the public demo account to become
   * an OdinIQ platform administrator.
   */
  if (demoUser.platformRole !== "USER") {
    throw new Error(
      "The OdinIQ demo account is not configured safely."
    );
  }

  /*
   * The demo account must have exactly one active
   * company membership.
   *
   * This prevents accidental access to another
   * tenant if the account is ever changed later.
   */
  if (demoUser.memberships.length !== 1) {
    throw new Error(
      "The OdinIQ demo account must have exactly one active company."
    );
  }

  const membership =
    demoUser.memberships[0];

  /*
   * Double-check both the company and role before
   * creating any browser session.
   */
  if (
    membership.company.slug !==
      DEMO_COMPANY_SLUG ||
    membership.role?.name !==
      DEMO_ROLE_NAME
  ) {
    throw new Error(
      "The OdinIQ demo account is not configured safely."
    );
  }

  /*
   * Public demo sessions are intentionally short.
   * Normal OdinIQ logins continue to use the
   * standard seven-day session.
   */
  await createSession(demoUser.id, {
    durationHours: 2,
  });

  redirect("/dashboard");
}