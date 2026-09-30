import { prisma } from "./lib/prisma";

async function main() {
  const rows = await prisma.purchaseOrder.findMany({
    where: {
      supplierAccountCode: "GRUND",
    },
    orderBy: {
      orderDate: "desc",
    },
    select: {
      purchaseOrderNumber: true,
      orderDate: true,
      netValue: true,
      lines: {
        select: {
          productCode: true,
          description: true,
          quantity: true,
          netValue: true,
        },
      },
    },
  });

  for (const po of rows.slice(0, 30)) {
    console.log("");
    console.log(
      "PO:",
      po.purchaseOrderNumber,
      "Date:",
      po.orderDate,
      "Net:",
      po.netValue
    );

    for (const line of po.lines) {
      console.log(
        "  ",
        line.productCode,
        "|",
        line.description,
        "| Qty:",
        line.quantity,
        "| Net:",
        line.netValue
      );
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
