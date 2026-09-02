-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "salesOrderNumber" TEXT NOT NULL,
    "orderDate" DATETIME,
    "customerAccountCode" TEXT,
    "customerName" TEXT,
    "orderValue" REAL,
    "status" TEXT,
    "despatched" BOOLEAN NOT NULL DEFAULT false,
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SalesOrder_companyId_customerAccountCode_idx" ON "SalesOrder"("companyId", "customerAccountCode");

-- CreateIndex
CREATE INDEX "SalesOrder_companyId_orderDate_idx" ON "SalesOrder"("companyId", "orderDate");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_companyId_salesOrderNumber_key" ON "SalesOrder"("companyId", "salesOrderNumber");
