-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "purchaseOrderNumber" TEXT NOT NULL,
    "orderDate" DATETIME,
    "supplierAccountCode" TEXT,
    "supplierName" TEXT,
    "supplierOrderNumber" TEXT,
    "reference" TEXT,
    "status" TEXT,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "posted" BOOLEAN NOT NULL DEFAULT false,
    "netValue" REAL,
    "source" TEXT NOT NULL DEFAULT 'SAGE',
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "purchaseOrderId" INTEGER NOT NULL,
    "lineNumber" INTEGER,
    "productCode" TEXT,
    "description" TEXT,
    "quantity" REAL,
    "unitCost" REAL,
    "netValue" REAL,
    "quantityDelivered" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PurchaseOrder_companyId_supplierAccountCode_idx" ON "PurchaseOrder"("companyId", "supplierAccountCode");

-- CreateIndex
CREATE INDEX "PurchaseOrder_companyId_supplierName_idx" ON "PurchaseOrder"("companyId", "supplierName");

-- CreateIndex
CREATE INDEX "PurchaseOrder_companyId_orderDate_idx" ON "PurchaseOrder"("companyId", "orderDate");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_companyId_purchaseOrderNumber_key" ON "PurchaseOrder"("companyId", "purchaseOrderNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_productCode_idx" ON "PurchaseOrderLine"("productCode");
