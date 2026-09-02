-- CreateTable
CREATE TABLE "CustomerCommercialCost" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "costDate" DATETIME NOT NULL,
    "costType" TEXT NOT NULL,
    "description" TEXT,
    "amount" REAL NOT NULL,
    "source" TEXT,
    "sourceReference" TEXT,
    "notes" TEXT,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerCommercialCost_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CustomerCommercialCost_customerId_idx" ON "CustomerCommercialCost"("customerId");

-- CreateIndex
CREATE INDEX "CustomerCommercialCost_customerId_costDate_idx" ON "CustomerCommercialCost"("customerId", "costDate");

-- CreateIndex
CREATE INDEX "CustomerCommercialCost_costType_idx" ON "CustomerCommercialCost"("costType");
