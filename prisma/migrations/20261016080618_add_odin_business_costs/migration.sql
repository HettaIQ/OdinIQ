-- CreateTable
CREATE TABLE "OdinCostSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hourlyRate" REAL NOT NULL DEFAULT 50,
    "openingDevelopmentHours" REAL NOT NULL DEFAULT 402.9,
    "openingDevelopmentValue" REAL NOT NULL DEFAULT 20145,
    "openingBalanceDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OdinExpense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "expenseDate" DATETIME NOT NULL,
    "supplier" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "netAmount" REAL NOT NULL,
    "vatAmount" REAL NOT NULL DEFAULT 0,
    "grossAmount" REAL NOT NULL,
    "paymentMethod" TEXT,
    "fundedBy" TEXT NOT NULL DEFAULT 'PERSONAL',
    "receiptPath" TEXT,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringFrequency" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OdinDevelopmentTime" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workDate" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "hours" REAL NOT NULL,
    "hourlyRate" REAL NOT NULL DEFAULT 50,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "OdinExpense_expenseDate_idx" ON "OdinExpense"("expenseDate");

-- CreateIndex
CREATE INDEX "OdinExpense_category_idx" ON "OdinExpense"("category");

-- CreateIndex
CREATE INDEX "OdinDevelopmentTime_workDate_idx" ON "OdinDevelopmentTime"("workDate");
