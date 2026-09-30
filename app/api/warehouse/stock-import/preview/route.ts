import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

function normalise(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function findHeadingIndex(
  row: unknown[],
  possibilities: string[]
) {
  return row.findIndex((value) =>
    possibilities.includes(normalise(value))
  );
}

export async function POST(request: Request) {
  try {
    const { companyId } =
      await requireCompanyContext();

    const formData =
      await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            "Please select a stock spreadsheet.",
        },
        {
          status: 400,
        }
      );
    }

    const fileName =
      file.name.toLowerCase();

    if (
      !fileName.endsWith(".xlsx") &&
      !fileName.endsWith(".xls") &&
      !fileName.endsWith(".csv")
    ) {
      return NextResponse.json(
        {
          error:
            "Please upload an Excel or CSV stock file.",
        },
        {
          status: 400,
        }
      );
    }

    const bytes =
      await file.arrayBuffer();

    const workbook = XLSX.read(bytes, {
      type: "array",
    });

    const firstSheetName =
      workbook.SheetNames[0];

    if (!firstSheetName) {
      return NextResponse.json(
        {
          error:
            "The spreadsheet does not contain a worksheet.",
        },
        {
          status: 400,
        }
      );
    }

    const sheet =
      workbook.Sheets[firstSheetName];

    const rawRows =
      XLSX.utils.sheet_to_json<unknown[]>(
        sheet,
        {
          header: 1,
          defval: null,
          raw: true,
        }
      );

    if (rawRows.length === 0) {
      return NextResponse.json(
        {
          error:
            "The spreadsheet is empty.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Xero reports can contain titles and
     * report information above the actual
     * stock table.
     *
     * Find the row containing both Item Code
     * and Closing Balance.
     */
    const headingRowIndex =
      rawRows.findIndex((row) => {
        const normalised =
          row.map(normalise);

        return (
          normalised.includes(
            "item code"
          ) &&
          normalised.includes(
            "closing balance"
          )
        );
      });

    if (headingRowIndex === -1) {
      return NextResponse.json(
        {
          error:
            "Odin could not find the Xero Item Code and Closing Balance headings in this spreadsheet.",
        },
        {
          status: 400,
        }
      );
    }

    const headingRow =
      rawRows[headingRowIndex];

    const itemCodeIndex =
      findHeadingIndex(headingRow, [
        "item code",
        "product code",
        "code",
        "itemcode",
      ]);

    const itemNameIndex =
      findHeadingIndex(headingRow, [
        "item name",
        "product name",
        "description",
        "name",
      ]);

    const closingBalanceIndex =
      findHeadingIndex(headingRow, [
        "closing balance",
        "quantity on hand",
        "qty on hand",
        "stock quantity",
        "stock",
      ]);

    if (
      itemCodeIndex === -1 ||
      closingBalanceIndex === -1
    ) {
      return NextResponse.json(
        {
          error:
            "Odin found the stock table but could not identify the required columns.",
        },
        {
          status: 400,
        }
      );
    }

    const products =
      await prisma.product.findMany({
        where: {
          companyId,
        },
        select: {
          id: true,
          productCode: true,
          description: true,
          stockQuantity: true,
        },
      });

    const productByCode =
      new Map(
        products.map((product) => [
          product.productCode
            .trim()
            .toUpperCase(),
          product,
        ])
      );

    /*
     * Everything beneath the detected heading
     * row is potential stock data.
     */
    const dataRows =
  rawRows.slice(
    headingRowIndex + 1
  );

const ignoredItemCodes = new Set([
  "TRACKED",
  "OPENING BALANCE",
  "CLOSING BALANCE",
  "PURCHASES",
  "COGS",
  "ADJUSTMENTS",
  "SALES",
  "TOTAL",
]);

const preview = dataRows
  .map((row, index) => {
        const itemCode = String(
          row[itemCodeIndex] ?? ""
        )
          .trim()
          .toUpperCase();

        if (
  !itemCode ||
  ignoredItemCodes.has(itemCode)
) {
  return null;
}

        const rawClosingBalance =
          row[closingBalanceIndex];

        let closingBalance: number | null =
          null;

        if (
          typeof rawClosingBalance ===
          "number"
        ) {
          closingBalance =
            Number.isFinite(
              rawClosingBalance
            )
              ? rawClosingBalance
              : null;
        } else {
          const cleaned = String(
            rawClosingBalance ?? ""
          )
            .replace(/,/g, "")
            .trim();

          if (cleaned !== "") {
            const parsed =
              Number(cleaned);

            closingBalance =
              Number.isFinite(parsed)
                ? parsed
                : null;
          }
        }

        const product =
          productByCode.get(itemCode);

        return {
          rowNumber:
            headingRowIndex +
            index +
            2,

          itemCode,

          itemName:
            itemNameIndex >= 0
              ? String(
                  row[
                    itemNameIndex
                  ] ?? ""
                ).trim()
              : "",

          closingBalance,

          matched:
            Boolean(product),

          productId:
            product?.id ?? null,

          odinDescription:
            product?.description ??
            null,

          previousStock:
            product?.stockQuantity ??
            null,
        };
      })
      .filter(
        (
          row
        ): row is NonNullable<
          typeof row
        > => row !== null
      );

    const validRows =
      preview.filter(
        (row) =>
          row.matched &&
          row.closingBalance !== null
      );
const changedRows =
  validRows.filter(
    (row) =>
      row.previousStock !==
      row.closingBalance
  );

const unchangedRows =
  validRows.filter(
    (row) =>
      row.previousStock ===
      row.closingBalance
  );
    const unmatchedRows =
      preview.filter(
        (row) => !row.matched
      );

    const invalidRows =
      preview.filter(
        (row) =>
          row.matched &&
          row.closingBalance === null
      );

    return NextResponse.json({
      success: true,

      fileName: file.name,
      sheetName: firstSheetName,

      headingRow:
        headingRowIndex + 1,

      detectedColumns: {
        itemCode: String(
          headingRow[
            itemCodeIndex
          ] ?? "Item Code"
        ),

        itemName:
          itemNameIndex >= 0
            ? String(
                headingRow[
                  itemNameIndex
                ]
              )
            : null,

        closingBalance: String(
          headingRow[
            closingBalanceIndex
          ] ?? "Closing Balance"
        ),
      },

      summary: {
  spreadsheetRows:
    preview.length,

  matched:
    validRows.length,

  changing:
    changedRows.length,

  unchanged:
    unchangedRows.length,

  unmatched:
    unmatchedRows.length,

  invalid:
    invalidRows.length,
},

      rows: preview,
    });
  } catch (error) {
    console.error(
      "Stock import preview failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown stock import error.",
      },
      {
        status: 500,
      }
    );
  }
}