import { prisma } from "../lib/prisma";

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

  const companyAdminRole = await prisma.role.upsert({
    where: {
      companyId_name: {
        companyId: company.id,
        name: "Company Admin",
      },
    },
    update: {
      description: "Full administrative access within this company.",
      isSystem: true,
    },
    create: {
      companyId: company.id,
      name: "Company Admin",
      description: "Full administrative access within this company.",
      isSystem: true,
    },
  });

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

  await prisma.companyMembership.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId: company.id,
      },
    },
    update: {
      roleId: companyAdminRole.id,
      active: true,
    },
    create: {
      userId: user.id,
      companyId: company.id,
      roleId: companyAdminRole.id,
      active: true,
    },
  });

  console.log("Company created:", company.name);
  console.log("Company role created:", companyAdminRole.name);
  console.log("Super Admin created:", user.email);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });