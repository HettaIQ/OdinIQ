"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

export async function createTeamMember(formData: FormData) {
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

  const name = String(
    formData.get("name") ?? ""
  ).trim();

  const email = String(
    formData.get("email") ?? ""
  )
    .trim()
    .toLowerCase();

  const roleId = Number(
    formData.get("roleId")
  );

  const agentCode = String(
    formData.get("agentCode") ?? ""
  ).trim();

  if (
    !name ||
    !email ||
    !Number.isInteger(roleId)
  ) {
    throw new Error(
      "Name, email and role are required."
    );
  }

  /*
   * The selected role must belong to the
   * currently active company.
   *
   * This prevents a role ID from another
   * OdinIQ tenant being submitted manually.
   */
  const role = await prisma.role.findFirst({
    where: {
      id: roleId,
      companyId,
    },
  });

  if (!role) {
    throw new Error("Role not found.");
  }

  /*
   * Users are global identities in OdinIQ.
   *
   * A user's membership, role and permissions
   * remain company-specific.
   */
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
        companyId,
      },
    },
    update: {
      roleId: role.id,
      agentCode:
        role.name === "Sales Agent" &&
        agentCode
          ? agentCode
          : null,
      active: true,
    },
    create: {
      userId: user.id,
      companyId,
      roleId: role.id,
      agentCode:
        role.name === "Sales Agent" &&
        agentCode
          ? agentCode
          : null,
      active: true,
    },
  });

  revalidatePath("/team");
  redirect("/team");
}