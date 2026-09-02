-- CreateTable
CREATE TABLE "CustomerVoiceNote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "createdByMembershipId" INTEGER,
    "audioUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "durationSeconds" INTEGER,
    "transcript" TEXT,
    "summary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerVoiceNote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerVoiceNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerVoiceNote_createdByMembershipId_fkey" FOREIGN KEY ("createdByMembershipId") REFERENCES "CompanyMembership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CustomerVoiceNote_companyId_idx" ON "CustomerVoiceNote"("companyId");

-- CreateIndex
CREATE INDEX "CustomerVoiceNote_customerId_idx" ON "CustomerVoiceNote"("customerId");

-- CreateIndex
CREATE INDEX "CustomerVoiceNote_createdAt_idx" ON "CustomerVoiceNote"("createdAt");
