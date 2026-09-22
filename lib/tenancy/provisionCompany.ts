import type { PrismaClient } from "@prisma/client";

import {
  permissionDefinitions,
  roleDefinitions,
} from "./defaultRoles";

type ProvisionCompanyInput = {
  name: string;
  slug: string;
  status?: string;
};

export async function provisionCompany(
  prisma: PrismaClient,
  input: ProvisionCompanyInput
) {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();

  if (!name) {
    throw new Error("Company name is required.");
  }

  if (!slug) {
    throw new Error("Company slug is required.");
  }

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.upsert({
      where: {
        slug,
      },
      update: {
        name,
        status: input.status ?? "ACTIVE",
      },
      create: {
        name,
        slug,
        status: input.status ?? "ACTIVE",
      },
    });

    const permissionByKey = new Map<string, number>();

    for (const definition of permissionDefinitions) {
      const permission = await tx.permission.upsert({
        where: {
          key: definition.key,
        },
        update: {
          description: definition.description,
        },
        create: {
          key: definition.key,
          description: definition.description,
        },
      });

      permissionByKey.set(permission.key, permission.id);
    }

    const roles = [];

    for (const definition of roleDefinitions) {
      const role = await tx.role.upsert({
        where: {
          companyId_name: {
            companyId: company.id,
            name: definition.name,
          },
        },
        update: {
          description: definition.description,
          isSystem: true,
        },
        create: {
          companyId: company.id,
          name: definition.name,
          description: definition.description,
          isSystem: true,
        },
      });

      await tx.rolePermission.deleteMany({
        where: {
          roleId: role.id,
        },
      });

      const permissionIds = definition.permissionKeys.map((key) => {
        const permissionId = permissionByKey.get(key);

        if (!permissionId) {
          throw new Error(
            `Permission "${key}" was not provisioned for role "${definition.name}".`
          );
        }

        return permissionId;
      });

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        });
      }

      roles.push(role);
    }

    return {
      company,
      roles,
    };
  });
}