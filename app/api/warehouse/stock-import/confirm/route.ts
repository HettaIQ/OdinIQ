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
            "Odin could not find the Xero Item Code and Closing Balance headings.",
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

    const rows =
      rawRows.slice(
        headingRowIndex + 1
      );

    const updates: {
      productId: number;
      stockQuantity: number;
    }[] = [];

    let unmatched = 0;
    let invalid = 0;
    let unchanged = 0;

    for (const row of rows) {
      const itemCode = String(
        row[itemCodeIndex] ?? ""
      )
        .trim()
        .toUpperCase();

      if (
        !itemCode ||
        ignoredItemCodes.has(itemCode)
      ) {
        continue;
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

      if (!product) {
        unmatched += 1;
        continue;
      }

      if (closingBalance === null) {
        invalid += 1;
        continue;
      }

      if (
        product.stockQuantity ===
        closingBalance
      ) {
        unchanged += 1;
        continue;
      }

      updates.push({
        productId: product.id,
        stockQuantity:
          closingBalance,
      });
    }

    const importedAt = new Date();

    await prisma.$transaction(
      updates.map((update) =>
        prisma.product.update({
          where: {
            id: update.productId,
          },
          data: {
            stockQuantity:
              update.stockQuantity,

            stockQuantityUpdatedAt:
              importedAt,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,

      summary: {
        updated: updates.length,
        unchanged,
        unmatched,
        invalid,
      },

      importedAt:
        importedAt.toISOString(),
    });
  } catch (error) {
    console.error(
      "Stock import confirmation failed:",
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