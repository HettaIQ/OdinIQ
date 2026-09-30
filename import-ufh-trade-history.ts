import * as XLSX from "xlsx";
import { prisma } from "./lib/prisma";

const FILE_NAME = "UFH Trade Direct All Sales.xlsx";

const COMPANY_ID = 1;
const BUSINESS_UNIT_ID = 2;

/*
 * SAFETY:
 * Only the first 10 UFH Trade documents
 * will be imported during this test.
 */
const TEST_DOCUMENT_LIMIT = 10;

type RawRow = unknown[];

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

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function roundMoney(
  value: number
): number {
  return Number(
    value.toFixed(2)
  );
}

async function main() {
  console.log("");
  console.log(
    "======================================"
  );
  console.log(
    " UFH TRADE DIRECT - 10 DOCUMENT TEST"
  );
  console.log(
    "======================================"
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
      },
    });

  if (!businessUnit) {
    throw new Error(
      "UFH Trade Direct Business Unit was not found."
    );
  }

  console.log(
    `Target: ${businessUnit.name} (Business Unit ${businessUnit.id})`
  );

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

  /*
   * Group Sage lines by document number.
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

  /*
   * Take ONLY the first 10 documents.
   */
  const testDocuments =
    [...documents.entries()]
      .slice(
        0,
        TEST_DOCUMENT_LIMIT
      );

  console.log(
    `Test documents selected: ${testDocuments.length}`
  );
  console.log("");

  let importedDocuments = 0;
  let importedLines = 0;

  let totalNet = 0;
  let totalVat = 0;
  let totalGross = 0;

  for (
    const [
      invoiceNumber,
      invoiceRows,
    ] of testDocuments
  ) {
    const firstRow =
      invoiceRows[0];

    if (!firstRow) {
      continue;
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

    let netValue = 0;
    let vatValue = 0;

    for (
      const row of invoiceRows
    ) {
      const originalNet =
        numberOrNull(row[8]) ?? 0;

      const discount =
        numberOrNull(row[9]) ?? 0;

      netValue +=
        originalNet -
        discount;

      vatValue +=
        numberOrNull(row[10]) ?? 0;
    }

    netValue =
      roundMoney(netValue);

    vatValue =
      roundMoney(vatValue);

    const grossValue =
      roundMoney(
        netValue + vatValue
      );

    /*
     * IMPORTANT:
     * The unique key includes Business Unit 2,
     * so a UFH invoice can safely have the same
     * invoice number as a Hetta invoice.
     */
    const savedInvoice =
      await prisma.salesInvoice.upsert({
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
          netValue,
          vatValue,
          grossValue,
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
          netValue,
          vatValue,
          grossValue,
        },
      });

    /*
     * This makes the script safe to rerun.
     * Existing UFH lines for this document
     * are replaced with the Sage source lines.
     */
    await prisma.salesInvoiceLine.deleteMany({
      where: {
        salesInvoiceId:
          savedInvoice.id,
      },
    });

    let documentLineCount = 0;

    for (
      const row of invoiceRows
    ) {
      const stockCode =
        text(row[5]);

      const description =
        text(row[6]);

      /*
       * Preserve memo/reference lines such as M.
       * Only completely empty lines are ignored.
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
        numberOrNull(row[9]) ?? 0;

      const lineNetValue =
        originalNetValue === null
          ? null
          : roundMoney(
              originalNetValue -
                netValueDiscount
            );

      await prisma.salesInvoiceLine.create({
        data: {
          salesInvoiceId:
            savedInvoice.id,

          stockCode:
            stockCode || null,

          description:
            description || null,

          quantity:
            numberOrNull(row[7]),

          originalNetValue,

          netValueDiscount,

          netValue:
            lineNetValue,

          vatValue:
            numberOrNull(row[10]),
        },
      });

      documentLineCount++;
      importedLines++;
    }

    importedDocuments++;

    totalNet += netValue;
    totalVat += vatValue;
    totalGross += grossValue;

    console.log(
      `${invoiceNumber} | ${customerAccountCode ?? ""} | ${customerName ?? ""} | ${invoiceType ?? ""} | ${invoiceDate?.toISOString().slice(0, 10) ?? "NO DATE"} | ${documentLineCount} lines | £${netValue.toFixed(2)}`
    );
  }

  console.log("");
  console.log(
    "======================================"
  );
  console.log(
    " TEST IMPORT COMPLETE"
  );
  console.log(
    "======================================"
  );

  console.log(
    `Documents imported: ${importedDocuments}`
  );

  console.log(
    `Lines imported: ${importedLines}`
  );

  console.log(
    `Net: £${totalNet.toFixed(2)}`
  );

  console.log(
    `VAT: £${totalVat.toFixed(2)}`
  );

  console.log(
    `Gross: £${totalGross.toFixed(2)}`
  );

  const ufhInvoiceCount =
    await prisma.salesInvoice.count({
      where: {
        companyId:
          COMPANY_ID,
        businessUnitId:
          BUSINESS_UNIT_ID,
      },
    });

  const hettaInvoiceCount =
    await prisma.salesInvoice.count({
      where: {
        companyId:
          COMPANY_ID,
        businessUnitId: 1,
      },
    });

  console.log("");
  console.log(
    `UFH Trade invoices now in Odin: ${ufhInvoiceCount}`
  );

  console.log(
    `Hetta invoices still in Odin: ${hettaInvoiceCount}`
  );

  console.log("");
  console.log(
    "Only the 10 test documents were written."
  );
  console.log("");
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "UFH Trade test import failed:"
    );
    console.error(error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
