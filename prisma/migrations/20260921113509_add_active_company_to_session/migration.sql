-- AlterTable
ALTER TABLE "Session" ADD COLUMN "activeCompanyId" INTEGER;

-- CreateIndex
CREATE INDEX "Session_activeCompanyId_idx" ON "Session"("activeCompanyId");
