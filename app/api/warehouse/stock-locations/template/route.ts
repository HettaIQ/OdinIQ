import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { companyId } =
      await requireCompanyContext();

    const products =
      await prisma.product.findMany({
        where: {
          companyId,
          active: true,
        },
        select: {
          productCode: true,
          description: true,
          stockQuantity: true,

          stockLocations: {
            select: {
              quantity: true,

              location: {
                select: {
                  code: true,
                },
              },
            },

            orderBy: {
              location: {
                code: "asc",
              },
            },
          },
        },

        orderBy: {
          productCode: "asc",
        },
      });

    const rows: (string | number | null)[][] =
      [];

    rows.push([
      "Product Code",
      "Description",
      "System Stock",
      "Current Location(s)",
      "Current Located Qty",
      "Location",
      "Location Qty",
    ]);

    for (const product of products) {
      const currentLocations =
        product.stockLocations
          .map(
            (stockLocation) =>
              stockLocation.location.code
          )
          .join(", ");

      const currentLocatedQty =
        product.stockLocations.reduce(
          (total, stockLocation) =>
            total +
            stockLocation.quantity,
          0
        );

      rows.push([
        product.productCode,
        product.description,
        product.stockQuantity ?? null,
        currentLocations,
        currentLocatedQty,
        "",
        "",
      ]);
    }

    const worksheet =
      XLSX.utils.aoa_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 22 },
      { wch: 55 },
      { wch: 14 },
      { wch: 28 },
      { wch: 20 },
      { wch: 18 },
      { wch: 16 },
    ];

    worksheet["!autofilter"] = {
      ref: `A1:G${rows.length}`,
    };

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Stock Locations"
    );

    const instructions = [
      [
        "OdinIQ Warehouse Location Import",
      ],
      [],
      [
        "Enter the warehouse location code in the Location column.",
      ],
      [
        "Enter the quantity stored at that location in the Location Qty column.",
      ],
      [
        "Do not change the Product Code.",
      ],
      [
        "If a product is stored in more than one location, duplicate that product row and enter the additional location and quantity.",
      ],
      [],
      [
        "System Stock is the current accounting/inventory stock quantity held in Odin.",
      ],
      [
        "Current Location(s) and Current Located Qty show any warehouse allocations already held in Odin.",
      ],
    ];

    const instructionsSheet =
      XLSX.utils.aoa_to_sheet(
        instructions
      );

    instructionsSheet["!cols"] = [
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
          `attachment; filename="OdinIQ-Stock-Locations-${date}.xlsx"`,

        "Cache-Control":
          "no-store",
      },
    });
  } catch (error) {
    console.error(
      "Stock location template download failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Odin could not create the stock location template.",
      },
      {
        status: 500,
      }
    );
  }
}