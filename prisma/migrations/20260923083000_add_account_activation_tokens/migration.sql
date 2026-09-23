-- CreateTable
CREATE TABLE "AccountActivationToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountActivationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountActivationToken_tokenHash_key" ON "AccountActivationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AccountActivationToken_userId_idx" ON "AccountActivationToken"("userId");

-- CreateIndex
CREATE INDEX "AccountActivationToken_expiresAt_idx" ON "AccountActivationToken"("expiresAt");
