import { prisma } from "./lib/prisma";

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      productCode: true,
      description: true,
      supplier: true,
    },
  });

  let updated = 0;

  for (const product of products) {
    const supplier = String(
      product.supplier ?? ""
    )
      .trim()
      .toLowerCase();

    const description = product.description
      .trim()
      .toLowerCase();

    const isHeatmiserSupplier =
      supplier === "heatmiser" ||
      supplier === "heatmister";

    const isBlankHeatmiserProduct =
      supplier === "" &&
      description.startsWith("heatmiser");

    if (
      !isHeatmiserSupplier &&
      !isBlankHeatmiserProduct
    ) {
      continue;
    }

    if (product.supplier === "Heatmiser") {
      continue;
    }

    await prisma.product.update({
      where: {
        id: product.id,
      },
      data: {
        supplier: "Heatmiser",
      },
    });

    console.log(
      `UPDATED ${product.productCode}: "${product.supplier ?? ""}" -> "Heatmiser"`
    );

    updated++;
  }

  console.log(
    `Done. Normalised ${updated} Heatmiser product(s).`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });