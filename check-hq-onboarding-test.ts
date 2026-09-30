import { prisma } from "./lib/prisma";

async function main() {
  const company = await prisma.company.findUnique({
    where: {
      slug: "odiniq-onboarding-test-ltd",
    },
    include: {
      roles: {
        include: {
          _count: {
            select: {
              permissions: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      },
      memberships: {
        include: {
          user: true,
          role: true,
        },
      },
      _count: {
        select: {
          products: true,
          customers: true,
          salesOrders: true,
          salesInvoices: true,
          quotes: true,
        },
      },
    },
  });

  if (!company) {
    throw new Error("Test company not found.");
  }

  console.log("");
  console.log("COMPANY");
  console.log("=======");
  console.log("ID:", company.id);
  console.log("Name:", company.name);
  console.log("Slug:", company.slug);
  console.log("Status:", company.status);

  console.log("");
  console.log("ROLES");
  console.log("=====");

  for (const role of company.roles) {
    console.log(
      `${role.name}: ${role._count.permissions} permissions`
    );
  }

  console.log("");
  console.log("MEMBERSHIPS");
  console.log("===========");

  for (const membership of company.memberships) {
    console.log(
      `${membership.user.name} | ${membership.user.email} | ${membership.role?.name} | Active: ${membership.active}`
    );
  }

  console.log("");
  console.log("TENANT DATA");
  console.log("===========");
  console.log(company._count);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
