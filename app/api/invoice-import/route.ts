import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";

type InvoiceImportRow = {
  invoiceNumber?: string | number;
  invoiceType?: string;
  invoiceDate?: string;

  customerAccountCode?: string;
  customerName?: string;

  amount?: string | number;
  netAmount?: string | number;
  taxAmount?: string | number;
  grossAmount?: string | number;

  salesOrderNumber?: string | number;
  customerOrderNumber?: string | number;

  stockCode?: string;
  description?: string;
  quantity?: string | number;
};

function toNumber(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const cleaned = String(value)
    .replace(/£/g, "")
    .replace(/,/g, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function parseSageDate(value: unknown) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  const match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/
  );

  if (!match) {
    return null;
  }

  const month = Number(match[1]);
  const day = Number(match[2]);

  let year = Number(match[3]);

  if (year < 100) {
    year += 2000;
  }

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );
}


function firstText(
  rows: InvoiceImportRow[],
  getter: (row: InvoiceImportRow) => unknown
) {
  for (const row of rows) {
    const value = String(
      getter(row) ?? ""
    ).trim();

    if (value) {
      return value;
    }
  }

  return null;
}

function sumField(
  rows: InvoiceImportRow[],
  getter: (row: InvoiceImportRow) => unknown
) {
  const values = rows
    .map((row) => toNumber(getter(row)))
    .filter(
      (value): value is number =>
        value !== null
    );

  if (values.length === 0) {
    return null;
  }

  return Number(
    values
      .reduce(
        (total, value) =>
          total + value,
        0
      )
      .toFixed(2)
  );
}

