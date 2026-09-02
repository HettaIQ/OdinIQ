-- CreateTable
CREATE TABLE "Quote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "opportunityId" INTEGER,
    "agentMembershipId" INTEGER,
    "quoterMembershipId" INTEGER,
    "quoteNumber" TEXT NOT NULL,
    "quoteDate" DATETIME,
    "expiryDate" DATETIME,
    "merchantName" TEXT,
    "branchName" TEXT,
    "buyingGroup" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "netValue" REAL,
    "vatValue" REAL,
    "grossValue" REAL,
    "source" TEXT DEFAULT 'SAGE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Quote_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "CommercialOpportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quote_agentMembershipId_fkey" FOREIGN KEY ("agentMembershipId") REFERENCES "CompanyMembership" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quote_quoterMembershipId_fkey" FOREIGN KEY ("quoterMembershipId") REFERENCES "CompanyMembership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuoteLine" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quoteId" INTEGER NOT NULL,
    "productCode" TEXT,
    "description" TEXT NOT NULL,
    "quantity" REAL,
    "unitPrice" REAL,
    "lineValue" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Quote_companyId_idx" ON "Quote"("companyId");

-- CreateIndex
CREATE INDEX "Quote_customerId_idx" ON "Quote"("customerId");

-- CreateIndex
CREATE INDEX "Quote_opportunityId_idx" ON "Quote"("opportunityId");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_companyId_quoteNumber_key" ON "Quote"("companyId", "quoteNumber");

-- CreateIndex
CREATE INDEX "QuoteLine_quoteId_idx" ON "QuoteLine"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteLine_productCode_idx" ON "QuoteLine"("productCode");
