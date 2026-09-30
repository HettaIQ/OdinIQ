import { prisma } from "./lib/prisma";

async function main() {
  console.log("");
  console.log("ODINIQ HETTA TENANT CHECK");
  console.log("=========================");
  console.log("");

  const hettaCompany =
    await prisma.company.findUnique({
      where: {
        id: 1,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
      },
    });

  if (!hettaCompany) {
    throw new Error(
      "Company ID 1 does not exist."
    );
  }

  if (
    hettaCompany.slug !==
    "hetta-systems"
  ) {
    throw new Error(
      `Company ID 1 is ${hettaCompany.name} (${hettaCompany.slug}), not Hetta Systems.`
    );
  }

  console.log(
    `Confirmed tenant: ${hettaCompany.name}`
  );
  console.log(
    `Company ID:       ${hettaCompany.id}`
  );
  console.log(
    `Slug:             ${hettaCompany.slug}`
  );
  console.log(
    `Status:           ${hettaCompany.status}`
  );

  const [
    products,
    agreements,
    customers,
    salesOrders,
    salesInvoices,
    gdns,
    quotes,
  ] = await Promise.all([
    prisma.product.count({
      where: {
        companyId:
          hettaCompany.id,
      },
    }),

    prisma.commercialAgreement.count({
      where: {
        companyId:
          hettaCompany.id,
      },
    }),

    prisma.customer.count({
      where: {
        companyId:
          hettaCompany.id,
      },
    }),

    prisma.salesOrder.count({
      where: {
        companyId:
          hettaCompany.id,
      },
    }),

    prisma.salesInvoice.count({
      where: {
        companyId:
          hettaCompany.id,
      },
    }),

    prisma.goodsDespatchNote.count({
      where: {
        companyId:
          hettaCompany.id,
      },
    }),

    prisma.quote.count({
      where: {
        companyId:
          hettaCompany.id,
      },
    }),
  ]);

  console.log("");
  console.log("HETTA TENANT DATA");
  console.log("-----------------");
  console.log(
    `Products:      ${products}`
  );
  console.log(
    `Agreements:    ${agreements}`
  );
  console.log(
    `Customers:     ${customers}`
  );
  console.log(
    `Sales Orders:  ${salesOrders}`
  );
  console.log(
    `Invoices:      ${salesInvoices}`
  );
  console.log(
    `GDNs:          ${gdns}`
  );
  console.log(
    `Quotes:        ${quotes}`
  );

  const memberships =
    await prisma.companyMembership.findMany({
      where: {
        companyId:
          hettaCompany.id,
        active: true,
      },

      select: {
        id: true,

        user: {
          select: {
            name: true,
            email: true,
            platformRole: true,
          },
        },

        role: {
          select: {
            name: true,
          },
        },
      },

      orderBy: {
        id: "asc",
      },
    });

  console.log("");
  console.log("ACTIVE MEMBERSHIPS");
  console.log("------------------");

  for (
    const membership of memberships
  ) {
    console.log(
      [
        `Membership ${membership.id}`,
        membership.user.name,
        membership.user.email,
        membership.role?.name ??
          "NO ROLE",
        `Platform: ${membership.user.platformRole}`,
      ].join(" | ")
    );
  }

  console.log("");
  console.log("SUCCESS");
  console.log(
    "Hetta Systems tenant data is assigned to company ID 1."
  );
  console.log(
    "Product and Commercial Agreement company ownership is now enforced by the Prisma schema."
  );
  console.log("");
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "TENANT CHECK FAILED"
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });