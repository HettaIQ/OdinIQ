-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SalesOrder" (
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
    "investigationStatus" TEXT,
    "investigationNote" TEXT,
    "investigatedBy" TEXT,
    "investigatedAt" DATETIME,
    "warehouseStatus" TEXT NOT NULL DEFAULT 'ORDER_RECEIVED',
    "warehouseStatusBy" TEXT,
    "warehouseStatusAt" DATETIME,
    "warehouseNote" TEXT,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SalesOrder" ("companyId", "createdAt", "customerAccountCode", "customerName", "despatched", "id", "importedAt", "investigatedAt", "investigatedBy", "investigationNote", "investigationStatus", "invoiced", "orderDate", "orderValue", "salesOrderNumber", "status", "updatedAt") SELECT "companyId", "createdAt", "customerAccountCode", "customerName", "despatched", "id", "importedAt", "investigatedAt", "investigatedBy", "investigationNote", "investigationStatus", "invoiced", "orderDate", "orderValue", "salesOrderNumber", "status", "updatedAt" FROM "SalesOrder";
DROP TABLE "SalesOrder";
ALTER TABLE "new_SalesOrder" RENAME TO "SalesOrder";
CREATE INDEX "SalesOrder_companyId_customerAccountCode_idx" ON "SalesOrder"("companyId", "customerAccountCode");
CREATE INDEX "SalesOrder_companyId_orderDate_idx" ON "SalesOrder"("companyId", "orderDate");
CREATE UNIQUE INDEX "SalesOrder_companyId_salesOrderNumber_key" ON "SalesOrder"("companyId", "salesOrderNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
