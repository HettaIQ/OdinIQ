import { prisma } from "./lib/prisma";

async function main() {
  const bills = await prisma.supplierBill.findMany({
    where: {
      supplierAccountCode: "GRUND",
    },
    include: {
      lines: true,
    },
    orderBy: {
      invoiceDate: "asc",
    },
  });

  console.log("BILLS:", bills.length);

  let quantity = 0;
  let net = 0;
  let vat = 0;
  let gross = 0;

  for (const bill of bills) {
    const qty = bill.lines.reduce(
      (sum, line) => sum + (line.quantity ?? 0),
      0,
    );

    quantity += qty;
    net += bill.netValue ?? 0;
    vat += bill.vatValue ?? 0;
    gross += bill.grossValue ?? 0;

    console.log(
      bill.invoiceNumber,
      bill.invoiceDate?.toISOString().slice(0, 10),
      "Qty:",
      qty,
      "Net:",
      bill.netValue,
    );
  }

  console.log("----------------");
  console.log("TOTAL QTY:", quantity);
  console.log("TOTAL NET:", net.toFixed(2));
  console.log("TOTAL VAT:", vat.toFixed(2));
  console.log("TOTAL GROSS:", gross.toFixed(2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());