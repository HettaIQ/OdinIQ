import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

function makeReference() {
  const now = new Date();

  const date = now
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const time = now
    .toISOString()
    .slice(11, 19)
    .replace(/:/g, "");

  return `ST-${date}-${time}`;
}

export async function POST() {
  try {
    const { companyId } =
      await requireCompanyContext();

    /*
     * Prevent two live stocktakes being
     * accidentally started at the same time.
     */
    const existingOpenSession =
      await prisma.stocktakeSession.findFirst({
        where: {
          companyId,
          status: "OPEN",
        },

        select: {
          id: true,
          reference: true,
          startedAt: true,
        },

        orderBy: {
          startedAt: "desc",
        },
      });

    if (existingOpenSession) {
      return NextResponse.json(
        {
          error:
            "There is already an open stocktake.",
          session:
            existingOpenSession,
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Read every active warehouse location
     * in the configured walking order.
     *
     * Every product/location assignment is
     * included, even when the current location
     * quantity is zero.
     *
     * This is important because an allocated
     * bay must still be physically checked
     * during the stocktake.
     */
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
            where: {
              product: {
                active: true,
              },
            },

            select: {
              quantity: true,

              product: {
                select: {
                  id: true,
                  productCode: true,
                  description: true,
                  stockQuantity: true,
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

    const stockItemCount =
      locations.reduce(
        (total, location) =>
          total +
          location.stockItems.length,
        0
      );

    if (locations.length === 0) {
      return NextResponse.json(
        {
          error:
            "There are no active warehouse locations to stocktake.",
        },
        {
          status: 400,
        }
      );
    }

    if (stockItemCount === 0) {
      return NextResponse.json(
        {
          error:
            "There are no products assigned to warehouse locations.",
        },
        {
          status: 400,
        }
      );
    }

    const reference =
      makeReference();

    /*
     * Create the stocktake session and freeze
     * the expected quantities for every
     * product/location assignment.
     *
     * Example:
     *
     * Pipe XYZ allocated to A1-A6 creates
     * six separate stocktake lines.
     *
     * The warehouse team counts each bay.
     * Odin can later add those six physical
     * counts together for the product total.
     */
    const session =
      await prisma.$transaction(
        async (tx) => {
          const createdSession =
            await tx.stocktakeSession.create({
              data: {
                companyId,
                reference,
                status: "OPEN",
              },

              select: {
                id: true,
                reference: true,
                startedAt: true,
              },
            });

          for (const location of locations) {
            for (const stockItem of location.stockItems) {
              await tx.stocktakeLine.create({
                data: {
                  companyId,

                  stocktakeSessionId:
                    createdSession.id,

                  productId:
                    stockItem.product.id,

                  locationId:
                    location.id,

                  expectedSystemQuantity:
                    stockItem.product
                      .stockQuantity ?? null,

                  expectedLocationQuantity:
                    stockItem.quantity,
                },
              });
            }
          }

          return createdSession;
        }
      );

    /*
     * Build the blind stocktake workbook.
     *
     * Expected/system quantities are deliberately
     * NOT shown to the warehouse team.
     *
     * Physical Count rules:
     *
     * blank = not counted yet
     * 0     = checked and physically empty
     * > 0   = physical quantity counted
     */
    const rows: (
      | string
      | number
      | null
    )[][] = [];

    rows.push([
            "Location",
      "Product Code",
      "Product Description",
      "Physical Count",
      "Notes",
    ]);

    for (const location of locations) {
      const sortedStockItems =
        [...location.stockItems].sort(
          (a, b) =>
            a.product.productCode.localeCompare(
              b.product.productCode
            )
        );

      /*
       * Every product assigned to this location
       * receives its own physical-count row,
       * including assignments whose current
       * Odin location quantity is zero.
       */
      for (const stockItem of sortedStockItems) {
        rows.push([
                    location.code,
          stockItem.product.productCode,
          stockItem.product.description,
          "",
          "",
        ]);
      }

      /*
       * Keep completely empty warehouse
       * locations on the walking route.
       *
       * This reminds the warehouse team to
       * physically visit the bay even when Odin
       * currently has no product assigned there.
       */
      if (sortedStockItems.length === 0) {
        rows.push([
                    location.code,
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
      { wch: 14 },
      { wch: 24 },
      { wch: 58 },
      { wch: 18 },
      { wch: 40 },
    ];

    worksheet["!autofilter"] = {
             ref: `A1:E${Math.max(
        rows.length,
        1
      )}`,
    };

    /*
     * Freeze the heading row so it remains
     * visible while working down the sheet.
     */
    worksheet["!freeze"] = {
      xSplit: 0,
      ySplit: 1,
      topLeftCell: "A2",
      activePane: "bottomLeft",
      state: "frozen",
    };

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Blind Stocktake"
    );

    const instructions = [
      [
        "OdinIQ Warehouse Blind Stocktake",
      ],
      [],
      [
        "Stocktake Reference",
        session.reference,
      ],
      [
        "Started",
        session.startedAt.toISOString(),
      ],
      [],
      [
        "Purpose",
        "Physically count the stock held in every listed warehouse location without reference to Odin or accounting-system quantities.",
      ],
      [],
      [
        "Walking Route",
        "The Blind Stocktake sheet is arranged in OdinIQ's configured warehouse walking order. Work down the sheet bay by bay.",
      ],
      [
        "Every Listed Bay",
        "Every product/location row must be physically checked, including locations that appear to be empty.",
      ],
      [
        "Physical Count",
        "Enter the quantity physically counted in that exact location.",
      ],
      [
        "Empty Bay",
        "If the product is allocated to the location but there is physically no stock there, enter 0.",
      ],
      [
        "Blank Count",
        "Do not leave a completed location blank. A blank Physical Count means the row has not yet been counted.",
      ],
      [
        "Multiple Locations",
        "A product may appear in several locations. Count only the quantity physically present in the location shown on that row. Odin will calculate the product total from all counted locations.",
      ],
      [
        "Notes",
        "Record damaged stock, stock in the wrong bay, unidentified stock or anything else requiring investigation.",
      ],
      [],
      [
        "Important",
        "Do not estimate quantities and do not use Odin or accounting-system stock figures as a guide. Physically count each location.",
      ],
    ];

    const instructionsSheet =
      XLSX.utils.aoa_to_sheet(
        instructions
      );

    instructionsSheet["!cols"] = [
      { wch: 24 },
      { wch: 110 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      instructionsSheet,
      "Instructions"
    );

    /*
     * Hidden metadata sheet identifies the
     * exact frozen stocktake session.
     *
     * No expected stock quantities are included
     * in the workbook.
     */
    const metadataSheet =
      XLSX.utils.aoa_to_sheet([
        ["ODINIQ_STOCKTAKE"],
        ["Session ID", session.id],
        [
          "Reference",
          session.reference,
        ],
      ]);

    metadataSheet["!cols"] = [
      { wch: 24 },
      { wch: 40 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      metadataSheet,
      "_OdinIQ"
    );

    /*
     * Hide the metadata sheet from the normal
     * workbook view.
     */
    if (!workbook.Workbook) {
      workbook.Workbook = {};
    }

    workbook.Workbook.Sheets =
      workbook.SheetNames.map(
        (name) => ({
          name,
          Hidden:
            name === "_OdinIQ"
              ? 1
              : 0,
        })
      );

    const output = XLSX.write(
      workbook,
      {
        type: "buffer",
        bookType: "xlsx",
      }
    );

    return new NextResponse(output, {
      status: 200,

      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition":
          `attachment; filename="OdinIQ-Stocktake-${session.reference}.xlsx"`,

        "X-OdinIQ-Stocktake-Id":
          String(session.id),

        "X-OdinIQ-Stocktake-Reference":
          session.reference,

        "Cache-Control":
          "no-store",
      },
    });
  } catch (error) {
    console.error(
      "Start stocktake failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Odin could not start the stocktake.",
      },
      {
        status: 500,
      }
    );
  }
}