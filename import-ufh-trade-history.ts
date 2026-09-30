import * as XLSX from "xlsx";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const FILE_NAME = "UFH Trade Direct All Sales.xlsx";

const COMPANY_ID = 1;
const BUSINESS_UNIT_ID = 2;
const PROGRESS_EVERY = 250;

/*
 * Use a dedicated quiet Prisma client for this historical import.
 * This avoids printing 70,000+ SQL queries.
 */
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

const prisma = new PrismaClient({
  adapter,
  log: ["error", "warn"],
});

type RawRow = unknown[];

type ImportFailure = {
  invoiceNumber: string;
  error: string;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function numberOrNull(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function excelDateToDate(
  value: unknown
): Date | null {
  const serial = Number(value);

  if (!Number.isFinite(serial)) {
    return null;
  }

  const milliseconds =
    Math.round(
      (serial - 25569) *
        86400 *
        1000
    );

  const date =
    new Date(milliseconds);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function roundMoney(
  value: number
): number {
  return Number(value.toFixed(2));
}

async function main() {
  console.log("");
  console.log(
    "=============================================="
  );
  console.log(
    " UFH TRADE DIRECT - FULL HISTORICAL IMPORT"
  );
  console.log(
    "=============================================="
  );
  console.log("");

  const businessUnit =
    await prisma.businessUnit.findFirst({
      where: {
        id: BUSINESS_UNIT_ID,
        companyId: COMPANY_ID,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

  if (!businessUnit) {
    throw new Error(
      `Business Unit ${BUSINESS_UNIT_ID} was not found.`
    );
  }

  console.log(
    `Target: ${businessUnit.name} (Business Unit ${businessUnit.id})`
  );

  /*
   * Read source workbook.
   */
  const workbook =
    XLSX.readFile(FILE_NAME);

  const sheetName =
    workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error(
      "Workbook contains no worksheets."
    );
  }

  const worksheet =
    workbook.Sheets[sheetName];

  const rows =
    XLSX.utils.sheet_to_json(
      worksheet,
      {
        header: 1,
        defval: null,
      }
    ) as RawRow[];

  const dataRows =
    rows
      .slice(2)
      .filter(
        (row) =>
          text(row[3])
      );

  console.log(
    `Source transaction rows: ${dataRows.length.toLocaleString()}`
  );

  /*
   * Group all Sage lines by document number.
   */
  const documents =
    new Map<
      string,
      RawRow[]
    >();

  for (const row of dataRows) {
    const invoiceNumber =
      text(row[3]);

    if (!invoiceNumber) {
      continue;
    }

    const existing =
      documents.get(
        invoiceNumber
      ) ?? [];

    existing.push(row);

    documents.set(
      invoiceNumber,
      existing
    );
  }

  console.log(
    `Source documents: ${documents.size.toLocaleString()}`
  );

  /*
   * Calculate source control totals BEFORE importing.
   */
  let sourceNet = 0;
  let sourceVat = 0;
  let sourceGross = 0;

  for (const row of dataRows) {
    const originalNet =
      numberOrNull(row[8]) ?? 0;

    const discount =
      numberOrNull(row[9]) ?? 0;

    const vat =
      numberOrNull(row[10]) ?? 0;

    sourceNet +=
      originalNet -
      discount;

    sourceVat += vat;
  }

  sourceNet =
    roundMoney(sourceNet);

  sourceVat =
    roundMoney(sourceVat);

  sourceGross =
    roundMoney(
      sourceNet +
        sourceVat
    );

  console.log("");
  console.log("SOURCE CONTROL TOTALS");
  console.log(
    `Net:   £${sourceNet.toFixed(2)}`
  );
  console.log(
    `VAT:   £${sourceVat.toFixed(2)}`
  );
  console.log(
    `Gross: £${sourceGross.toFixed(2)}`
  );
  console.log("");

  /*
   * Safety check.
   *
   * These values came from our validated preview.
   * If the workbook changes unexpectedly, stop.
   */
  if (
    documents.size !== 15098 ||
    dataRows.length !== 74139 ||
    sourceNet !== 10426849.64
  ) {
    throw new Error(
      [
        "SOURCE SAFETY CHECK FAILED.",
        "",
        "Expected:",
        "15,098 documents",
        "74,139 transaction rows",
        "£10,426,849.64 net",
        "",
        "The source workbook does not match the file we previewed.",
        "No full import will be attempted.",
      ].join("\n")
    );
  }

  console.log(
    "Source safety check: PASSED"
  );
  console.log("");

  const failures: ImportFailure[] = [];

  let processedDocuments = 0;
  let successfulDocuments = 0;
  let importedLines = 0;

  const startedAt = Date.now();

  for (
    const [
      invoiceNumber,
      invoiceRows,
    ] of documents.entries()
  ) {
    processedDocuments++;

    try {
      const firstRow =
        invoiceRows[0];

      if (!firstRow) {
        throw new Error(
          "Document contains no rows."
        );
      }

      const customerAccountCode =
        text(firstRow[1]) || null;

      const customerName =
        text(firstRow[2]) || null;

      const invoiceDate =
        excelDateToDate(
          firstRow[4]
        );

      const invoiceType =
        text(firstRow[11]) || null;

      let documentNet = 0;
      let documentVat = 0;

      for (
        const row of invoiceRows
      ) {
        const originalNet =
          numberOrNull(row[8]) ?? 0;

        const discount =
          numberOrNull(row[9]) ?? 0;

        documentNet +=
          originalNet -
          discount;

        documentVat +=
          numberOrNull(row[10]) ?? 0;
      }

      documentNet =
        roundMoney(
          documentNet
        );

      documentVat =
        roundMoney(
          documentVat
        );

      const documentGross =
        roundMoney(
          documentNet +
            documentVat
        );

      /*
       * Use a transaction for each document.
       *
       * If one invoice fails halfway through,
       * that document rolls back without damaging
       * the rest of the historical import.
       */
      const lineCount =
        await prisma.$transaction(
          async (tx) => {
            const savedInvoice =
              await tx.salesInvoice.upsert({
                where: {
                  companyId_businessUnitId_invoiceNumber: {
                    companyId:
                      COMPANY_ID,

                    businessUnitId:
                      BUSINESS_UNIT_ID,

                    invoiceNumber,
                  },
                },

                update: {
                  invoiceType,
                  invoiceDate,
                  customerAccountCode,
                  customerName,
                  netValue:
                    documentNet,
                  vatValue:
                    documentVat,
                  grossValue:
                    documentGross,
                },

                create: {
                  companyId:
                    COMPANY_ID,

                  businessUnitId:
                    BUSINESS_UNIT_ID,

                  invoiceNumber,
                  invoiceType,
                  invoiceDate,
                  customerAccountCode,
                  customerName,
                  netValue:
                    documentNet,
                  vatValue:
                    documentVat,
                  grossValue:
                    documentGross,
                },
              });

            /*
             * Makes reruns idempotent:
             * replace this document's lines
             * with the current Sage source lines.
             */
            await tx.salesInvoiceLine.deleteMany({
              where: {
                salesInvoiceId:
                  savedInvoice.id,
              },
            });

            let createdLines = 0;

            for (
              const row of invoiceRows
            ) {
              const stockCode =
                text(row[5]);

              const description =
                text(row[6]);

              /*
               * Keep historic memo/reference lines.
               * Ignore only genuinely empty lines.
               */
              if (
                !stockCode &&
                !description
              ) {
                continue;
              }

              const originalNetValue =
                numberOrNull(row[8]);

              const netValueDiscount =
                numberOrNull(row[9]) ??
                0;

              const lineNetValue =
                originalNetValue ===
                null
                  ? null
                  : roundMoney(
                      originalNetValue -
                        netValueDiscount
                    );

              await tx.salesInvoiceLine.create({
                data: {
                  salesInvoiceId:
                    savedInvoice.id,

                  stockCode:
                    stockCode ||
                    null,

                  description:
                    description ||
                    null,

                  quantity:
                    numberOrNull(
                      row[7]
                    ),

                  originalNetValue,

                  netValueDiscount,

                  netValue:
                    lineNetValue,

                  vatValue:
                    numberOrNull(
                      row[10]
                    ),
                },
              });

              createdLines++;
            }

            return createdLines;
          }
        );

      importedLines +=
        lineCount;

      successfulDocuments++;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      failures.push({
        invoiceNumber,
        error: message,
      });

      console.error("");
      console.error(
        `FAILED document ${invoiceNumber}: ${message}`
      );
      console.error("");
    }

    if (
      processedDocuments %
        PROGRESS_EVERY ===
        0 ||
      processedDocuments ===
        documents.size
    ) {
      const elapsedSeconds =
        Math.max(
          1,
          Math.round(
            (Date.now() -
              startedAt) /
              1000
          )
        );

      const rate =
        processedDocuments /
        elapsedSeconds;

      const remaining =
        documents.size -
        processedDocuments;

      const etaSeconds =
        rate > 0
          ? Math.round(
              remaining /
                rate
            )
          : 0;

      console.log(
        `Processed ${processedDocuments.toLocaleString()} / ${documents.size.toLocaleString()} | successful ${successfulDocuments.toLocaleString()} | failures ${failures.length} | lines ${importedLines.toLocaleString()} | approx ${etaSeconds}s remaining`
      );
    }
  }

  console.log("");
  console.log(
    "=============================================="
  );
  console.log(
    " IMPORT PHASE COMPLETE"
  );
  console.log(
    "=============================================="
  );

  /*
   * Reconcile the resulting UFH database data.
   */
  const storedInvoices =
    await prisma.salesInvoice.findMany({
      where: {
        companyId:
          COMPANY_ID,

        businessUnitId:
          BUSINESS_UNIT_ID,
      },

      select: {
        id: true,
        netValue: true,
        vatValue: true,
        grossValue: true,
      },
    });

  let databaseNet = 0;
  let databaseVat = 0;
  let databaseGross = 0;

  const storedInvoiceIds =
    storedInvoices.map(
      (invoice) =>
        invoice.id
    );

  for (
    const invoice of
    storedInvoices
  ) {
    databaseNet +=
      invoice.netValue ?? 0;

    databaseVat +=
      invoice.vatValue ?? 0;

    databaseGross +=
      invoice.grossValue ?? 0;
  }

  databaseNet =
    roundMoney(
      databaseNet
    );

  databaseVat =
    roundMoney(
      databaseVat
    );

  databaseGross =
    roundMoney(
      databaseGross
    );

  let databaseLineCount = 0;

  /*
   * SQLite has a parameter limit, so count lines
   * in manageable invoice-ID batches.
   */
  const ID_BATCH_SIZE = 500;

  for (
    let index = 0;
    index <
    storedInvoiceIds.length;
    index += ID_BATCH_SIZE
  ) {
    const batch =
      storedInvoiceIds.slice(
        index,
        index +
          ID_BATCH_SIZE
      );

    databaseLineCount +=
      await prisma.salesInvoiceLine.count({
        where: {
          salesInvoiceId: {
            in: batch,
          },
        },
      });
  }

  const hettaInvoiceCount =
    await prisma.salesInvoice.count({
      where: {
        companyId:
          COMPANY_ID,

        businessUnitId: 1,
      },
    });

  console.log("");
  console.log("SOURCE");
  console.log(
    `Documents: ${documents.size.toLocaleString()}`
  );
  console.log(
    `Rows:      ${dataRows.length.toLocaleString()}`
  );
  console.log(
    `Net:       £${sourceNet.toFixed(2)}`
  );
  console.log(
    `VAT:       £${sourceVat.toFixed(2)}`
  );
  console.log(
    `Gross:     £${sourceGross.toFixed(2)}`
  );

  console.log("");
  console.log("ODIN - UFH TRADE");
  console.log(
    `Invoices:  ${storedInvoices.length.toLocaleString()}`
  );
  console.log(
    `Lines:     ${databaseLineCount.toLocaleString()}`
  );
  console.log(
    `Net:       £${databaseNet.toFixed(2)}`
  );
  console.log(
    `VAT:       £${databaseVat.toFixed(2)}`
  );
  console.log(
    `Gross:     £${databaseGross.toFixed(2)}`
  );

  console.log("");
  console.log(
    `Hetta invoices preserved: ${hettaInvoiceCount.toLocaleString()}`
  );

  console.log("");
  console.log(
    `Failed UFH documents: ${failures.length}`
  );

  if (
    failures.length > 0
  ) {
    console.log("");
    console.log(
      "FAILED DOCUMENTS"
    );

    console.table(
      failures
    );
  }

  const invoiceCountMatches =
    storedInvoices.length ===
    documents.size;

  const lineCountMatches =
    databaseLineCount ===
    dataRows.length;

  const netMatches =
    databaseNet ===
    sourceNet;

  const vatMatches =
    databaseVat ===
    sourceVat;

  const grossMatches =
    databaseGross ===
    sourceGross;

  const fullyReconciled =
    failures.length === 0 &&
    invoiceCountMatches &&
    lineCountMatches &&
    netMatches &&
    vatMatches &&
    grossMatches &&
    hettaInvoiceCount ===
      48046;

  console.log("");
  console.log(
    "=============================================="
  );

  if (fullyReconciled) {
    console.log(
      " FULL IMPORT RECONCILIATION: PASSED"
    );
  } else {
    console.log(
      " FULL IMPORT RECONCILIATION: CHECK REQUIRED"
    );
  }

  console.log(
    "=============================================="
  );
  console.log("");

  console.log(
    `Invoice count match: ${invoiceCountMatches ? "YES" : "NO"}`
  );

  console.log(
    `Line count match:    ${lineCountMatches ? "YES" : "NO"}`
  );

  console.log(
    `Net total match:     ${netMatches ? "YES" : "NO"}`
  );

  console.log(
    `VAT total match:     ${vatMatches ? "YES" : "NO"}`
  );

  console.log(
    `Gross total match:   ${grossMatches ? "YES" : "NO"}`
  );

  console.log(
    `Hetta count intact:  ${hettaInvoiceCount === 48046 ? "YES" : "NO"}`
  );

  console.log("");

  if (!fullyReconciled) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "UFH Trade historical import failed:"
    );
    console.error(error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
