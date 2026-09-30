import { prisma } from "./lib/prisma";
import {
  calculateNetSalesYTD,
  isCreditNote,
  isSalesInvoice,
} from "./lib/commercial/salesCalculations";

async function main() {
  const invoices = await prisma.salesInvoice.findMany({
    where: {
      companyId: 1,
      customerAccountCode: "HUWSGRAY",
    },
    orderBy: {
      invoiceDate: "desc",
    },
  });

  const today = new Date(2026, 8, 15);

  const sales2026 = calculateNetSalesYTD(
    invoices,
    2026,
    today
  );

  console.log("Total records:", invoices.length);
  console.log(
    "Invoices:",
    invoices.filter(isSalesInvoice).length
  );
  console.log(
    "Credits:",
    invoices.filter(isCreditNote).length
  );
  console.log("2026 YTD:", sales2026);

  console.log("\nLatest 10 records:");

  for (const invoice of invoices.slice(0, 10)) {
    console.log({
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.invoiceDate,
      type: invoice.invoiceType,
      net: invoice.netValue,
    });
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });