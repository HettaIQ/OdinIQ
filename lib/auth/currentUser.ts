import { createHash } from "crypto";
import { cookies } from "next/headers";

import { prisma } from "../prisma";

const SESSION_COOKIE_NAME = "odiniq_session";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function getCurrentUser() {
  const cookieStore = await cookies();

  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);

  const session = await prisma.session.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: {
        include: {
          memberships: {
            where: {
              active: true,
            },
            include: {
              company: true,
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    return null;
  }

  const memberships = session.user.memberships;

  if (memberships.length === 0) {
    return session.user;
  }

  let activeMembership = session.activeCompanyId
    ? memberships.find(
        (membership) =>
          membership.companyId ===
          session.activeCompanyId
      )
    : undefined;

  /*
   * Existing sessions do not yet have an
   * activeCompanyId.
   *
   * If the user currently has only one active
   * company membership, safely make that company
   * the active company for this session.
   */
  if (!activeMembership && memberships.length === 1) {
    activeMembership = memberships[0];

    await prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        activeCompanyId:
          activeMembership.companyId,
      },
    });
  }

  /*
   * If an activeCompanyId exists but the user no
   * longer has access to that company, do not
   * silently switch them into another tenant.
   *
   * This becomes especially important once Odin
   * contains multiple customer companies.
   */
  if (!activeMembership) {
    return {
      ...session.user,
      memberships: [],
    };
  }

  /*
   * Keep the active membership first.
   *
   * Existing Odin code that currently uses
   * user.memberships[0] will therefore use the
   * explicitly selected company while we migrate
   * the application to the central company
   * context.
   */
  const orderedMemberships = [
    activeMembership,
    ...memberships.filter(
      (membership) =>
        membership.id !== activeMembership.id
    ),
  ];

  return {
    ...session.user,
    memberships: orderedMemberships,
  };
}