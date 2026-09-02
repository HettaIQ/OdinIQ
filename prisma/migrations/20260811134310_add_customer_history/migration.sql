-- CreateTable
CREATE TABLE "CustomerAgentHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "membershipId" INTEGER,
    "agentName" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerAgentHistory_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerAgentHistory_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "CompanyMembership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerBuyingGroupHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "buyingGroup" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerBuyingGroupHistory_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CustomerAgentHistory_customerId_idx" ON "CustomerAgentHistory"("customerId");

-- CreateIndex
CREATE INDEX "CustomerAgentHistory_membershipId_idx" ON "CustomerAgentHistory"("membershipId");

-- CreateIndex
CREATE INDEX "CustomerAgentHistory_effectiveFrom_idx" ON "CustomerAgentHistory"("effectiveFrom");

-- CreateIndex
CREATE INDEX "CustomerBuyingGroupHistory_customerId_idx" ON "CustomerBuyingGroupHistory"("customerId");

-- CreateIndex
CREATE INDEX "CustomerBuyingGroupHistory_buyingGroup_idx" ON "CustomerBuyingGroupHistory"("buyingGroup");

-- CreateIndex
CREATE INDEX "CustomerBuyingGroupHistory_effectiveFrom_idx" ON "CustomerBuyingGroupHistory"("effectiveFrom");
