-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OdinUserActivityDaily" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "activityDate" DATETIME NOT NULL,
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    "idleSeconds" INTEGER NOT NULL DEFAULT 0,
    "wasActive" BOOLEAN NOT NULL DEFAULT false,
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
