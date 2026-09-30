-- CreateTable
CREATE TABLE "StocktakeSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StocktakeSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StocktakeLine" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "stocktakeSessionId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "expectedSystemQuantity" REAL,
    "expectedLocationQuantity" REAL NOT NULL,
    "physicalCount" REAL,
    "notes" TEXT,
    "countedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StocktakeLine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StocktakeLine_stocktakeSessionId_fkey" FOREIGN KEY ("stocktakeSessionId") REFERENCES "StocktakeSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StocktakeLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StocktakeLine_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StocktakeSession_companyId_idx" ON "StocktakeSession"("companyId");

-- CreateIndex
CREATE INDEX "StocktakeSession_companyId_status_idx" ON "StocktakeSession"("companyId", "status");

-- CreateIndex
CREATE INDEX "StocktakeSession_companyId_startedAt_idx" ON "StocktakeSession"("companyId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StocktakeSession_companyId_reference_key" ON "StocktakeSession"("companyId", "reference");

-- CreateIndex
CREATE INDEX "StocktakeLine_companyId_idx" ON "StocktakeLine"("companyId");

-- CreateIndex
CREATE INDEX "StocktakeLine_stocktakeSessionId_idx" ON "StocktakeLine"("stocktakeSessionId");

-- CreateIndex
CREATE INDEX "StocktakeLine_productId_idx" ON "StocktakeLine"("productId");

-- CreateIndex
CREATE INDEX "StocktakeLine_locationId_idx" ON "StocktakeLine"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "StocktakeLine_stocktakeSessionId_productId_locationId_key" ON "StocktakeLine"("stocktakeSessionId", "productId", "locationId");
