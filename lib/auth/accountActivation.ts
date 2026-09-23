import {
  createHash,
  randomBytes,
} from "crypto";

import { prisma } from "@/lib/prisma";

const ACTIVATION_TOKEN_HOURS = 24;

function hashActivationToken(
  token: string
): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function createAccountActivationToken(
  userId: number
) {
  if (!Number.isInteger(userId)) {
    throw new Error("Valid user ID is required.");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      active: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  if (!user.active) {
    throw new Error(
      "Cannot create an activation link for an inactive user."
    );
  }

  /*
   * Only one unused activation link should be
   * valid for a user at a time.
   *
   * Mark any previous unused tokens as used
   * before issuing a fresh one.
   */
  await prisma.accountActivationToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  /*
   * The raw token is returned once so it can be
   * placed in the activation URL.
   *
   * OdinIQ stores only the SHA-256 hash.
   */
  const token = randomBytes(32).toString("hex");
  const tokenHash =
    hashActivationToken(token);

  const expiresAt = new Date(
    Date.now() +
      ACTIVATION_TOKEN_HOURS *
        60 *
        60 *
        1000
  );

  await prisma.accountActivationToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
  };
}

export function getAccountActivationTokenHash(
  token: string
): string {
  return hashActivationToken(token);
}