import { prisma } from "./lib/prisma";

async function main() {
  const rows = await prisma.purchaseOrder.findMany({
    where: {
      supplierAccountCode: "GRUND",
    },
    select: {
      orderDate: true,
      netValue: true,
      lines: {
        select: {
          quantity: true,
          netValue: true,
        },
      },
    },
  });

  const years = new Map<number, { orders: number; quantity: number; spend: number }>();

  for (const po of rows) {
    if (!po.orderDate) continue;

    const year = po.orderDate.getUTCFullYear();
    const current = years.get(year) ?? {
      orders: 0,
      quantity: 0,
      spend: 0,
    };

    current.orders += 1;
    current.quantity += po.lines.reduce(
      (total, line) => total + (line.quantity ?? 0),
      0
    );
    current.spend += po.lines.reduce(
      (total, line) => total + (line.netValue ?? 0),
      0
    );

    years.set(year, current);
  }

  for (const [year, totals] of [...years.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(
      year,
      "| POs:",
      totals.orders,
      "| Qty:",
      totals.quantity,
      "| Spend:",
      totals.spend.toFixed(2)
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
