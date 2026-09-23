import type { PrismaClient } from "@prisma/client";

type AssignCompanyAdminInput = {
  companyId: number;
  name: string;
  email: string;
};

export async function assignCompanyAdmin(
  prisma: PrismaClient,
  input: AssignCompanyAdminInput
) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (!Number.isInteger(input.companyId)) {
    throw new Error("Valid company ID is required.");
  }

  if (!name) {
    throw new Error("Administrator name is required.");
  }

  if (!email) {
    throw new Error("Administrator email is required.");
  }

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.findUnique({
      where: {
        id: input.companyId,
      },
    });

    if (!company) {
      throw new Error("Company not found.");
    }

    const companyAdminRole = await tx.role.findUnique({
      where: {
        companyId_name: {
          companyId: company.id,
          name: "Company Admin",
        },
      },
    });

    if (!companyAdminRole) {
      throw new Error(
        "Company Admin role has not been provisioned for this company."
      );
    }

    /*
     * Users are global identities in OdinIQ.
     *
     * Their company access and permissions are controlled
     * through CompanyMembership.
     */
    const user = await tx.user.upsert({
      where: {
        email,
      },
      update: {
        name,
        active: true,
      },
      create: {
        name,
        email,
        active: true,
      },
    });

    const membership = await tx.companyMembership.upsert({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId: company.id,
        },
      },
      update: {
        roleId: companyAdminRole.id,
        agentCode: null,
        active: true,
      },
      create: {
        userId: user.id,
        companyId: company.id,
        roleId: companyAdminRole.id,
        agentCode: null,
        active: true,
      },
    });

    return {
      company,
      user,
      membership,
      role: companyAdminRole,
    };
  });
}