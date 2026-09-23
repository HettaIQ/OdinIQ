"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { getAccountActivationTokenHash } from "@/lib/auth/accountActivation";

export async function activateAccount(
  formData: FormData
) {
  const token = String(
    formData.get("token") ?? ""
  ).trim();

  const password = String(
    formData.get("password") ?? ""
  );

  const confirmPassword = String(
    formData.get("confirmPassword") ?? ""
  );

  if (!token) {
    throw new Error(
      "Activation token is missing."
    );
  }

  if (password.length < 10) {
    throw new Error(
      "Password must be at least 10 characters."
    );
  }

  if (password !== confirmPassword) {
    throw new Error(
      "Passwords do not match."
    );
  }

  const tokenHash =
    getAccountActivationTokenHash(token);

  /*
   * Password creation and token consumption happen
   * in the same transaction.
   *
   * Either both succeed or neither succeeds.
   */
  await prisma.$transaction(async (tx) => {
    const activation =
      await tx.accountActivationToken.findUnique({
        where: {
          tokenHash,
        },
        include: {
          user: true,
        },
      });

    if (!activation) {
      throw new Error(
        "Activation link is invalid."
      );
    }

    if (activation.usedAt) {
      throw new Error(
        "Activation link has already been used."
      );
    }

    if (activation.expiresAt <= new Date()) {
      throw new Error(
        "Activation link has expired."
      );
    }

    if (!activation.user.active) {
      throw new Error(
        "This OdinIQ account is inactive."
      );
    }

    const passwordHash =
      hashPassword(password);

    await tx.user.update({
      where: {
        id: activation.userId,
      },
      data: {
        passwordHash,
      },
    });

    await tx.accountActivationToken.update({
      where: {
        id: activation.id,
      },
      data: {
        usedAt: new Date(),
      },
    });
  });

  redirect("/login");
}