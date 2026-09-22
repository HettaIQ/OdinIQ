import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";
import { prisma } from "@/lib/prisma";

type GdnImportRow = {
  "GDNItem.GDNNumber"?: string | number;
  "GDNItem.Date"?: string;
  "GDNItem.AccountReference"?: string;
  "CustomerRecord.AccountName"?: string;
  "GDNItem.SalesOrderNumber"?: string | number;
  "GDNItem.ItemNumber"?: string | number;
  "GDNItem.QuantityOnOrder"?: string | number;
  "GDNItem.ProductAccountReference"?: string;
  "ProductRecord.PartNumber"?: string;
  "GDNItem.Description"?: string;
  "GDNItem.QuantityDespatched"?: string | number;
};

function toNumber(value: unknown) {
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

function textOrNull(value: unknown) {
  const text = String(value ?? "").trim();

  return text || null;
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

  const first = Number(match[1]);
  const second = Number(match[2]);

  let year = Number(match[3]);

  if (year < 100) {
    year += 2000;
  }

  let day: number;
  let month: number;

  /*
   * Sage Data to Excel has previously returned
   * GDN dates in month/day/year format.
   *
   * Where the date is unambiguous, detect it.
   * Ambiguous dates retain the known GDN
   * report behaviour of MM/DD/YYYY.
   */
  if (first > 12) {
    day = first;
    month = second;
  } else if (second > 12) {
    month = first;
    day = second;
  } else {
    month = first;
    day = second;
  }

  return new Date(
    Date.UTC(year, month - 1, day)
  );
}

export async function POST(
  request: Request
) {
  try {
    const context =
  await getApiCompanyContext();

if (
  context.status ===
  "UNAUTHENTICATED"
) {
  return NextResponse.json(
    {
      error:
        "You must be signed in.",
    },
    { status: 401 }
  );
}

if (
  context.status ===
  "NO_COMPANY"
) {
  return NextResponse.json(
    {
      error:
        "No active company membership found.",
    },
    { status: 403 }
  );
}

const {
  user,
  membership,
  companyId,
} = context;

const canImport =
  user.platformRole === "SUPER_ADMIN" ||
  Boolean(
    membership.role?.permissions.some(
      ({ permission }) =>
        permission.key === "imports.manage",
    ),
  );

    if (!canImport) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to import GDN data.",
        },
        { status: 403 }
      );
    }

    const body =
      await request.json();

    const rows = Array.isArray(body.rows)
      ? (body.rows as GdnImportRow[])
      : [];

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "No GDN rows were supplied.",
        },
        { status: 400 }
      );
    }

    const groupedRows = new Map<
      string,
      GdnImportRow[]
    >();

    for (const row of rows) {
      const gdnNumber = String(
        row["GDNItem.GDNNumber"] ?? ""
      ).trim();

      if (!gdnNumber) {
        continue;
      }

      const existing =
        groupedRows.get(gdnNumber) ?? [];

      existing.push(row);

      groupedRows.set(
        gdnNumber,
        existing
      );
    }

    if (groupedRows.size === 0) {
      return NextResponse.json(
        {
          error:
            "No valid GDN numbers were found in the supplied rows.",
        },
        { status: 400 }
      );
    }

    let importedGdns = 0;
    let importedLines = 0;
    let preservedExistingLines = 0;

    for (
      const [
        gdnNumber,
        gdnRows,
      ] of groupedRows
    ) {
      const existingGdn =
        await prisma.goodsDespatchNote.findUnique(
          {
            where: {
              companyId_gdnNumber: {
                companyId,
                gdnNumber,
              },
            },
            include: {
              lines: true,
            },
          }
        );

      const firstRow = gdnRows[0];

      const importedSalesOrderNumber =
        textOrNull(
          firstRow[
            "GDNItem.SalesOrderNumber"
          ]
        );

      const importedCustomerAccountCode =
        textOrNull(
          firstRow[
            "GDNItem.AccountReference"
          ]
        );

      const importedCustomerName =
        textOrNull(
          firstRow[
            "CustomerRecord.AccountName"
          ]
        );

      const importedGdnDate =
        parseSageDate(
          firstRow["GDNItem.Date"]
        );

      /*
       * Never let missing fields in a later
       * import erase populated GDN data that
       * OdinIQ already holds.
       */
      const salesOrderNumber =
        importedSalesOrderNumber ??
        existingGdn
          ?.salesOrderNumber ??
        null;

      const customerAccountCode =
        importedCustomerAccountCode ??
        existingGdn
          ?.customerAccountCode ??
        null;

      const customerName =
        importedCustomerName ??
        existingGdn
          ?.customerName ??
        null;

      const gdnDate =
        importedGdnDate ??
        existingGdn?.gdnDate ??
        null;

      const lineData = gdnRows
        .map((row) => {
          const stockCode =
            textOrNull(
              row[
                "GDNItem.ProductAccountReference"
              ]
            );

          const partNumber =
            textOrNull(
              row[
                "ProductRecord.PartNumber"
              ]
            ) ??
            stockCode;

          const description =
            textOrNull(
              row[
                "GDNItem.Description"
              ]
            );

          const lineNumber =
            toNumber(
              row[
                "GDNItem.ItemNumber"
              ]
            );

          const quantityOrdered =
            toNumber(
              row[
                "GDNItem.QuantityOnOrder"
              ]
            );

          const quantityDespatched =
            toNumber(
              row[
                "GDNItem.QuantityDespatched"
              ]
            );

          return {
            lineNumber,
            stockCode,
            partNumber,
            description,
            quantityOrdered,
            quantityDespatched,
          };
        })
        .filter((line) => {
          /*
           * Completely blank rows are not
           * genuine GDN lines.
           */
          return (
            line.stockCode !== null ||
            line.partNumber !== null ||
            line.description !== null ||
            line.lineNumber !== null ||
            line.quantityOrdered !== null ||
            line.quantityDespatched !== null
          );
        });

      /*
       * Only replace existing GDN lines when
       * the incoming import genuinely contains
       * detailed line information.
       *
       * A header-only or incomplete import
       * must not wipe good line data.
       */
      const hasDetailedLines =
        lineData.length > 0;

      if (existingGdn) {
        await prisma.goodsDespatchNote.update({
          where: {
            id: existingGdn.id,
          },
          data: {
            salesOrderNumber,
            gdnDate,
            customerAccountCode,
            customerName,

            ...(hasDetailedLines
              ? {
                  lines: {
                    deleteMany: {},
                    create: lineData,
                  },
                }
              : {}),
          },
        });

        if (!hasDetailedLines) {
          preservedExistingLines +=
            existingGdn.lines.length;
        }
      } else {
        await prisma.goodsDespatchNote.create({
          data: {
            companyId,
            gdnNumber,
            salesOrderNumber,
            gdnDate,
            customerAccountCode,
            customerName,

            ...(hasDetailedLines
              ? {
                  lines: {
                    create: lineData,
                  },
                }
              : {}),
          },
        });
      }

      importedGdns++;

      if (hasDetailedLines) {
        importedLines +=
          lineData.length;
      }
    }

    /*
     * Refresh OdinIQ pages after new GDN
     * data has been written.
     */
    revalidatePath(
      "/commercial/customers",
      "layout"
    );

    revalidatePath(
      "/despatch-audit",
      "layout"
    );

    return NextResponse.json({
      success: true,
      gdnCount:
        importedGdns,
      lineCount:
        importedLines,
      preservedExistingLineCount:
        preservedExistingLines,
    });
  } catch (error) {
    console.error(
      "GDN import failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "OdinIQ could not import the GDN data.",
      },
      { status: 500 }
    );
  }
}