-- CreateTable
CREATE TABLE "WarehouseLocation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "aisle" TEXT,
    "bay" TEXT,
    "shelf" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WarehouseLocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductStockLocation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductStockLocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductStockLocation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductStockLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WarehouseLocation_companyId_idx" ON "WarehouseLocation"("companyId");

-- CreateIndex
CREATE INDEX "WarehouseLocation_companyId_active_idx" ON "WarehouseLocation"("companyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseLocation_companyId_code_key" ON "WarehouseLocation"("companyId", "code");

-- CreateIndex
CREATE INDEX "ProductStockLocation_companyId_idx" ON "ProductStockLocation"("companyId");

-- CreateIndex
CREATE INDEX "ProductStockLocation_productId_idx" ON "ProductStockLocation"("productId");

-- CreateIndex
CREATE INDEX "ProductStockLocation_locationId_idx" ON "ProductStockLocation"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStockLocation_companyId_productId_locationId_key" ON "ProductStockLocation"("companyId", "productId", "locationId");
