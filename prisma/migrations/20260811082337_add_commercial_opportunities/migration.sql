-- CreateTable
CREATE TABLE "CommercialOpportunity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "ownerMembershipId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'QUALIFY',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "value" REAL,
    "probability" INTEGER,
    "expectedCloseDate" DATETIME,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommercialOpportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommercialOpportunity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommercialOpportunity_ownerMembershipId_fkey" FOREIGN KEY ("ownerMembershipId") REFERENCES "CompanyMembership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CommercialOpportunity_companyId_idx" ON "CommercialOpportunity"("companyId");

-- CreateIndex
CREATE INDEX "CommercialOpportunity_customerId_idx" ON "CommercialOpportunity"("customerId");

-- CreateIndex
CREATE INDEX "CommercialOpportunity_status_idx" ON "CommercialOpportunity"("status");

-- CreateIndex
CREATE INDEX "CommercialOpportunity_stage_idx" ON "CommercialOpportunity"("stage");
