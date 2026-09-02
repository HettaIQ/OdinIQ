-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "accountCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "buyingGroup" TEXT,
    "customerType" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "addressLine" TEXT,
    "town" TEXT,
    "postcode" TEXT,
    "paymentTerms" TEXT,
    "creditLimit" REAL,
    "currentBalance" REAL DEFAULT 0,
    "discount" REAL,
    "accountOnHold" BOOLEAN NOT NULL DEFAULT false,
    "accountOpenedDate" DATETIME,
    "firstInvoiceDate" DATETIME,
    "lastInvoiceDate" DATETIME,
    "emailOrPrint" TEXT,
    "assignedMembershipId" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Customer_assignedMembershipId_fkey" FOREIGN KEY ("assignedMembershipId") REFERENCES "CompanyMembership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("accountCode", "addressLine", "assignedMembershipId", "buyingGroup", "companyId", "createdAt", "creditLimit", "currentBalance", "customerType", "email", "id", "name", "notes", "paymentTerms", "phone", "postcode", "status", "town", "updatedAt", "website") SELECT "accountCode", "addressLine", "assignedMembershipId", "buyingGroup", "companyId", "createdAt", "creditLimit", "currentBalance", "customerType", "email", "id", "name", "notes", "paymentTerms", "phone", "postcode", "status", "town", "updatedAt", "website" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE INDEX "Customer_companyId_idx" ON "Customer"("companyId");
CREATE INDEX "Customer_assignedMembershipId_idx" ON "Customer"("assignedMembershipId");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE UNIQUE INDEX "Customer_companyId_accountCode_key" ON "Customer"("companyId", "accountCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
