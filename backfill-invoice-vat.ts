import { prisma } from "./lib/prisma";

async function main() {
  const invoices = await prisma.salesInvoice.findMany({
    where: {
      OR: [
        { vatValue: null },
        { vatValue: 0 },
      ],
      netValue: {
        not: null,
      },
      grossValue: {
        not: null,
      },
    },
    select: {
      id: true,
      invoiceNumber: true,
      netValue: true,
      vatValue: true,
      grossValue: true,
    },
  });

  let updated = 0;

  for (const invoice of invoices) {
    const net = Number(invoice.netValue ?? 0);
    const gross = Number(invoice.grossValue ?? 0);

    const calculatedVat = Number(
      (gross - net).toFixed(2)
    );

    if (calculatedVat === 0) {
      continue;
    }

    await prisma.salesInvoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        vatValue: calculatedVat,
      },
    });

    console.log(
      `Updated ${invoice.invoiceNumber}: VAT ${calculatedVat}`
    );

    updated++;
  }

  console.log(
    `Finished. Updated ${updated} invoices/credits.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});