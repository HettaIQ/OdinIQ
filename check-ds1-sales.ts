import { prisma } from "./lib/prisma";

function isCredit(type: string | null) {
  const value = String(type ?? "")
    .trim()
    .toUpperCase();

  return (
    value === "CRD" ||
    value === "CREDIT" ||
    value.includes("CREDIT NOTE")
  );
}

async function main() {
  const lines =
    await prisma.salesInvoiceLine.findMany({
      where: {
        stockCode: "DS1",

        salesInvoice: {
          companyId: 1,

          invoiceDate: {
            gte: new Date(
              Date.UTC(2025, 0, 1)
            ),

            lt: new Date(
              Date.UTC(2026, 8, 4)
            ),
          },
        },
      },

      select: {
        quantity: true,
        netValue: true,

        salesInvoice: {
          select: {
            invoiceNumber: true,
            invoiceDate: true,
            invoiceType: true,
            customerAccountCode: true,
            customerName: true,
          },
        },
      },

      orderBy: {
        salesInvoice: {
          invoiceDate: "asc",
        },
      },
    });

  let qty2026 = 0;
  let sales2026 = 0;

  let qty2025 = 0;
  let sales2025 = 0;

  for (const line of lines) {
    const date =
      line.salesInvoice.invoiceDate;

    if (!date) {
      continue;
    }

    const credit =
      isCredit(
        line.salesInvoice.invoiceType
      );

    const rawQty =
      Number(line.quantity ?? 0);

    const rawSales =
      Number(line.netValue ?? 0);

    const qty = credit
      ? -Math.abs(rawQty)
      : rawQty;

    const sales = credit
      ? -Math.abs(rawSales)
      : rawSales;

    const year =
      date.getUTCFullYear();

    /*
     * Current YTD:
     * 1 Jan 2026 to 3 Sep 2026
     */
    if (
      year === 2026 &&
      date <
        new Date(
          Date.UTC(2026, 8, 4)
        )
    ) {
      qty2026 += qty;
      sales2026 += sales;
    }

    /*
     * Previous comparable YTD:
     * 1 Jan 2025 to 3 Sep 2025
     */
    if (
      year === 2025 &&
      date <
        new Date(
          Date.UTC(2025, 8, 4)
        )
    ) {
      qty2025 += qty;
      sales2025 += sales;
    }
  }

  console.log(
    "DS1 2026 YTD Qty:",
    qty2026
  );

  console.log(
    "DS1 2026 YTD Sales:",
    sales2026.toFixed(2)
  );

  console.log(
    "DS1 2025 YTD Qty:",
    qty2025
  );

  console.log(
    "DS1 2025 YTD Sales:",
    sales2025.toFixed(2)
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  })