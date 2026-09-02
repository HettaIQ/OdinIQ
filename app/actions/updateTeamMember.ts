"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";

export async function updateTeamMember(
  membershipId: number,
  formData: FormData
) {
  const currentUser = await requireAuth();
  const currentMembership = currentUser.memberships[0];

  if (!currentMembership) {
    throw new Error("No active company membership found.");
  }

  const member = await prisma.companyMembership.findFirst({
    where: {
      id: membershipId,
      companyId: currentMembership.companyId,
    },
  });

  if (!member) {
    throw new Error("Team member not found.");
  }

  const roleId = Number(formData.get("roleId"));
  const agentCode = String(formData.get("agentCode") ?? "").trim();
  const active = formData.get("active") === "true";

  const role = await prisma.role.findFirst({
    where: {
      id: roleId,
      companyId: currentMembership.companyId,
    },
  });

  if (!role) {
    throw new Error("Role not found.");
  }

  await prisma.companyMembership.update({
    where: {
      id: member.id,
    },
    data: {
      roleId: role.id,
      agentCode:
        role.name === "Sales Agent" && agentCode
          ? agentCode
          : null,
      active,
    },
  });

  revalidatePath(`/team/${member.id}`);
  revalidatePath("/team");
}