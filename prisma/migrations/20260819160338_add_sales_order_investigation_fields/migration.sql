-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN "investigatedAt" DATETIME;
ALTER TABLE "SalesOrder" ADD COLUMN "investigatedBy" TEXT;
ALTER TABLE "SalesOrder" ADD COLUMN "investigationNote" TEXT;
ALTER TABLE "SalesOrder" ADD COLUMN "investigationStatus" TEXT;
