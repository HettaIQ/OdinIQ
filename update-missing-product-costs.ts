import { prisma } from "./lib/prisma";

const productsToUpdate = [
  {
    productCode: "HSACTPIN",
    description: "Hetta UFH Manifold Return Pin Valve",
    costPrice: 1.8,
  },
  {
    productCode: "HSMC15",
    description: "15mm Manifold Connectors",
    costPrice: 0.48,
  },
  {
    productCode: "HSPE16",
    description: "Press Fitting 16mm Elbow",
    costPrice: 0.2,
  },
  {
    productCode: "HSPS16",
    description: "Press Fitting 16mm Straight",
    costPrice: 0.2,
  },
  {
    productCode: "HSWSP01",
    description:
      "Wet Screed Underfloor Heating Panel - Legacy 20mm",
    costPrice: 3.88,
  },
];

async function main() {
  const company =
    await prisma.company.findFirst({
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    });

  if (!company) {
    throw new Error(
      "No company found."
    );
  }

  console.log(
    `Using company ${company.name} (ID ${company.id})`
  );

  for (const item of productsToUpdate) {
    const existing =
      await prisma.product.findUnique({
        where: {
          companyId_productCode: {
            companyId: company.id,
            productCode:
              item.productCode,
          },
        },
        select: {
          id: true,
          productCode: true,
          description: true,
          costPrice: true,
          companyId: true,
        },
      });

    if (existing) {
      await prisma.product.update({
        where: {
          id: existing.id,
        },
        data: {
          costPrice:
            item.costPrice,

          /*
           * Keep existing description if one
           * already exists.
           */
          description:
            existing.description ||
            item.description,
        },
      });

      console.log(
        `UPDATED ${item.productCode}: £${item.costPrice.toFixed(
          2
        )}`
      );

      continue;
    }

    await prisma.product.create({
      data: {
        companyId:
          company.id,
        productCode:
          item.productCode,
        description:
          item.description,
        costPrice:
          item.costPrice,
        active: true,
      },
    });

    console.log(
      `CREATED ${item.productCode}: £${item.costPrice.toFixed(
        2
      )}`
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