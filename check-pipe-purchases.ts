import { prisma } from "./lib/prisma";

const PIPE = [
  { code: "HSPAP100", metres: 100 },
  { code: "HSPAP150", metres: 150 },
  { code: "HSPAP200", metres: 200 },
  { code: "HSPAP500", metres: 500 },
];

async function main() {
  const lines = await prisma.purchaseOrderLine.findMany({
    where: {
      productCode: {
        in: PIPE.map((p) => p.code),
      },
      purchaseOrder: {
        supplierAccountCode: "TWEETOP",
      },
    },
    include: {
      purchaseOrder: true,
    },
  });

  console.log("");
  console.log("ODINIQ PIPE PURCHASE CHECK");
  console.log("==========================");
  console.log("");

  for (const year of [2025, 2026]) {
    const start = new Date(
      Date.UTC(year, 0, 1)
    );

    const end = new Date(
      Date.UTC(year, 8, 24, 23, 59, 59)
    );

    console.log(
      `${year} YTD - 1 Jan to 24 Sep`
    );
    console.log(
      "----------------------------"
    );

    let totalCoils = 0;
    let totalMetres = 0;
    let totalSpend = 0;

    for (const pipe of PIPE) {
      const matching = lines.filter(
        (line) => {
          const date =
            line.purchaseOrder.orderDate;

          return (
            line.productCode === pipe.code &&
            date !== null &&
            date >= start &&
            date <= end
          );
        }
      );

      const coils = matching.reduce(
        (sum, line) =>
          sum +
          (line.quantityDelivered ??
            line.quantity ??
            0),
        0
      );

      const metres =
        coils * pipe.metres;

      const spend = matching.reduce(
        (sum, line) =>
          sum + (line.netValue ?? 0),
        0
      );

      totalCoils += coils;
      totalMetres += metres;
      totalSpend += spend;

      console.log(
        `${pipe.code} (${pipe.metres}m): ` +
          `${coils.toLocaleString("en-GB")} coils | ` +
          `${metres.toLocaleString("en-GB")}m | ` +
          `£${spend.toLocaleString("en-GB", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
      );
    }

    console.log("");
    console.log(
      `TOTAL: ${totalCoils.toLocaleString("en-GB")} coils | ` +
        `${totalMetres.toLocaleString("en-GB")}m | ` +
        `£${totalSpend.toLocaleString("en-GB", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
    );

    console.log("");
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
