import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";

import { prisma } from "../prisma";

const SESSION_COOKIE_NAME = "odiniq_session";
const SESSION_LENGTH_DAYS = 7;

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: number
): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);

  const expiresAt = new Date();
  expiresAt.setDate(
    expiresAt.getDate() + SESSION_LENGTH_DAYS
  );

  /*
   * Find the companies this user currently has
   * permission to access.
   */
  const memberships =
    await prisma.companyMembership.findMany({
      where: {
        userId,
        active: true,
      },
      select: {
        companyId: true,
      },
      orderBy: {
        id: "asc",
      },
    });

  /*
   * Automatically select a company only when
   * there is exactly one valid choice.
   *
   * Once a user belongs to multiple companies,
   * Odin must not arbitrarily choose one.
   * The company selector will handle that.
   */
  const activeCompanyId =
    memberships.length === 1
      ? memberships[0].companyId
      : null;

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      activeCompanyId,
    },
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure:
      process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function getCurrentSession() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);

  const session = await prisma.session.findUnique({
    where: {
      tokenHash,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    return null;
  }

  return session;
}