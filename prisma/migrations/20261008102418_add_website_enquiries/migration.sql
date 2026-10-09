-- CreateTable
CREATE TABLE "WebsiteEnquiry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "requirements" TEXT,
    "packageName" TEXT NOT NULL,
    "totalUsers" INTEGER NOT NULL,
    "includedUsers" INTEGER NOT NULL,
    "additionalUsers" INTEGER NOT NULL,
    "userDiscount" INTEGER NOT NULL,
    "selectedModules" TEXT NOT NULL,
    "includedModules" INTEGER NOT NULL,
    "additionalModules" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "WebsiteEnquiry_status_createdAt_idx" ON "WebsiteEnquiry"("status", "createdAt");
