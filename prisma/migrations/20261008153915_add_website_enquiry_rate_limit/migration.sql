-- CreateTable
CREATE TABLE "WebsiteEnquiryRateLimit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "identifier" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "WebsiteEnquiryRateLimit_identifier_createdAt_idx" ON "WebsiteEnquiryRateLimit"("identifier", "createdAt");
