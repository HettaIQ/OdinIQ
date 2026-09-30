import * as XLSX from "xlsx";
import { prisma } from "./lib/prisma";

const FILE_NAME = "UFH Trade Direct All Sales.xlsx";

const COMPANY_ID = 1;
const BUSINESS_UNIT_ID = 2;

type RawRow = unknown[];

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function excelDateToDate(value: unknown): Date | null {
  const serial = Number(value);

  if (!Number.isFinite(serial)) {
    return null;
  }

  const milliseconds =
    Math.round((serial - 25569) * 86400 * 1000);

  const date = new Date(milliseconds);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

async function main() {
  console.log("");
  console.log("======================================");
  console.log(" UFH TRADE DIRECT - IMPORT PREVIEW");
  console.log("======================================");
  console.log("");

  /*
   * Confirm that the target business unit exists.
   */
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
        type: true,
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
   * Load the UFH Trade Sage workbook.
   */
  const workbook =
    XLSX.readFile(FILE_NAME);

  const sheetName =
    workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error(
      "The workbook contains no worksheets."
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

  /*
   * Row 1 is the Sage report title.
   * Row 2 contains the column headings.
   * Data therefore starts at array index 2.
   */
  const dataRows =
    rows.slice(2).filter((row) =>
      text(row[3])
  );

  console.log(`Worksheet: ${sheetName}`);
  console.log(
    `Transaction rows: ${dataRows.length.toLocaleString()}`
  );

  /*
   * Column positions in the Sage report:
   *
   * 0  Company.Name
   * 1  Invoice.AccountReference
   * 2  Invoice.AccountName
   * 3  Invoice.Number
   * 4  Invoice.Date
   * 5  InvoiceItem.ProductAccountReference
   * 6  InvoiceItem.Description
   * 7  InvoiceItem.Quantity
   * 8  InvoiceItem.AmountNet
   * 9  InvoiceItem.AmountNetValueDiscountProportion
   * 10 InvoiceItem.AmountVAT
   * 11 Invoice.Type
   */

  const invoiceNumbers =
    new Set<string>();

  const customerCodes =
    new Set<string>();

  const productCodes =
    new Set<string>();

  const invoiceTypes =
    new Map<string, number>();

  let invoiceRows = 0;
  let creditRows = 0;

  let netSales = 0;
  let vat = 0;
  let quantity = 0;

  let earliestDate: Date | null = null;
  let latestDate: Date | null = null;

  for (const row of dataRows) {
    const invoiceNumber =
      text(row[3]);

    const customerCode =
      text(row[1]);

    const productCode =
      text(row[5]);

    const invoiceType =
      text(row[11]);

    if (invoiceNumber) {
      invoiceNumbers.add(
        invoiceNumber
      );
    }

    if (customerCode) {
      customerCodes.add(
        customerCode
      );
    }

    if (productCode) {
      productCodes.add(
        productCode
      );
    }

    invoiceTypes.set(
      invoiceType,
      (invoiceTypes.get(invoiceType) ?? 0) + 1
    );

    if (
      invoiceType ===
      "Product Credit Note"
    ) {
      creditRows++;
    } else {
      invoiceRows++;
    }

    /*
     * Sage already stores credit quantities,
     * net values and VAT as negative values.
     * Do NOT reverse their signs.
     */
    quantity +=
      numberValue(row[7]);

    const originalNet =
      numberValue(row[8]);

    const netValueDiscount =
      numberValue(row[9]);

    netSales +=
      originalNet -
      netValueDiscount;

    vat +=
      numberValue(row[10]);

    const date =
      excelDateToDate(row[4]);

    if (date) {
      if (
        !earliestDate ||
        date < earliestDate
      ) {
        earliestDate = date;
      }

      if (
        !latestDate ||
        date > latestDate
      ) {
        latestDate = date;
      }
    }
  }

  /*
   * Compare UFH Trade product codes against
   * the existing Hetta/Odin product master.
   */
  const products =
    await prisma.product.findMany({
      where: {
        companyId: COMPANY_ID,
      },
      select: {
        productCode: true,
      },
    });

  const existingProductCodes =
    new Set(
      products.map((product) =>
        text(
          product.productCode
        ).toUpperCase()
      )
    );

  const missingProductCodes =
    [...productCodes]
      .filter(
        (code) =>
          !existingProductCodes.has(
            code.toUpperCase()
          )
      )
      .sort();

  /*
   * Check whether anything has already been
   * imported into UFH Trade Business Unit 2.
   */
  const existingUfhInvoices =
    await prisma.salesInvoice.count({
      where: {
        companyId: COMPANY_ID,
        businessUnitId:
          BUSINESS_UNIT_ID,
      },
    });

  console.log("");
  console.log("DOCUMENTS");
  console.log(
    `Unique documents: ${invoiceNumbers.size.toLocaleString()}`
  );
  console.log(
    `Invoice rows: ${invoiceRows.toLocaleString()}`
  );
  console.log(
    `Credit rows: ${creditRows.toLocaleString()}`
  );

  console.log("");
  console.log("CUSTOMERS");
  console.log(
    `Unique customer accounts: ${customerCodes.size.toLocaleString()}`
  );

  console.log("");
  console.log("PRODUCTS");
  console.log(
    `Unique product codes: ${productCodes.size.toLocaleString()}`
  );
  console.log(
    `Matched to Odin products: ${
      productCodes.size -
      missingProductCodes.length
    }`
  );
  console.log(
    `Missing from Odin products: ${missingProductCodes.length}`
  );

  if (
    missingProductCodes.length > 0
  ) {
    console.log("");
    console.log(
      "Missing product codes:"
    );

    console.log(
      missingProductCodes.join(", ")
    );
  }

  console.log("");
  console.log("DATE RANGE");
  console.log(
    `Earliest: ${
      earliestDate
        ? earliestDate
            .toISOString()
            .slice(0, 10)
        : "Unknown"
    }`
  );

  console.log(
    `Latest: ${
      latestDate
        ? latestDate
            .toISOString()
            .slice(0, 10)
        : "Unknown"
    }`
  );

  console.log("");
  console.log("FINANCIAL PREVIEW");
  console.log(
    `Net sales after line discounts: £${netSales.toFixed(2)}`
  );
  console.log(
    `VAT: £${vat.toFixed(2)}`
  );
  console.log(
    `Net + VAT: £${(
      netSales + vat
    ).toFixed(2)}`
  );

  console.log("");
  console.log("INVOICE TYPES");

  console.table(
    [...invoiceTypes.entries()]
      .map(([type, count]) => ({
        type,
        rows: count,
      }))
      .sort(
        (a, b) =>
          b.rows - a.rows
      )
  );

  console.log("");
  console.log(
    `Invoices currently stored against UFH Trade Direct: ${existingUfhInvoices.toLocaleString()}`
  );

  console.log("");
  console.log(
    "PREVIEW COMPLETE - NO DATABASE CHANGES MADE"
  );
  console.log("");
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "UFH Trade preview failed:"
    );
    console.error(error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
