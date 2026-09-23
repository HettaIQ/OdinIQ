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

  /*
   * Company slugs are used as permanent,
   * URL-safe identifiers within OdinIQ.
   */
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      "Company slug can only contain lowercase letters, numbers and single hyphens."
    );
  }

  return prisma.$transaction(async (tx) => {
    /*
     * HQ onboarding is deliberately create-only.
     *
     * We must never accidentally re-provision an
     * existing tenant because provisioning also
     * creates the company's standard roles and
     * role permissions.
     */
    const existingCompany =
      await tx.company.findUnique({
        where: {
          slug,
        },
        select: {
          id: true,
          name: true,
        },
      });

    if (existingCompany) {
      throw new Error(
        `A company already exists with the slug "${slug}".`
      );
    }

    const company = await tx.company.create({
      data: {
        name,
        slug,
        status: input.status ?? "ACTIVE",
      },
    });

    /*
     * Permissions are global OdinIQ definitions.
     *
     * Ensure every permission required by the
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
     * Every newly provisioned company receives
     * its own copy of OdinIQ's standard roles.
     */
    const roles = [];

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

      roles.push(role);
    }

    return {
      company,
      roles,
    };
  });
}