function normaliseCustomerName(
  value: unknown
) {
  return String(value ?? "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractCreditedInvoiceNumber(
  rows: InvoiceImportRow[]
) {
  for (const row of rows) {
    const stockCode = String(
      row.stockCode ?? ""
    )
      .trim()
      .toUpperCase();

    const description = String(
      row.description ?? ""
    ).trim();

    if (!description) {
      continue;
    }

    if (stockCode === "M") {
      const match = description.match(
        /\b(?:credit\s+against\s+)?inv(?:oice)?\.?\s*#?\s*(\d+)\b/i
      );

      if (match?.[1]) {
        return match[1];
      }
    }
  }

  for (const row of rows) {
    const description = String(
      row.description ?? ""
    ).trim();

    const match = description.match(
      /\bcredit\s+against\s+inv(?:oice)?\.?\s*#?\s*(\d+)\b/i
    );

    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export async function POST(
  request: Request
) {
  try {
    const user = await requireAuth();
    const membership =
      user.memberships[0];

    if (!membership) {
      return NextResponse.json(
        {
          error:
            "No active company membership found.",
        },
        { status: 403 }
      );
    }

    const canImport =
      membership.role?.name ===
        "Company Admin" ||
      membership.role?.name ===
        "Accounts";

    if (!canImport) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to import invoice data.",
        },
        { status: 403 }
      );
    }

    const body =
      await request.json();

    const rows = Array.isArray(body.rows)
      ? (body.rows as InvoiceImportRow[])
      : [];

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "No invoice rows were supplied.",
        },
        { status: 400 }
      );
    }

    const groupedRows = new Map<
      string,
      InvoiceImportRow[]
    >();

    for (const row of rows) {
      const invoiceNumber = String(
        row.invoiceNumber ?? ""
      ).trim();

      if (!invoiceNumber) {
        continue;
      }

      const existing =
        groupedRows.get(
          invoiceNumber
        ) ?? [];

      existing.push(row);

      groupedRows.set(
        invoiceNumber,
        existing
      );
    }

    let importedInvoices = 0;
    let importedInvoiceLines = 0;
    let linkedCredits = 0;

    for (
      const [
        invoiceNumber,
        invoiceRows,
      ] of groupedRows
    ) {
      const existingInvoice =
        await prisma.salesInvoice.findUnique({
          where: {
            companyId_invoiceNumber: {
              companyId:
                membership.companyId,
              invoiceNumber,
            },
          },
        });

      const invoiceType =
        firstText(
          invoiceRows,
          (row) => row.invoiceType
        ) ?? null;

      const normalizedInvoiceType =
        String(invoiceType ?? "")
          .trim()
          .toUpperCase();

      const isCredit =
        normalizedInvoiceType ===
          "CRD" ||
        normalizedInvoiceType ===
          "CREDIT" ||
        normalizedInvoiceType.includes(
          "CREDIT NOTE"
        );

      const importedSalesOrderNumber =
        firstText(
          invoiceRows,
          (row) =>
            row.salesOrderNumber
        ) ?? null;

      const importedCustomerOrderNumber =
        firstText(
          invoiceRows,
          (row) =>
            row.customerOrderNumber
        ) ?? null;

      /*
       * IMPORTANT:
       *
       * Detailed Sage reports frequently omit
       * Sales Order and Customer Order numbers.
       *
       * Never erase a value OdinIQ already has
       * just because the detailed report does
       * not contain it.
       */
      const salesOrderNumber =
        importedSalesOrderNumber ??
        existingInvoice
          ?.salesOrderNumber ??
        null;

      const customerOrderNumber =
        importedCustomerOrderNumber ??
        existingInvoice
          ?.customerOrderNumber ??
        null;

      const invoiceDateText =
        firstText(
          invoiceRows,
          (row) => row.invoiceDate
        );

      const importedInvoiceDate =
        parseSageDate(
          invoiceDateText
        );

      const invoiceDate =
        importedInvoiceDate ??
        existingInvoice?.invoiceDate ??
        null;

      const importedCustomerAccountCode =
        firstText(
          invoiceRows,
          (row) =>
            row.customerAccountCode
        ) ?? null;

      const importedCustomerName =
        firstText(
          invoiceRows,
          (row) =>
            row.customerName
        ) ?? null;

      let resolvedCustomerAccountCode =
        importedCustomerAccountCode ??
        existingInvoice
          ?.customerAccountCode ??
        null;

      let customerNameForLookup =
        importedCustomerName ??
        existingInvoice
          ?.customerName ??
        null;

      if (
        !resolvedCustomerAccountCode &&
        salesOrderNumber
      ) {
        const matchingSalesOrder =
          await prisma.salesOrder.findUnique(
            {
              where: {
                companyId_salesOrderNumber:
                  {
                    companyId:
                      membership.companyId,
                    salesOrderNumber,
                  },
              },
              select: {
                customerAccountCode: true,
                customerName: true,
              },
            }
          );

        resolvedCustomerAccountCode =
          matchingSalesOrder
            ?.customerAccountCode ??
          null;

        if (
          matchingSalesOrder?.customerName
        ) {
          customerNameForLookup =
            matchingSalesOrder.customerName;
        }
      }

      if (
        !resolvedCustomerAccountCode &&
        customerNameForLookup
      ) {
        const matchingCustomer =
          await prisma.customer.findFirst(
            {
              where: {
                companyId:
                  membership.companyId,
                name: customerNameForLookup,
              },
              select: {
                accountCode: true,
              },
            }
          );

        resolvedCustomerAccountCode =
          matchingCustomer
            ?.accountCode ?? null;
      }

      if (
        !resolvedCustomerAccountCode &&
        customerNameForLookup
      ) {
        const customers =
          await prisma.customer.findMany(
            {
              where: {
                companyId:
                  membership.companyId,
              },
              select: {
                name: true,
                accountCode: true,
              },
            }
          );

        const targetName =
          normaliseCustomerName(
            customerNameForLookup
          );

        const matchingCustomer =
          customers.find(
            (customer) =>
              normaliseCustomerName(
                customer.name
              ) === targetName
          );

        resolvedCustomerAccountCode =
          matchingCustomer
            ?.accountCode ?? null;
      }

      const importedNetValue =
        sumField(
          invoiceRows,
          (row) => row.netAmount
        );

      const taxFromSage =
        sumField(
          invoiceRows,
          (row) => row.taxAmount
        );

      const grossFromDetailedRows =
        sumField(
          invoiceRows,
          (row) => row.grossAmount
        );

      const grossFromOldExport =
        sumField(
          invoiceRows,
          (row) => row.amount
        );

      const importedGrossValue =
        grossFromDetailedRows ??
        grossFromOldExport ??
        (importedNetValue !== null &&
        taxFromSage !== null
          ? Number(
              (
                importedNetValue +
                taxFromSage
              ).toFixed(2)
            )
          : null);

      const importedVatValue =
        taxFromSage !== null &&
        taxFromSage !== 0
          ? taxFromSage
          : importedNetValue !== null &&
            importedGrossValue !== null
          ? Number(
              (
                importedGrossValue -
                importedNetValue
              ).toFixed(2)
            )
          : taxFromSage;

      /*
       * Preserve existing financial values if
       * this particular report did not provide
       * replacements.
       */
      const netValue =
        importedNetValue ??
        existingInvoice?.netValue ??
        null;

      const vatValue =
        importedVatValue ??
        existingInvoice?.vatValue ??
        null;

      const grossValue =
        importedGrossValue ??
        existingInvoice?.grossValue ??
        null;

      const customerName =
        importedCustomerName ??
        existingInvoice?.customerName ??
        null;

      const finalInvoiceType =
        invoiceType ??
        existingInvoice?.invoiceType ??
        null;

      const creditedInvoiceNumber =
        isCredit
          ? extractCreditedInvoiceNumber(
              invoiceRows
            )
          : existingInvoice
              ?.creditedInvoiceNumber ??
            null;

      let creditedInvoiceId =
        existingInvoice
          ?.creditedInvoiceId ??
        null;

      if (
        isCredit &&
        creditedInvoiceNumber
      ) {
        const originalInvoice =
          await prisma.salesInvoice.findUnique(
            {
              where: {
                companyId_invoiceNumber:
                  {
                    companyId:
                      membership.companyId,
                    invoiceNumber:
                      creditedInvoiceNumber,
                  },
              },
              select: {
                id: true,
              },
            }
          );

        creditedInvoiceId =
          originalInvoice?.id ??
          creditedInvoiceId;

        if (originalInvoice?.id) {
          linkedCredits++;
        }
      }

      const savedInvoice =
        await prisma.salesInvoice.upsert(
          {
            where: {
              companyId_invoiceNumber:
                {
                  companyId:
                    membership.companyId,
                  invoiceNumber,
                },
            },

            update: {
              /*
               * These values have already been
               * merged with the existing record
               * above, so omitted detailed-report
               * fields cannot erase good data.
               */
              salesOrderNumber,
              customerOrderNumber,
              invoiceType:
                finalInvoiceType,
              invoiceDate,
              customerAccountCode:
                resolvedCustomerAccountCode,
              customerName,
              netValue,
              vatValue,
              grossValue,
              creditedInvoiceNumber,
              creditedInvoiceId,
            },

            create: {
              companyId:
                membership.companyId,
              invoiceNumber,
              salesOrderNumber,
              customerOrderNumber,
              invoiceType:
                finalInvoiceType,
              invoiceDate,
              customerAccountCode:
                resolvedCustomerAccountCode,
              customerName,
              netValue,
              vatValue,
              grossValue,
              creditedInvoiceNumber,
              creditedInvoiceId,
            },
          }
        );

      await prisma.salesInvoice.updateMany(
        {
          where: {
            companyId:
              membership.companyId,

            creditedInvoiceNumber:
              invoiceNumber,

            creditedInvoiceId: null,

            id: {
              not: savedInvoice.id,
            },
          },

          data: {
            creditedInvoiceId:
              savedInvoice.id,
          },
        }
      );

      /*
 * Store detailed product lines for BOTH
 * invoices and credit notes whenever the
 * imported Sage report actually contains
 * line-level information.
 *
 * IMPORTANT:
 * A later summary import may contain only
 * invoice header information. In that case
 * we preserve any detailed product lines
 * already stored in OdinIQ.
 */
const hasDetailedLines =
  invoiceRows.some((row) => {
    const stockCode = String(
      row.stockCode ?? ""
    ).trim();

    const description = String(
      row.description ?? ""
    ).trim();

    const quantity = toNumber(
      row.quantity
    );

    return (
      Boolean(stockCode) ||
      Boolean(description) ||
      quantity !== null
    );
  });

if (hasDetailedLines) {
  await prisma.salesInvoiceLine.deleteMany({
    where: {
      salesInvoiceId: savedInvoice.id,
    },
  });

  for (const row of invoiceRows) {
    const stockCode = String(
      row.stockCode ?? ""
    ).trim();

    const description = String(
      row.description ?? ""
    ).trim();

    /*
     * Ignore completely empty rows, but retain
     * genuine Sage memo/reference lines such
     * as M because they can contain useful
     * credit-against-invoice information.
     */
    if (
      !stockCode &&
      !description
    ) {
      continue;
    }

    await prisma.salesInvoiceLine.create({
      data: {
        salesInvoiceId: savedInvoice.id,

        stockCode:
          stockCode || null,

        description:
          description || null,

        quantity:
          toNumber(row.quantity),

        netValue:
          toNumber(row.netAmount),

        vatValue:
          toNumber(row.taxAmount),
      },
    });

    importedInvoiceLines++;
  }
}

importedInvoices++;
}
/*
 * Refresh OdinIQ pages after new Sage invoice data
 * has been written so users immediately see the
 * latest commercial figures.
 */
revalidatePath("/commercial/customers", "layout");
revalidatePath("/products", "layout");
return NextResponse.json({
  success: true,
  invoiceCount:
    importedInvoices,
  invoiceLineCount:
  importedInvoiceLines,
  linkedCreditCount:
    linkedCredits,
});
} catch (error) {
console.error(
  "Invoice import failed:",
  error
);

return NextResponse.json(
  {
    error:
      "OdinIQ could not import the invoice data.",
  },
  { status: 500 }
);
}
}