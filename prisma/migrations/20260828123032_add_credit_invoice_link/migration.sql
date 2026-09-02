-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SalesInvoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "salesOrderNumber" TEXT,
    "customerOrderNumber" TEXT,
    "invoiceType" TEXT,
    "invoiceDate" DATETIME,
    "customerAccountCode" TEXT,
    "customerName" TEXT,
    "netValue" REAL,
    "vatValue" REAL,
    "grossValue" REAL,
    "creditedInvoiceNumber" TEXT,
    "creditedInvoiceId" INTEGER,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalesInvoice_creditedInvoiceId_fkey" FOREIGN KEY ("creditedInvoiceId") REFERENCES "SalesInvoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SalesInvoice" ("companyId", "createdAt", "customerAccountCode", "customerName", "customerOrderNumber", "grossValue", "id", "importedAt", "invoiceDate", "invoiceNumber", "invoiceType", "netValue", "salesOrderNumber", "updatedAt", "vatValue") SELECT "companyId", "createdAt", "customerAccountCode", "customerName", "customerOrderNumber", "grossValue", "id", "importedAt", "invoiceDate", "invoiceNumber", "invoiceType", "netValue", "salesOrderNumber", "updatedAt", "vatValue" FROM "SalesInvoice";
DROP TABLE "SalesInvoice";
ALTER TABLE "new_SalesInvoice" RENAME TO "SalesInvoice";
CREATE INDEX "SalesInvoice_companyId_customerAccountCode_idx" ON "SalesInvoice"("companyId", "customerAccountCode");
CREATE INDEX "SalesInvoice_companyId_invoiceDate_idx" ON "SalesInvoice"("companyId", "invoiceDate");
CREATE INDEX "SalesInvoice_creditedInvoiceId_idx" ON "SalesInvoice"("creditedInvoiceId");
CREATE INDEX "SalesInvoice_companyId_creditedInvoiceNumber_idx" ON "SalesInvoice"("companyId", "creditedInvoiceNumber");
CREATE UNIQUE INDEX "SalesInvoice_companyId_invoiceNumber_key" ON "SalesInvoice"("companyId", "invoiceNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
