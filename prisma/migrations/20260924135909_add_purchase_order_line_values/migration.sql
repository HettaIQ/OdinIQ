-- AlterTable
ALTER TABLE "PurchaseOrderLine" ADD COLUMN "discountAmount" REAL;
ALTER TABLE "PurchaseOrderLine" ADD COLUMN "grossValue" REAL;
ALTER TABLE "PurchaseOrderLine" ADD COLUMN "unitOfSale" TEXT;
ALTER TABLE "PurchaseOrderLine" ADD COLUMN "vatValue" REAL;
