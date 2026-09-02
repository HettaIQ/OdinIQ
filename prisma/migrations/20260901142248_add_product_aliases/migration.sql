-- CreateTable
CREATE TABLE "ProductAlias" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "aliasCode" TEXT NOT NULL,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductAlias_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductAlias_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProductAlias_companyId_productId_idx" ON "ProductAlias"("companyId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAlias_companyId_aliasCode_key" ON "ProductAlias"("companyId", "aliasCode");
