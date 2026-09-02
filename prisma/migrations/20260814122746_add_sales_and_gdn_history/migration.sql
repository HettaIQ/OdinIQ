-- CreateTable
CREATE TABLE "GoodsDespatchNote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "gdnNumber" TEXT NOT NULL,
    "salesOrderNumber" TEXT,
    "gdnDate" DATETIME,
    "customerAccountCode" TEXT,
    "customerName" TEXT,
    "deliveryName" TEXT,
    "deliveryAddress1" TEXT,
    "deliveryAddress2" TEXT,
    "deliveryAddress3" TEXT,
    "deliveryTown" TEXT,
    "deliveryCounty" TEXT,
    "deliveryPostcode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DESPATCHED',
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoodsDespatchNote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoodsDespatchLine" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "goodsDespatchNoteId" INTEGER NOT NULL,
    "lineNumber" INTEGER,
    "stockCode" TEXT,
    "partNumber" TEXT,
    "description" TEXT,
    "quantityOrdered" REAL,
    "quantityDespatched" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoodsDespatchLine_goodsDespatchNoteId_fkey" FOREIGN KEY ("goodsDespatchNoteId") REFERENCES "GoodsDespatchNote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalesInvoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceType" TEXT,
    "invoiceDate" DATETIME,
    "customerAccountCode" TEXT,
    "customerName" TEXT,
    "netValue" REAL,
    "vatValue" REAL,
    "grossValue" REAL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalesInvoiceLine" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "salesInvoiceId" INTEGER NOT NULL,
    "lineNumber" INTEGER,
    "stockCode" TEXT,
    "description" TEXT,
    "quantity" REAL,
    "netValue" REAL,
    "vatValue" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesInvoiceLine_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GoodsDespatchNote_companyId_customerAccountCode_idx" ON "GoodsDespatchNote"("companyId", "customerAccountCode");

-- CreateIndex
CREATE INDEX "GoodsDespatchNote_companyId_salesOrderNumber_idx" ON "GoodsDespatchNote"("companyId", "salesOrderNumber");

-- CreateIndex
CREATE INDEX "GoodsDespatchNote_companyId_gdnDate_idx" ON "GoodsDespatchNote"("companyId", "gdnDate");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsDespatchNote_companyId_gdnNumber_key" ON "GoodsDespatchNote"("companyId", "gdnNumber");

-- CreateIndex
CREATE INDEX "GoodsDespatchLine_goodsDespatchNoteId_idx" ON "GoodsDespatchLine"("goodsDespatchNoteId");

-- CreateIndex
CREATE INDEX "GoodsDespatchLine_stockCode_idx" ON "GoodsDespatchLine"("stockCode");

-- CreateIndex
CREATE INDEX "SalesInvoice_companyId_customerAccountCode_idx" ON "SalesInvoice"("companyId", "customerAccountCode");

-- CreateIndex
CREATE INDEX "SalesInvoice_companyId_invoiceDate_idx" ON "SalesInvoice"("companyId", "invoiceDate");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoice_companyId_invoiceNumber_key" ON "SalesInvoice"("companyId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "SalesInvoiceLine_salesInvoiceId_idx" ON "SalesInvoiceLine"("salesInvoiceId");

-- CreateIndex
CREATE INDEX "SalesInvoiceLine_stockCode_idx" ON "SalesInvoiceLine"("stockCode");
