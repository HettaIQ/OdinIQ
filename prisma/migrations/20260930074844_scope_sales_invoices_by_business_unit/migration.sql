/*
  Warnings:

  - A unique constraint covering the columns `[companyId,businessUnitId,invoiceNumber]` on the table `SalesInvoice` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "SalesInvoice_companyId_invoiceNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoice_companyId_businessUnitId_invoiceNumber_key" ON "SalesInvoice"("companyId", "businessUnitId", "invoiceNumber");
