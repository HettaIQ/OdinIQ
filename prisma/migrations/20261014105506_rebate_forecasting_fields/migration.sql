-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RebateScheme" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "rebateType" TEXT,
    "rebatePercent" REAL,
    "thresholdFrom" REAL,
    "thresholdTo" REAL,
    "paymentFrequency" TEXT,
    "paymentDate" DATETIME,
    "notes" TEXT,
    "calculationFrequency" TEXT,
    "calculationBasis" TEXT,
    "tierMethod" TEXT,
    "retrospective" BOOLEAN NOT NULL DEFAULT false,
    "paymentLagDays" INTEGER,
    "effectiveFrom" DATETIME,
    "effectiveTo" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "agreementId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RebateScheme_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "CommercialAgreement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RebateScheme" ("agreementId", "createdAt", "id", "name", "notes", "paymentDate", "paymentFrequency", "rebatePercent", "rebateType", "thresholdFrom", "thresholdTo", "updatedAt") SELECT "agreementId", "createdAt", "id", "name", "notes", "paymentDate", "paymentFrequency", "rebatePercent", "rebateType", "thresholdFrom", "thresholdTo", "updatedAt" FROM "RebateScheme";
DROP TABLE "RebateScheme";
ALTER TABLE "new_RebateScheme" RENAME TO "RebateScheme";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
