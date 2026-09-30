import { prisma } from "./lib/prisma";

async function main() {
  const totalLines =
    await prisma.salesInvoiceLine.count();

  const invoiceLines =
    await prisma.salesInvoiceLine.count({
      where: {
        salesInvoice: {
          invoiceType: {
            contains: "Invoice",
          },
        },
      },
    });

  const creditLines =
    await prisma.salesInvoiceLine.count({
      where: {
        salesInvoice: {
          invoiceType: {
            contains: "Credit",
          },
        },
      },
    });

  const sample =
    await prisma.salesInvoiceLine.findFirst({
      where: {
        stockCode: {
          not: null,
        },
        salesInvoice: {
          invoiceType: {
            contains: "Invoice",
          },
        },
      },
      include: {
        salesInvoice: true,
      },
    });

  console.log("Total invoice lines:", totalLines);
  console.log("Normal invoice lines:", invoiceLines);
  console.log("Credit lines:", creditLines);

  console.log("\nSample normal invoice line:");
  console.log(sample);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });