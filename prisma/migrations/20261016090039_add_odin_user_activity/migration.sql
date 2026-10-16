-- CreateTable
CREATE TABLE "OdinUserActivity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    "idleSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OdinUserActivityDaily" (
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

-- CreateIndex
CREATE INDEX "OdinUserActivity_userId_companyId_idx" ON "OdinUserActivity"("userId", "companyId");

-- CreateIndex
CREATE INDEX "OdinUserActivity_sessionId_idx" ON "OdinUserActivity"("sessionId");

-- CreateIndex
CREATE INDEX "OdinUserActivity_companyId_lastActivityAt_idx" ON "OdinUserActivity"("companyId", "lastActivityAt");

-- CreateIndex
CREATE INDEX "OdinUserActivityDaily_companyId_activityDate_idx" ON "OdinUserActivityDaily"("companyId", "activityDate");

-- CreateIndex
CREATE UNIQUE INDEX "OdinUserActivityDaily_userId_companyId_activityDate_key" ON "OdinUserActivityDaily"("userId", "companyId", "activityDate");
