import type { PrismaClient } from "@prisma/client";

import {
  permissionDefinitions,
  roleDefinitions,
} from "./defaultRoles";

type OnboardCompanyInput = {
  companyName: string;
  slug: string;
  adminName: string;
  adminEmail: string;
};

export async function onboardCompany(
  prisma: PrismaClient,
  input: OnboardCompanyInput
) {
  const companyName = input.companyName.trim();
  const slug = input.slug.trim().toLowerCase();
  const adminName = input.adminName.trim();
  const adminEmail = input.adminEmail
    .trim()
    .toLowerCase();

  if (!companyName) {
    throw new Error("Company name is required.");
  }

  if (!slug) {
    throw new Error("Company slug is required.");
  }

  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    throw new Error(
      "Company slug can only contain lowercase letters, numbers and single hyphens."
    );
  }

  if (!adminName) {
    throw new Error(
      "Company administrator name is required."
    );
  }

  if (!adminEmail) {
    throw new Error(
      "Company administrator email is required."
    );
  }

  return prisma.$transaction(async (tx) => {
    /*
     * Onboarding is create-only.
     *
     * An existing tenant must never be
     * re-provisioned through the HQ onboarding
     * process.
     */
    const existingCompany =
      await tx.company.findUnique({
        where: {
          slug,
        },
        select: {
          id: true,
        },
      });

    if (existingCompany) {
      throw new Error(
        `A company already exists with the slug "${slug}".`
      );
    }

    /*
     * Create the new OdinIQ tenant.
     */
    const company = await tx.company.create({
      data: {
        name: companyName,
        slug,
        status: "ACTIVE",
      },
    });

    /*
     * OdinIQ permissions are global definitions.
     *
     * Make sure every permission required by the
     * standard role matrix exists.
     */
    const permissionByKey =
      new Map<string, number>();

    for (const definition of permissionDefinitions) {
      const permission =
        await tx.permission.upsert({
          where: {
            key: definition.key,
          },
          update: {
            description:
              definition.description,
          },
          create: {
            key: definition.key,
            description:
              definition.description,
          },
        });

      permissionByKey.set(
        permission.key,
        permission.id
      );
    }

    /*
     * Create this tenant's six standard roles.
     */
    const createdRoles = [];

    for (const definition of roleDefinitions) {
      const role = await tx.role.create({
        data: {
          companyId: company.id,
          name: definition.name,
          description:
            definition.description,
          isSystem: true,
        },
      });

      const permissionIds =
        definition.permissionKeys.map(
          (key) => {
            const permissionId =
              permissionByKey.get(key);

            if (!permissionId) {
              throw new Error(
                `Permission "${key}" was not provisioned for role "${definition.name}".`
              );
            }

            return permissionId;
          }
        );

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map(
            (permissionId) => ({
              roleId: role.id,
              permissionId,
            })
          ),
        });
      }

      createdRoles.push(role);
    }

    /*
     * Find the Company Admin role we have just
     * created for this tenant.
     */
    const companyAdminRole =
      createdRoles.find(
        (role) =>
          role.name === "Company Admin"
      );

    if (!companyAdminRole) {
      throw new Error(
        "Company Admin role was not created."
      );
    }

    /*
     * OdinIQ users are global identities.
     *
     * If this email already belongs to an OdinIQ
     * user, reuse that identity. Do not overwrite
     * their existing global name.
     */
    let adminUser = await tx.user.findUnique({
      where: {
        email: adminEmail,
      },
    });

    if (!adminUser) {
      adminUser = await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          active: true,
        },
      });
    } else if (!adminUser.active) {
      adminUser = await tx.user.update({
        where: {
          id: adminUser.id,
        },
        data: {
          active: true,
        },
      });
    }

    /*
     * Give the first administrator access to
     * this company only.
     *
     * Their global platformRole is deliberately
     * untouched. A customer Company Admin is not
     * an OdinIQ SUPER_ADMIN.
     */
    const membership =
      await tx.companyMembership.create({
        data: {
          userId: adminUser.id,
          companyId: company.id,
          roleId: companyAdminRole.id,
          agentCode: null,
          active: true,
        },
      });

    return {
      company,
      roles: createdRoles,
      admin: {
        user: adminUser,
        membership,
        role: companyAdminRole,
      },
    };
  });
}