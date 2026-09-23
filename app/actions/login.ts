"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth/session";

export async function login(formData: FormData) {
  const email = String(
    formData.get("email") ?? ""
  )
    .trim()
    .toLowerCase();

  const password = String(
    formData.get("password") ?? ""
  );

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      memberships: {
        where: {
          active: true,
        },
        select: {
          companyId: true,
        },
      },
    },
  });

  if (
    !user ||
    !user.active ||
    !user.passwordHash ||
    !verifyPassword(password, user.passwordHash)
  ) {
    throw new Error("Invalid email or password.");
  }

  await createSession(user.id);

  /*
   * Platform administrators enter Odin HQ.
   *
   * Odin HQ sits above all customer companies
   * and must not depend on an active tenant.
   */
  if (user.platformRole === "SUPER_ADMIN") {
    redirect("/hq");
  }

  /*
   * Users with access to multiple companies
   * must explicitly choose which tenant they
   * want to enter.
   */
  if (user.memberships.length > 1) {
    redirect("/select-company");
  }

  /*
   * A normal user with one company will already
   * have that company selected by createSession().
   */
  redirect("/dashboard");
}