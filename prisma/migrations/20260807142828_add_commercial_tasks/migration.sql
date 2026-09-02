-- CreateTable
CREATE TABLE "CommercialTask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "assignedMembershipId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dueDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommercialTask_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommercialTask_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommercialTask_assignedMembershipId_fkey" FOREIGN KEY ("assignedMembershipId") REFERENCES "CompanyMembership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CommercialTask_companyId_idx" ON "CommercialTask"("companyId");

-- CreateIndex
CREATE INDEX "CommercialTask_customerId_idx" ON "CommercialTask"("customerId");

-- CreateIndex
CREATE INDEX "CommercialTask_status_idx" ON "CommercialTask"("status");
