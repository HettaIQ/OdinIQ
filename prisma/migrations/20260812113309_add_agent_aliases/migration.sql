-- CreateTable
CREATE TABLE "AgentAlias" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "membershipId" INTEGER NOT NULL,
    "alias" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentAlias_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentAlias_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "CompanyMembership" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AgentAlias_companyId_idx" ON "AgentAlias"("companyId");

-- CreateIndex
CREATE INDEX "AgentAlias_membershipId_idx" ON "AgentAlias"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentAlias_companyId_alias_key" ON "AgentAlias"("companyId", "alias");
