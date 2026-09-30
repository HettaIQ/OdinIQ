import { prisma } from "./lib/prisma";

async function main() {
  for (const companyId of [1, 9]) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    const [
      customers,
      products,
      invoices,
      orders,
      quotes,
      opportunities,
      tasks,
    ] = await Promise.all([
      prisma.customer.count({ where: { companyId } }),
      prisma.product.count({ where: { companyId } }),
      prisma.salesInvoice.count({ where: { companyId } }),
      prisma.salesOrder.count({ where: { companyId } }),
      prisma.quote.count({ where: { companyId } }),
      prisma.commercialOpportunity.count({ where: { companyId } }),
      prisma.commercialTask.count({ where: { companyId } }),
    ]);

    console.log("");
    console.log(`COMPANY ${companyId}: ${company?.name}`);
    console.log("--------------------------------");
    console.log(`Customers:     ${customers}`);
    console.log(`Products:      ${products}`);
    console.log(`Invoices:      ${invoices}`);
    console.log(`Sales Orders:  ${orders}`);
    console.log(`Quotes:        ${quotes}`);
    console.log(`Opportunities: ${opportunities}`);
    console.log(`Tasks:         ${tasks}`);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
