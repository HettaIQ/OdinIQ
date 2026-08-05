/*
  Warnings:

  - You are about to drop the column `description` on the `AgreementDocument` table. All the data in the column will be lost.
  - You are about to drop the column `filePath` on the `AgreementDocument` table. All the data in the column will be lost.
  - Added the required column `fileSize` to the `AgreementDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalName` to the `AgreementDocument` table without a default value. This is not possible if the table is not empty.
  - Made the column `fileType` on table `AgreementDocument` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AgreementDocument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "agreementId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "category" TEXT,
    "uploadedBy" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgreementDocument_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "CommercialAgreement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AgreementDocument" ("agreementId", "fileName", "fileType", "id", "uploadedAt") SELECT "agreementId", "fileName", "fileType", "id", "uploadedAt" FROM "AgreementDocument";
DROP TABLE "AgreementDocument";
ALTER TABLE "new_AgreementDocument" RENAME TO "AgreementDocument";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
