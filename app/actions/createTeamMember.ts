"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";

export async function createTeamMember(formData: FormData) {
  const currentUser = await requireAuth();
  const membership = currentUser.memberships[0];

  if (!membership) {
    throw new Error("No active company membership found.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const roleId = Number(formData.get("roleId"));
  const agentCode = String(formData.get("agentCode") ?? "").trim();

  if (!name || !email || !Number.isInteger(roleId)) {
    throw new Error("Name, email and role are required.");
  }

  const role = await prisma.role.findFirst({
    where: {
      id: roleId,
      companyId: membership.companyId,
    },
  });

  if (!role) {
    throw new Error("Role not found.");
  }

  const user = await prisma.user.upsert({
    where: {
      email,
    },
    update: {
      name,
    },
    create: {
      name,
      email,
    },
  });

  await prisma.companyMembership.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId: membership.companyId,
      },
    },
    update: {
      roleId: role.id,
      agentCode:
        role.name === "Sales Agent" && agentCode
          ? agentCode
          : null,
      active: true,
    },
    create: {
      userId: user.id,
      companyId: membership.companyId,
      roleId: role.id,
      agentCode:
        role.name === "Sales Agent" && agentCode
          ? agentCode
          : null,
      active: true,
    },
  });

  revalidatePath("/team");
  redirect("/team");
}