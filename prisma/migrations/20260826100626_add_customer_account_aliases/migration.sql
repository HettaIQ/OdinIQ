-- CreateTable
CREATE TABLE "CustomerAccountAlias" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "accountCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerAccountAlias_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerAccountAlias_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CustomerAccountAlias_customerId_idx" ON "CustomerAccountAlias"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAccountAlias_companyId_accountCode_key" ON "CustomerAccountAlias"("companyId", "accountCode");
