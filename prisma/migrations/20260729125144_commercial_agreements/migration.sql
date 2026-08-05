-- CreateTable
CREATE TABLE "CommercialAgreement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerName" TEXT NOT NULL,
    "agreementName" TEXT NOT NULL,
    "agreementType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "renewalDate" DATETIME,
    "noticePeriod" TEXT,
    "accountManager" TEXT,
    "buyingGroup" TEXT,
    "standardDiscount" REAL,
    "rebatePercent" REAL,
    "paymentTerms" TEXT,
    "creditLimit" REAL,
    "marketingBudget" REAL,
    "marketingSpend" REAL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AgreementDocument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT,
    "filePath" TEXT,
    "description" TEXT,
    "agreementId" INTEGER NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgreementDocument_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "CommercialAgreement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgreementDiscount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "scope" TEXT,
    "discount" REAL NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "notes" TEXT,
    "agreementId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgreementDiscount_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "CommercialAgreement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RebateScheme" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "rebateType" TEXT,
    "rebatePercent" REAL,
    "thresholdFrom" REAL,
    "thresholdTo" REAL,
    "paymentFrequency" TEXT,
    "paymentDate" DATETIME,
    "notes" TEXT,
    "agreementId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RebateScheme_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "CommercialAgreement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
