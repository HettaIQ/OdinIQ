import { createHash } from "crypto";
import { cookies } from "next/headers";

import { prisma } from "../prisma";

const SESSION_COOKIE_NAME = "odiniq_session";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

type GetCurrentUserOptions = {
  allMemberships?: boolean;
};

export async function getCurrentUser(
  options: GetCurrentUserOptions = {}
) {
  const cookieStore = await cookies();

  const token =
    cookieStore.get(SESSION_COOKIE_NAME)?.value;

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
            orderBy: {
              id: "asc",
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

  const memberships =
    session.user.memberships;

  /*
   * Some pages, such as the company selector,
   * need to see every company the user can
   * access.
   */
  if (options.allMemberships) {
    return {
      ...session.user,
      memberships,
    };
  }

  if (memberships.length === 0) {
    return session.user;
  }

  /*
   * Find the membership belonging to the
   * company currently selected for this
   * browser session.
   */
  let activeMembership =
    session.activeCompanyId
      ? memberships.find(
          (membership) =>
            membership.companyId ===
            session.activeCompanyId
        )
      : undefined;

  /*
   * Existing/single-company users can safely
   * have their only company selected
   * automatically.
   */
  if (
    !activeMembership &&
    memberships.length === 1
  ) {
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
   * If no company has been selected and the
   * user has multiple companies, do not guess.
   *
   * Tenant pages will therefore see no active
   * membership until the user deliberately
   * selects a company.
   */
  if (!activeMembership) {
    return {
      ...session.user,
      memberships: [],
    };
  }

  /*
   * Keep the active company first so existing
   * Odin code using memberships[0] continues
   * to operate against the selected tenant
   * during the transition to central company
   * context.
   */
  const orderedMemberships = [
    activeMembership,
    ...memberships.filter(
      (membership) =>
        membership.id !==
        activeMembership.id
    ),
  ];

  return {
    ...session.user,
    memberships: orderedMemberships,
  };
}