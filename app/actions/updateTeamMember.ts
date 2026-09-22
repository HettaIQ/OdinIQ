"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

export async function updateTeamMember(
  membershipId: number,
  formData: FormData
) {
  const {
    user: currentUser,
    membership,
    companyId,
  } = await requireCompanyContext();

  const canManageUsers =
    currentUser.platformRole === "SUPER_ADMIN" ||
    Boolean(
      membership.role?.permissions.some(
        ({ permission }) =>
          permission.key === "users.manage"
      )
    );

  if (!canManageUsers) {
    throw new Error(
      "You do not have permission to manage team members."
    );
  }

  /*
   * The membership being edited must belong
   * to the currently selected company.
   */
  const member =
    await prisma.companyMembership.findFirst({
      where: {
        id: membershipId,
        companyId,
      },
    });

  if (!member) {
    throw new Error(
      "Team member not found."
    );
  }

  const roleId = Number(
    formData.get("roleId")
  );

  const agentCode = String(
    formData.get("agentCode") ?? ""
  ).trim();

  const active =
    formData.get("active") === "true";

  if (!Number.isInteger(roleId)) {
    throw new Error(
      "A valid role is required."
    );
  }

  /*
   * The selected role must also belong
   * to the active company.
   *
   * This prevents a role ID belonging to
   * another OdinIQ tenant being submitted.
   */
  const role =
    await prisma.role.findFirst({
      where: {
        id: roleId,
        companyId,
      },
    });

  if (!role) {
    throw new Error(
      "Role not found."
    );
  }

  await prisma.companyMembership.update({
    where: {
      id: member.id,
    },
    data: {
      roleId: role.id,

      agentCode:
        role.name === "Sales Agent" &&
        agentCode
          ? agentCode
          : null,

      active,
    },
  });

  revalidatePath(
    `/team/${member.id}`
  );

  revalidatePath("/team");
}