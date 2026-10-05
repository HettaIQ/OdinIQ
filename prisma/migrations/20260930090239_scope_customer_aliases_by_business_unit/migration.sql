-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CustomerAccountAlias" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "businessUnitId" INTEGER,
    "customerId" INTEGER NOT NULL,
    "accountCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerAccountAlias_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerAccountAlias_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustomerAccountAlias_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CustomerAccountAlias" ("accountCode", "companyId", "businessUnitId", "createdAt", "customerId", "id", "updatedAt") SELECT "accountCode", "companyId", 1, "createdAt", "customerId", "id", "updatedAt" FROM "CustomerAccountAlias";
DROP TABLE "CustomerAccountAlias";
ALTER TABLE "new_CustomerAccountAlias" RENAME TO "CustomerAccountAlias";
CREATE INDEX "CustomerAccountAlias_customerId_idx" ON "CustomerAccountAlias"("customerId");
CREATE INDEX "CustomerAccountAlias_businessUnitId_idx" ON "CustomerAccountAlias"("businessUnitId");
CREATE UNIQUE INDEX "CustomerAccountAlias_companyId_businessUnitId_accountCode_key" ON "CustomerAccountAlias"("companyId", "businessUnitId", "accountCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
