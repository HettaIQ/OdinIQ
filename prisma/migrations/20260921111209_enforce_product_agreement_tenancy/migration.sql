/*
  Warnings:

  - Made the column `companyId` on table `CommercialAgreement` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CommercialAgreement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerName" TEXT NOT NULL,
    "agreementName" TEXT NOT NULL,
    "agreementType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "renewalDate" DATETIME,
    "noticePeriod" TEXT,
    "accountManager" TEXT,
    "buyingGroup" TEXT,
    "standardDiscount" REAL,
    "rebatePercent" REAL,
    "paymentTerms" TEXT,
    "creditLimit" REAL,
    "marketingBudget" REAL,
    "marketingSpend" REAL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommercialAgreement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CommercialAgreement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CommercialAgreement" ("accountManager", "agreementName", "agreementType", "buyingGroup", "companyId", "createdAt", "creditLimit", "customerId", "customerName", "endDate", "id", "marketingBudget", "marketingSpend", "notes", "noticePeriod", "paymentTerms", "rebatePercent", "renewalDate", "standardDiscount", "startDate", "status", "updatedAt") SELECT "accountManager", "agreementName", "agreementType", "buyingGroup", "companyId", "createdAt", "creditLimit", "customerId", "customerName", "endDate", "id", "marketingBudget", "marketingSpend", "notes", "noticePeriod", "paymentTerms", "rebatePercent", "renewalDate", "standardDiscount", "startDate", "status", "updatedAt" FROM "CommercialAgreement";
DROP TABLE "CommercialAgreement";
ALTER TABLE "new_CommercialAgreement" RENAME TO "CommercialAgreement";
CREATE INDEX "CommercialAgreement_companyId_idx" ON "CommercialAgreement"("companyId");
CREATE INDEX "CommercialAgreement_customerId_idx" ON "CommercialAgreement"("customerId");
CREATE INDEX "CommercialAgreement_companyId_buyingGroup_idx" ON "CommercialAgreement"("companyId", "buyingGroup");
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "supplier" TEXT,
    "category" TEXT,
    "brand" TEXT,
    "costPrice" REAL,
    "listPrice" REAL,
    "sellPrice" REAL,
    "margin" REAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("active", "brand", "category", "companyId", "costPrice", "createdAt", "description", "id", "listPrice", "margin", "productCode", "sellPrice", "supplier", "updatedAt") SELECT "active", "brand", "category", "companyId", "costPrice", "createdAt", "description", "id", "listPrice", "margin", "productCode", "sellPrice", "supplier", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_companyId_idx" ON "Product"("companyId");
CREATE UNIQUE INDEX "Product_companyId_productCode_key" ON "Product"("companyId", "productCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
