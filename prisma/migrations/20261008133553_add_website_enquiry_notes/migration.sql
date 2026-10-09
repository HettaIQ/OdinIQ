-- CreateTable
CREATE TABLE "WebsiteEnquiryNote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "enquiryId" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebsiteEnquiryNote_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "WebsiteEnquiry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WebsiteEnquiryNote_enquiryId_createdAt_idx" ON "WebsiteEnquiryNote"("enquiryId", "createdAt");
