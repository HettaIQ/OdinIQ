"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth/session";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({
    where: {
      email,
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

  redirect("/dashboard");
}