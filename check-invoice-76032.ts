import { prisma } from "./lib/prisma";

async function main() {
  const invoice = await prisma.salesInvoice.findFirst({
    where: {
      invoiceNumber: "76032",
    },
    include: {
      lines: true,
    },
  });

  console.dir(invoice, {
    depth: null,
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
  