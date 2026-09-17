-- CreateTable
CREATE TABLE "SalesOrderWarehousePhoto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "salesOrderId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "warehouseStage" TEXT NOT NULL,
    "note" TEXT,
    "uploadedBy" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesOrderWarehousePhoto_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SalesOrderWarehousePhoto_salesOrderId_idx" ON "SalesOrderWarehousePhoto"("salesOrderId");

-- CreateIndex
CREATE INDEX "SalesOrderWarehousePhoto_uploadedAt_idx" ON "SalesOrderWarehousePhoto"("uploadedAt");
