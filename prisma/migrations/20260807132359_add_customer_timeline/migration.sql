-- CreateTable
CREATE TABLE "CustomerTimelineEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "value" REAL,
    "reference" TEXT,
    "createdBy" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerTimelineEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CustomerTimelineEntry_customerId_idx" ON "CustomerTimelineEntry"("customerId");

-- CreateIndex
CREATE INDEX "CustomerTimelineEntry_occurredAt_idx" ON "CustomerTimelineEntry"("occurredAt");

-- CreateIndex
CREATE INDEX "CustomerTimelineEntry_type_idx" ON "CustomerTimelineEntry"("type");
