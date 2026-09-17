-- CreateTable
CREATE TABLE "Territory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Territory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerBranch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "branchName" TEXT NOT NULL,
    "branchCode" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "addressLine3" TEXT,
    "town" TEXT,
    "county" TEXT,
    "postcode" TEXT,
    "buyingGroup" TEXT,
    "source" TEXT,
    "externalReference" TEXT,
    "territoryId" INTEGER,
    "agentOverrideMembershipId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerBranch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerBranch_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerBranch_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustomerBranch_agentOverrideMembershipId_fkey" FOREIGN KEY ("agentOverrideMembershipId") REFERENCES "CompanyMembership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TerritoryAgentHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "territoryId" INTEGER NOT NULL,
    "membershipId" INTEGER,
    "agentName" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TerritoryAgentHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TerritoryAgentHistory_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TerritoryAgentHistory_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "CompanyMembership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Territory_companyId_idx" ON "Territory"("companyId");

-- CreateIndex
CREATE INDEX "Territory_companyId_active_idx" ON "Territory"("companyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Territory_companyId_name_key" ON "Territory"("companyId", "name");

-- CreateIndex
CREATE INDEX "CustomerBranch_companyId_idx" ON "CustomerBranch"("companyId");

-- CreateIndex
CREATE INDEX "CustomerBranch_customerId_idx" ON "CustomerBranch"("customerId");

-- CreateIndex
CREATE INDEX "CustomerBranch_territoryId_idx" ON "CustomerBranch"("territoryId");

-- CreateIndex
CREATE INDEX "CustomerBranch_agentOverrideMembershipId_idx" ON "CustomerBranch"("agentOverrideMembershipId");

-- CreateIndex
CREATE INDEX "CustomerBranch_postcode_idx" ON "CustomerBranch"("postcode");

-- CreateIndex
CREATE INDEX "CustomerBranch_buyingGroup_idx" ON "CustomerBranch"("buyingGroup");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerBranch_companyId_customerId_branchName_key" ON "CustomerBranch"("companyId", "customerId", "branchName");

-- CreateIndex
CREATE INDEX "TerritoryAgentHistory_companyId_idx" ON "TerritoryAgentHistory"("companyId");

-- CreateIndex
CREATE INDEX "TerritoryAgentHistory_territoryId_idx" ON "TerritoryAgentHistory"("territoryId");

-- CreateIndex
CREATE INDEX "TerritoryAgentHistory_membershipId_idx" ON "TerritoryAgentHistory"("membershipId");

-- CreateIndex
CREATE INDEX "TerritoryAgentHistory_effectiveFrom_idx" ON "TerritoryAgentHistory"("effectiveFrom");

-- CreateIndex
CREATE INDEX "TerritoryAgentHistory_territoryId_effectiveFrom_idx" ON "TerritoryAgentHistory"("territoryId", "effectiveFrom");
