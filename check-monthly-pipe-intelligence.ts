import { prisma } from "./lib/prisma";
import {
  calculatePipeMetres,
  getPipeProduct,
  PIPE_PRODUCTS,
} from "./lib/purchase-intelligence/pipe";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

async function main() {
  const codes = Object.keys(PIPE_PRODUCTS);

  const lines = await prisma.purchaseOrderLine.findMany({
    where: {
      productCode: {
        in: codes,
      },
      purchaseOrder: {
        supplierAccountCode: "TWEETOP",
        orderDate: {
          gte: new Date(Date.UTC(2025, 0, 1)),
          lte: new Date(
            Date.UTC(2026, 8, 24, 23, 59, 59)
          ),
        },
      },
    },
    include: {
      purchaseOrder: true,
    },
  });

  console.log("");
  console.log("ODINIQ MONTHLY PIPE INTELLIGENCE");
  console.log("================================");

  for (const year of [2025, 2026]) {
    console.log("");
    console.log(year);
    console.log("----------------------------");

    let totalCoils = 0;
    let totalMetres = 0;
    let totalSpend = 0;

    for (let month = 0; month <= 8; month++) {
      let coils = 0;
      let metres = 0;
      let spend = 0;

      for (const line of lines) {
        const date = line.purchaseOrder.orderDate;

        if (!date) continue;

        if (
          date.getUTCFullYear() !== year ||
          date.getUTCMonth() !== month
        ) {
          continue;
        }

        if (
          month === 8 &&
          date.getUTCDate() > 24
        ) {
          continue;
        }

        const pipe = getPipeProduct(
          line.productCode
        );

        if (!pipe) continue;

        const quantity =
          line.quantityDelivered ??
          line.quantity ??
          0;

        const lineMetres =
          calculatePipeMetres(
            line.productCode,
            quantity
          ) ?? 0;

        coils += quantity;
        metres += lineMetres;
        spend += line.netValue ?? 0;
      }

      totalCoils += coils;
      totalMetres += metres;
      totalSpend += spend;

      console.log(
        `${MONTHS[month].padEnd(10)} | ` +
        `${String(coils).padStart(5)} coils | ` +
        `${String(metres).padStart(8)}m | ` +
        `£${spend.toFixed(2)}`
      );
    }

    console.log("----------------------------");

    console.log(
      `TOTAL      | ` +
      `${totalCoils} coils | ` +
      `${totalMetres}m | ` +
      `£${totalSpend.toFixed(2)}`
    );
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });