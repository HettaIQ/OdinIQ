import { prisma } from "./lib/prisma";

async function main() {
  const product = await prisma.product.upsert({
    where: {
      companyId_productCode: {
        companyId: 1,
        productCode: "HSTTPC50",
      },
    },
    update: {
      costPrice: 6.38,
      active: true,
    },
    create: {
      companyId: 1,
      productCode: "HSTTPC50",
      description: "HSTTPC50",
      costPrice: 6.38,
      active: true,
    },
  });

  console.log(
    `Product ${product.productCode} saved with cost £${product.costPrice}`
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });