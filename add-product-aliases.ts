import { prisma } from "./lib/prisma";

async function main() {
  const aliases = [
    {
      aliasCode: "KIT30HP",
      targetProductCode: "HSKIT30",
      source: "SAGE_GDN",
      notes: "Legacy Sage/GDN code mapped to Xero product code.",
    },
    {
      aliasCode: "KIT40HP",
      targetProductCode: "HSKIT40",
      source: "SAGE_GDN",
      notes: "Legacy Sage/GDN code mapped to Xero product code.",
    },
  ];

  const company = await prisma.company.findFirst({
    orderBy: {
      id: "asc",
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!company) {
    throw new Error("No company found.");
  }

  console.log(
    `Using company ${company.name} (ID ${company.id})`
  );

  for (const alias of aliases) {
    const product =
  await prisma.product.findUnique({
    where: {
      companyId_productCode: {
        companyId: company.id,
        productCode:
          alias.targetProductCode,
      },
    },
        select: {
          id: true,
          productCode: true,
          description: true,
          costPrice: true,
        },
      });

    if (!product) {
      console.log(
        `SKIPPED ${alias.aliasCode}: target product ${alias.targetProductCode} not found.`
      );
      continue;
    }

    await prisma.productAlias.upsert({
      where: {
        companyId_aliasCode: {
          companyId: company.id,
          aliasCode: alias.aliasCode,
        },
      },

      update: {
        productId: product.id,
        source: alias.source,
        notes: alias.notes,
      },

      create: {
        companyId: company.id,
        productId: product.id,
        aliasCode: alias.aliasCode,
        source: alias.source,
        notes: alias.notes,
      },
    });

    console.log(
      `ALIAS SAVED: ${alias.aliasCode} -> ${product.productCode} | ${product.description} | Cost ${product.costPrice ?? "NO COST"}`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });