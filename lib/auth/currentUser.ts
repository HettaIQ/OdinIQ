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

  return session.user;
}