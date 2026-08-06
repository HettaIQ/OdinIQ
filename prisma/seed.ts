import { prisma } from "../lib/prisma";

const permissionDefinitions = [
  {
    key: "products.view",
    description: "View the product catalogue.",
  },
  {
    key: "products.view_list_price",
    description: "View product list prices.",
  },
  {
    key: "products.view_cost_price",
    description: "View internal cost prices.",
  },
  {
    key: "products.view_margin",
    description: "View product margin information.",
  },
  {
    key: "customers.view_all",
    description: "View all customers belonging to the company.",
  },
  {
    key: "customers.view_own",
    description: "View only customers assigned to the user.",
  },
  {
    key: "quotes.view_all",
    description: "View all company quotations.",
  },
  {
    key: "quotes.view_own",
    description: "View only quotations assigned to or created by the user.",
  },
  {
    key: "quotes.create",
    description: "Create quotations.",
  },
  {
    key: "quotes.upload",
    description: "Upload quotation documents.",
  },
  {
    key: "quotes.approve",
    description: "Approve quotations.",
  },
  {
    key: "sales.view_all",
    description: "View all company sales.",
  },
  {
    key: "sales.view_own",
    description: "View only sales assigned to the user.",
  },
  {
    key: "agreements.view",
    description: "View commercial agreements.",
  },
  {
    key: "agreements.manage",
    description: "Create and edit commercial agreements.",
  },
  {
    key: "rebates.view",
    description: "View rebates and rebate schemes.",
  },
  {
    key: "users.manage",
    description: "Create users and manage company roles.",
  },
] as const;

const roleDefinitions = [
  {
    name: "Company Admin",
    description: "Full administrative access within this company.",
    permissionKeys: permissionDefinitions.map(
      (permission) => permission.key
    ),
  },
  {
    name: "Management",
    description:
      "Company-wide commercial access including costs, margins, agreements and quote approvals.",
    permissionKeys: [
      "products.view",
      "products.view_list_price",
      "products.view_cost_price",
      "products.view_margin",
      "customers.view_all",
      "quotes.view_all",
      "quotes.create",
      "quotes.upload",
      "quotes.approve",
      "sales.view_all",
      "agreements.view",
      "agreements.manage",
      "rebates.view",
    ],
  },
  {
    name: "Quoting Team",
    description:
      "Can create, upload and view company quotations without company-wide administration.",
    permissionKeys: [
      "products.view",
      "products.view_list_price",
      "customers.view_all",
      "quotes.view_all",
      "quotes.create",
      "quotes.upload",
    ],
  },
  {
    name: "Sales Agent",
    description:
      "Can view assigned customers, quotations and sales. Cost prices and margins are hidden.",
    permissionKeys: [
      "products.view",
      "products.view_list_price",
      "customers.view_own",
      "quotes.view_own",
      "quotes.create",
      "quotes.upload",
      "sales.view_own",
    ],
  },
] as const;

async function main() {
  const company = await prisma.company.upsert({
    where: {
      slug: "hetta-systems",
    },
    update: {
      name: "Hetta Systems",
      status: "ACTIVE",
    },
    create: {
      name: "Hetta Systems",
      slug: "hetta-systems",
      status: "ACTIVE",
    },
  });

  const permissionMap = new Map<string, number>();

  for (const definition of permissionDefinitions) {
    const permission = await prisma.permission.upsert({
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

    permissionMap.set(permission.key, permission.id);
  }

  const roleMap = new Map<string, number>();

  for (const definition of roleDefinitions) {
    const role = await prisma.role.upsert({
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

    roleMap.set(role.name, role.id);

    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
      },
    });

    const permissionRows = definition.permissionKeys.map(
      (permissionKey) => {
        const permissionId = permissionMap.get(permissionKey);

        if (!permissionId) {
          throw new Error(
            `Permission "${permissionKey}" could not be found.`
          );
        }

        return {
          roleId: role.id,
          permissionId,
        };
      }
    );

    await prisma.rolePermission.createMany({
      data: permissionRows,
    });
  }

  const user = await prisma.user.upsert({
    where: {
      email: "jamie@odiniq.co.uk",
    },
    update: {
      name: "Jamie",
      platformRole: "SUPER_ADMIN",
      active: true,
    },
    create: {
      name: "Jamie",
      email: "jamie@odiniq.co.uk",
      platformRole: "SUPER_ADMIN",
      active: true,
    },
  });

  const companyAdminRoleId = roleMap.get("Company Admin");

  if (!companyAdminRoleId) {
    throw new Error("The Company Admin role could not be created.");
  }

  await prisma.companyMembership.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId: company.id,
      },
    },
    update: {
      roleId: companyAdminRoleId,
      active: true,
    },
    create: {
      userId: user.id,
      companyId: company.id,
      roleId: companyAdminRoleId,
      active: true,
    },
  });

  console.log("Company ready:", company.name);
  console.log("Permissions created:", permissionDefinitions.length);
  console.log("Roles created:", roleDefinitions.length);
  console.log("Super Admin ready:", user.email);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });