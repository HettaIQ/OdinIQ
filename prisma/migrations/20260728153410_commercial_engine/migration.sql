-- CreateTable
CREATE TABLE "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "supplier" TEXT,
    "category" TEXT,
    "brand" TEXT,
    "costPrice" REAL,
    "listPrice" REAL,
    "sellPrice" REAL,
    "margin" REAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MerchantPrice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "merchantName" TEXT NOT NULL,
    "discount" REAL,
    "productId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MerchantPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_productCode_key" ON "Product"("productCode");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantPrice_merchantName_productId_key" ON "MerchantPrice"("merchantName", "productId");
