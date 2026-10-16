/*
  Warnings:

  - You are about to drop the column `wasActive` on the `OdinUserActivityDaily` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OdinUserActivity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    "idleSeconds" INTEGER NOT NULL DEFAULT 0,
    "wasActive" BOOLEAN NOT NULL DEFAULT false,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_OdinUserActivity" ("activeSeconds", "companyId", "createdAt", "endedAt", "id", "idleSeconds", "lastActivityAt", "sessionId", "startedAt", "updatedAt", "userId") SELECT "activeSeconds", "companyId", "createdAt", "endedAt", "id", "idleSeconds", "lastActivityAt", "sessionId", "startedAt", "updatedAt", "userId" FROM "OdinUserActivity";
DROP TABLE "OdinUserActivity";
ALTER TABLE "new_OdinUserActivity" RENAME TO "OdinUserActivity";
CREATE INDEX "OdinUserActivity_userId_companyId_idx" ON "OdinUserActivity"("userId", "companyId");
CREATE INDEX "OdinUserActivity_sessionId_idx" ON "OdinUserActivity"("sessionId");
CREATE INDEX "OdinUserActivity_companyId_lastActivityAt_idx" ON "OdinUserActivity"("companyId", "lastActivityAt");
CREATE TABLE "new_OdinUserActivityDaily" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "activityDate" DATETIME NOT NULL,
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    "idleSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_OdinUserActivityDaily" ("activeSeconds", "activityDate", "companyId", "createdAt", "id", "idleSeconds", "lastActivityAt", "updatedAt", "userId") SELECT "activeSeconds", "activityDate", "companyId", "createdAt", "id", "idleSeconds", "lastActivityAt", "updatedAt", "userId" FROM "OdinUserActivityDaily";
DROP TABLE "OdinUserActivityDaily";
ALTER TABLE "new_OdinUserActivityDaily" RENAME TO "OdinUserActivityDaily";
CREATE INDEX "OdinUserActivityDaily_companyId_activityDate_idx" ON "OdinUserActivityDaily"("companyId", "activityDate");
CREATE UNIQUE INDEX "OdinUserActivityDaily_userId_companyId_activityDate_key" ON "OdinUserActivityDaily"("userId", "companyId", "activityDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
