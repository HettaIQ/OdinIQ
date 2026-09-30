-- CreateTable
CREATE TABLE "BusinessUnit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DIVISION',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessUnit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BusinessUnit_companyId_idx" ON "BusinessUnit"("companyId");

-- CreateIndex
CREATE INDEX "BusinessUnit_companyId_active_idx" ON "BusinessUnit"("companyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessUnit_companyId_slug_key" ON "BusinessUnit"("companyId", "slug");
