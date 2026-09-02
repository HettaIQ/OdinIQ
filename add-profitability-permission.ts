import { prisma } from "./lib/prisma";

async function main() {
  const permission = await prisma.permission.upsert({
    where: {
      key: "commercial.profitability.view",
    },
    update: {
      description:
        "View commercially sensitive cost prices, margins and customer profitability.",
    },
    create: {
      key: "commercial.profitability.view",
      description:
        "View commercially sensitive cost prices, margins and customer profitability.",
    },
  });

  const allowedRoles = await prisma.role.findMany({
    where: {
      name: {
        in: ["Company Admin", "Accounts"],
      },
    },
  });

  console.log(
    `Found ${allowedRoles.length} Company Admin / Accounts roles.`
  );

  for (const role of allowedRoles) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: permission.id,
      },
    });

    console.log(
      `Granted profitability access to ${role.name} (role ${role.id}).`
    );
  }

  console.log("");
  console.log("Profitability permission configured successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });