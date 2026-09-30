import { prisma } from "./lib/prisma";

async function main() {
  const documents =
    await prisma.salesInvoice.findMany({
      where: {
        invoiceNumber: {
          in: [
            "9628",
            "9629",
            "9630",
            "9631",
            "9632",
            "9633",
            "9634",
            "9635",
            "9636",
          ],
        },
      },

      select: {
        invoiceNumber: true,
        invoiceDate: true,
        invoiceType: true,
        customerName: true,
      },

      orderBy: {
        invoiceNumber: "asc",
      },
    });

  console.log(
    "\nDOCUMENTS AROUND 9632\n"
  );

  for (const document of documents) {
    console.log({
      invoiceNumber:
        document.invoiceNumber,
      invoiceDate:
        document.invoiceDate,
      invoiceType:
        document.invoiceType,
      customer:
        document.customerName,
    });
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });