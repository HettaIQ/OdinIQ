-- AlterTable
ALTER TABLE "SalesForecastOverride" ADD COLUMN "deactivatedAt" DATETIME;
ALTER TABLE "SalesForecastOverride" ADD COLUMN "deactivatedByUserId" INTEGER;
ALTER TABLE "SalesForecastOverride" ADD COLUMN "deactivationReason" TEXT;
