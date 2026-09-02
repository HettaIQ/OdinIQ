-- CreateTable
CREATE TABLE "ProductCostHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "costPrice" REAL NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductCostHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductCostHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProductCostHistory_companyId_productId_idx" ON "ProductCostHistory"("companyId", "productId");

-- CreateIndex
CREATE INDEX "ProductCostHistory_companyId_effectiveFrom_idx" ON "ProductCostHistory"("companyId", "effectiveFrom");
