import { prisma } from "./lib/prisma";

async function main() {
  const invoices =
    await prisma.salesInvoice.findMany({
      where: {
        invoiceDate: {
          not: null,
        },
      },
      select: {
        invoiceDate: true,
        _count: {
          select: {
            lines: true,
          },
        },
      },
    });

  const history = new Map<
    number,
    {
      invoices: number;
      invoicesWithLines: number;
      detailedLines: number;
    }
  >();

  for (const invoice of invoices) {
    if (!invoice.invoiceDate) continue;

    const year =
      invoice.invoiceDate.getUTCFullYear();

    if (!history.has(year)) {
      history.set(year, {
        invoices: 0,
        invoicesWithLines: 0,
        detailedLines: 0,
      });
    }

    const yearData = history.get(year)!;

    yearData.invoices++;

    if (invoice._count.lines > 0) {
      yearData.invoicesWithLines++;
    }

    yearData.detailedLines +=
      invoice._count.lines;
  }

  console.log(
    "\nODINIQ SALES HISTORY\n"
  );

  console.log(
    "Year | Invoices | With Lines | Detailed Lines"
  );

  console.log(
    "---------------------------------------------"
  );

  for (
    const [year, data] of
    [...history.entries()].sort(
      (a, b) => a[0] - b[0]
    )
  ) {
    const status =
      data.invoices ===
      data.invoicesWithLines
        ? "✓"
        : "⚠";

    console.log(
      `${status} ${year} | ${data.invoices} | ${data.invoicesWithLines} | ${data.detailedLines}`
    );
  }

  const missingLines =
    [...history.entries()].filter(
      ([, data]) =>
        data.invoices !==
        data.invoicesWithLines
    );

  console.log("");

  if (missingLines.length === 0) {
    console.log(
      "✓ ALL INVOICES HAVE DETAILED LINES"
    );
  } else {
    console.log(
      "⚠ SOME INVOICES ARE MISSING DETAILED LINES"
    );
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });