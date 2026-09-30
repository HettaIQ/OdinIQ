import { prisma } from "./lib/prisma";

async function main() {
  const lines = await prisma.purchaseOrderLine.findMany({
    where: {
      productCode: {
        in: [
          "HSPAP100",
          "HSPAP150",
          "HSPAP200",
          "HSPAP500",
        ],
      },
      purchaseOrder: {
        supplierAccountCode: "TWEETOP",
        orderDate: {
          gte: new Date(Date.UTC(2026, 0, 1)),
          lte: new Date(Date.UTC(2026, 8, 24, 23, 59, 59)),
        },
      },
    },
    include: {
      purchaseOrder: true,
    },
    orderBy: {
      purchaseOrder: {
        orderDate: "asc",
      },
    },
  });

  console.log("");
  console.log("2026 TWEETOP PIPE PURCHASE ORDERS");
  console.log("=================================");
  console.log("");

  for (const line of lines) {
    console.log(
      line.purchaseOrder.orderDate?.toISOString().slice(0, 10),
      "| PO",
      line.purchaseOrder.purchaseOrderNumber,
      "|",
      line.productCode,
      "| Qty",
      line.quantityDelivered ?? line.quantity,
      "| £",
      line.netValue
    );
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
