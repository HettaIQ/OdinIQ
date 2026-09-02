-- CreateTable
CREATE TABLE "Customer" (
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
    "assignedMembershipId" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Customer_assignedMembershipId_fkey" FOREIGN KEY ("assignedMembershipId") REFERENCES "CompanyMembership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Customer_companyId_idx" ON "Customer"("companyId");

-- CreateIndex
CREATE INDEX "Customer_assignedMembershipId_idx" ON "Customer"("assignedMembershipId");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_companyId_accountCode_key" ON "Customer"("companyId", "accountCode");
