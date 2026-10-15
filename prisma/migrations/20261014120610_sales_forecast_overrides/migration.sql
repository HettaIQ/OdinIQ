-- CreateTable
CREATE TABLE "SalesForecastOverride" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "businessUnitId" INTEGER NOT NULL,
    "forecastYear" INTEGER NOT NULL,
    "projectedAnnualSales" REAL NOT NULL,
    "reason" TEXT,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE INDEX "SalesForecastOverride_companyId_customerId_businessUnitId_forecastYear_idx" ON "SalesForecastOverride"("companyId", "customerId", "businessUnitId", "forecastYear");
