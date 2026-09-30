import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { companyId } =
      await requireCompanyContext();

    const locations =
      await prisma.warehouseLocation.findMany({
        where: {
          companyId,
          active: true,
        },

        select: {
          id: true,
          code: true,
          description: true,
          stocktakeOrder: true,

          stockItems: {
            select: {
              quantity: true,

              product: {
                select: {
                  productCode: true,
                  description: true,
                  active: true,
                },
              },
            },
          },
        },

        orderBy: [
          {
            stocktakeOrder: "asc",
          },
          {
            code: "asc",
          },
        ],
      });

    const workbook =
      XLSX.utils.book_new();

    const rows: (
      | string
      | number
      | null
    )[][] = [];

    /*
     * This is deliberately a blind stocktake.
     *
     * Warehouse staff must NOT see:
     * - System stock
     * - Expected location quantity
     * - Variance
     * - Stocktake order
     *
     * Stocktake order is only used behind the
     * scenes to arrange the walking route.
     */
    rows.push([
      "Location",
      "Location Description",
      "Product Code",
      "Product Description",
      "Physical Count",
      "Notes",
    ]);

    for (const location of locations) {
      const activeStockItems =
        location.stockItems
          .filter(
            (stockItem) =>
              stockItem.product.active
          )
          .sort((a, b) =>
            a.product.productCode.localeCompare(
              b.product.productCode
            )
          );

      for (const stockItem of activeStockItems) {
        rows.push([
          location.code,
          location.description ?? "",
          stockItem.product.productCode,
          stockItem.product.description,
          "",
          "",
        ]);
      }

      /*
       * Keep empty warehouse locations visible.
       * This means the stocktake team still
       * physically visits every configured bay.
       */
      if (activeStockItems.length === 0) {
        rows.push([
          location.code,
          location.description ?? "",
          "",
          "No products currently assigned",
          "",
          "",
        ]);
      }
    }

    const worksheet =
      XLSX.utils.aoa_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 30 },
      { wch: 22 },
      { wch: 58 },
      { wch: 18 },
      { wch: 40 },
    ];

    worksheet["!autofilter"] = {
      ref: `A1:F${Math.max(
        rows.length,
        1
      )}`,
    };

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Blind Stocktake"
    );

    /*
     * Keep the instructions deliberately free
     * of expected/system quantities too.
     */
    const instructions = [
      [
        "OdinIQ Warehouse Blind Stocktake",
      ],
      [],
      [
        "Purpose",
        "Count the physical stock held in each warehouse location without reference to the quantity held in the accounting system.",
      ],
      [],
      [
        "Walking Route",
        "The sheet has already been arranged in the warehouse stocktake walking order configured in OdinIQ.",
      ],
      [
        "Location",
        "Work through the locations from top to bottom in the order shown.",
      ],
      [
        "Physical Count",
        "Enter the quantity physically counted in that location.",
      ],
      [
        "Notes",
        "Record damaged stock, stock found in the wrong bay, unidentified items or anything else that needs investigation.",
      ],
      [],
      [
        "Multiple Locations",
        "A product may appear more than once if it is stored in more than one warehouse location. Count only the stock physically present in the location being checked.",
      ],
      [],
      [
        "Important",
        "Do not estimate a quantity. Physically count the stock in each location.",
      ],
    ];

    const instructionsSheet =
      XLSX.utils.aoa_to_sheet(
        instructions
      );

    instructionsSheet["!cols"] = [
      { wch: 22 },
      { wch: 110 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      instructionsSheet,
      "Instructions"
    );

    const output = XLSX.write(
      workbook,
      {
        type: "buffer",
        bookType: "xlsx",
      }
    );

    const date =
      new Date()
        .toISOString()
        .slice(0, 10);

    return new NextResponse(output, {
      status: 200,

      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition":
          `attachment; filename="OdinIQ-Blind-Stocktake-${date}.xlsx"`,

        "Cache-Control":
          "no-store",
      },
    });
  } catch (error) {
    console.error(
      "Blind stocktake download failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Odin could not create the warehouse stocktake.",
      },
      {
        status: 500,
      }
    );
  }
}