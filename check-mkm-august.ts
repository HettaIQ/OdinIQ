import { prisma } from "./lib/prisma";

async function main() {
  const rows = await prisma.salesInvoice.findMany({
    where: {
      companyId: 1,
      customerAccountCode: {
        startsWith: "MKM",
      },
      invoiceDate: {
        gte: new Date("2026-08-01T00:00:00.000Z"),
        lt: new Date("2026-09-01T00:00:00.000Z"),
      },
    },
    orderBy: [
      { invoiceDate: "asc" },
      { invoiceNumber: "asc" },
    ],
    select: {
      invoiceNumber: true,
      invoiceDate: true,
      invoiceType: true,
      customerAccountCode: true,
      customerName: true,
      netValue: true,
      creditedInvoiceNumber: true,
    },
  });

  console.table(
    rows.map((r) => ({
      invoice: r.invoiceNumber,
      date: r.invoiceDate?.toISOString().slice(0, 10),
      type: r.invoiceType,
      account: r.customerAccountCode,
      net: r.netValue,
      creditedInvoice: r.creditedInvoiceNumber,
    }))
  );

  const invoices = rows.filter((r) => (r.netValue ?? 0) >= 0);
  const credits = rows.filter((r) => (r.netValue ?? 0) < 0);

  const invoiceTotal = invoices.reduce(
    (sum, r) => sum + (r.netValue ?? 0),
    0
  );

  const creditTotal = credits.reduce(
    (sum, r) => sum + (r.netValue ?? 0),
    0
  );

  const netTotal = rows.reduce(
    (sum, r) => sum + (r.netValue ?? 0),
    0
  );

  console.log("\n--- MKM AUGUST 2026 ---");
  console.log("Rows:", rows.length);
  console.log("Invoices:", invoices.length);
  console.log("Credits:", credits.length);
  console.log("Invoice total:", invoiceTotal.toFixed(2));
  console.log("Credit total:", creditTotal.toFixed(2));
  console.log("Net total:", netTotal.toFixed(2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
