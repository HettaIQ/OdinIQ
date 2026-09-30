-- CreateTable
CREATE TABLE "SupplierBill" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "supplierAccountCode" TEXT,
    "supplierName" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" DATETIME,
    "customerReference" TEXT,
    "supplierOrderNumber" TEXT,
    "deliveryNoteNumber" TEXT,
    "deliveryDate" DATETIME,
    "netValue" REAL,
    "vatValue" REAL,
    "grossValue" REAL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "source" TEXT NOT NULL DEFAULT 'SUPPLIER_PDF',
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierBill_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierBillLine" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "supplierBillId" INTEGER NOT NULL,
    "lineNumber" INTEGER,
    "productCode" TEXT,
    "description" TEXT,
    "quantity" REAL,
    "unitPrice" REAL,
    "discount" REAL,
    "netValue" REAL,
    "vatValue" REAL,
    "grossValue" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierBillLine_supplierBillId_fkey" FOREIGN KEY ("supplierBillId") REFERENCES "SupplierBill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SupplierBill_companyId_supplierAccountCode_idx" ON "SupplierBill"("companyId", "supplierAccountCode");

-- CreateIndex
CREATE INDEX "SupplierBill_companyId_supplierName_idx" ON "SupplierBill"("companyId", "supplierName");

-- CreateIndex
CREATE INDEX "SupplierBill_companyId_invoiceDate_idx" ON "SupplierBill"("companyId", "invoiceDate");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierBill_companyId_supplierAccountCode_invoiceNumber_key" ON "SupplierBill"("companyId", "supplierAccountCode", "invoiceNumber");

-- CreateIndex
CREATE INDEX "SupplierBillLine_supplierBillId_idx" ON "SupplierBillLine"("supplierBillId");

-- CreateIndex
CREATE INDEX "SupplierBillLine_productCode_idx" ON "SupplierBillLine"("productCode");
