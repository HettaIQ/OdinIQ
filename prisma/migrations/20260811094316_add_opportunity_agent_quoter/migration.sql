-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CommercialOpportunity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "ownerMembershipId" INTEGER,
    "agentMembershipId" INTEGER,
    "quoterMembershipId" INTEGER,
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
    CONSTRAINT "CommercialOpportunity_ownerMembershipId_fkey" FOREIGN KEY ("ownerMembershipId") REFERENCES "CompanyMembership" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CommercialOpportunity_agentMembershipId_fkey" FOREIGN KEY ("agentMembershipId") REFERENCES "CompanyMembership" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CommercialOpportunity_quoterMembershipId_fkey" FOREIGN KEY ("quoterMembershipId") REFERENCES "CompanyMembership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CommercialOpportunity" ("companyId", "createdAt", "customerId", "description", "expectedCloseDate", "id", "ownerMembershipId", "probability", "source", "stage", "status", "title", "updatedAt", "value") SELECT "companyId", "createdAt", "customerId", "description", "expectedCloseDate", "id", "ownerMembershipId", "probability", "source", "stage", "status", "title", "updatedAt", "value" FROM "CommercialOpportunity";
DROP TABLE "CommercialOpportunity";
ALTER TABLE "new_CommercialOpportunity" RENAME TO "CommercialOpportunity";
CREATE INDEX "CommercialOpportunity_companyId_idx" ON "CommercialOpportunity"("companyId");
CREATE INDEX "CommercialOpportunity_customerId_idx" ON "CommercialOpportunity"("customerId");
CREATE INDEX "CommercialOpportunity_status_idx" ON "CommercialOpportunity"("status");
CREATE INDEX "CommercialOpportunity_stage_idx" ON "CommercialOpportunity"("stage");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
