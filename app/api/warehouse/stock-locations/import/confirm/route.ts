import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

type ParsedAssignment = {
  rowNumber: number;
  productCode: string;
  locationCode: string;
};

function cleanText(
  value: unknown
) {
  return String(
    value ?? ""
  ).trim();
}

function normaliseHeader(
  value: unknown
) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function compactLocation(
  value: string
) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function cleanLocationName(
  value: string
) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

/*
 * Expands genuine warehouse bay notation:
 *
 * D1-D10
 * D1 - D10
 * D1-10
 * C8-C12 / C26-C30 / C46-C48
 * E2 / E20 / E38
 *
 * Named warehouse areas are preserved:
 *
 * FITTINGS S
 * FITTINGS S D11
 * HEATMISER STAND
 *
 * This means spaces are only removed while
 * recognising genuine simple bay codes/ranges.
 * They are NOT removed from named locations.
 */
function expandLocations(
  rawValue: string
): string[] {
  const cleaned =
    rawValue
      .toUpperCase()
      .replace(/[–—]/g, "-")
      .trim();

  if (!cleaned) {
    return [];
  }

  /*
   * Slash, comma and semicolon separate
   * independent locations.
   *
   * Example:
   *
   * E2 / E20 / E38
   *
   * FITTINGS S D11 / FITTINGS S D12
   */
  const parts =
    cleaned
      .split(/[\/,;]+/)
      .map((part) =>
        part.trim()
      )
      .filter(Boolean);

  const expanded: string[] = [];

  for (const part of parts) {
    const readable =
      cleanLocationName(part);

    const compact =
      compactLocation(part);

    if (!compact) {
      continue;
    }

    /*
     * Genuine full bay range:
     *
     * D1-D10
     * D1 - D10
     * C08-C12
     *
     * Both sides must use the same
     * alphabetical prefix.
     */
    const rangeMatch =
      compact.match(
        /^([A-Z]+)(\d+)-([A-Z]+)(\d+)$/
      );

    if (rangeMatch) {
      const [
        ,
        startPrefix,
        startNumberText,
        endPrefix,
        endNumberText,
      ] = rangeMatch;

      if (
        startPrefix !==
        endPrefix
      ) {
        throw new Error(
          `Invalid location range "${part}". Range prefixes must match.`
        );
      }

      const startNumber =
        Number(
          startNumberText
        );

      const endNumber =
        Number(
          endNumberText
        );

      if (
        !Number.isInteger(
          startNumber
        ) ||
        !Number.isInteger(
          endNumber
        ) ||
        startNumber < 0 ||
        endNumber < startNumber
      ) {
        throw new Error(
          `Invalid location range "${part}".`
        );
      }

      if (
        endNumber -
          startNumber >
        500
      ) {
        throw new Error(
          `Location range "${part}" is too large.`
        );
      }


      for (
        let number =
          startNumber;
        number <=
        endNumber;
        number += 1
      ) {
        expanded.push(
  `${startPrefix}${number}`
);
      }

      continue;
    }

    /*
     * Genuine shorthand bay range:
     *
     * D1-10
     * D1 - 10
     *
     * means D1-D10.
     */
    const shortRangeMatch =
      compact.match(
        /^([A-Z]+)(\d+)-(\d+)$/
      );

    if (
      shortRangeMatch
    ) {
      const [
        ,
        prefix,
        startNumberText,
        endNumberText,
      ] = shortRangeMatch;

      const startNumber =
        Number(
          startNumberText
        );

      const endNumber =
        Number(
          endNumberText
        );

      if (
        !Number.isInteger(
          startNumber
        ) ||
        !Number.isInteger(
          endNumber
        ) ||
        startNumber < 0 ||
        endNumber < startNumber
      ) {
        throw new Error(
          `Invalid location range "${part}".`
        );
      }

      if (
        endNumber -
          startNumber >
        500
      ) {
        throw new Error(
          `Location range "${part}" is too large.`
        );
      }


      for (
        let number =
          startNumber;
        number <=
        endNumber;
        number += 1
      ) {
        expanded.push(
  `${prefix}${number}`
);
      }

      continue;
    }

    /*
     * A simple bay code has no spaces:
     *
     * A1
     * D10
     * BAY1
     * RACK12
     *
     * These are stored in compact form.
     */
    const simpleBayMatch =
  compact.match(
    /^([A-Z]+)(\d+)$/
  );

if (
  simpleBayMatch &&
  !/\s/.test(readable)
) {
  const [
    ,
    prefix,
    numberText,
  ] = simpleBayMatch;

  expanded.push(
    `${prefix}${Number(
      numberText
    )}`
  );

  continue;
}

if (
  /^[A-Z][A-Z0-9_-]*$/.test(
    compact
  ) &&
  !/\s/.test(readable)
) {
  expanded.push(
    compact
  );

  continue;
}

    /*
     * Anything containing spaces is treated
     * as a named warehouse location.
     *
     * Examples:
     *
     * FITTINGS S
     * FITTINGS S D11
     * HEATMISER STAND
     *
     * Preserve the spaces so the warehouse
     * team sees meaningful physical areas.
     */
    if (
      /^[A-Z0-9][A-Z0-9 _-]*$/.test(
        readable
      )
    ) {
      expanded.push(
        readable
      );

      continue;
    }

    throw new Error(
      `Invalid location "${part}".`
    );
  }

  return Array.from(
    new Set(expanded)
  );
}

function naturalLocationSort(
  a: string,
  b: string
) {
  return a.localeCompare(
    b,
    undefined,
    {
      numeric: true,
      sensitivity: "base",
    }
  );
}

export async function POST(
  request: Request
) {
  try {
    const { companyId } =
      await requireCompanyContext();

    const formData =
      await request.formData();

    const file =
      formData.get("file");

    if (
      !(file instanceof File)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please choose a spreadsheet to upload.",
        },
        {
          status: 400,
        }
      );
    }

    const fileName =
      file.name.toLowerCase();

    if (
      !fileName.endsWith(
        ".xlsx"
      ) &&
      !fileName.endsWith(
        ".xls"
      ) &&
      !fileName.endsWith(
        ".csv"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please upload an Excel or CSV file.",
        },
        {
          status: 400,
        }
      );
    }

    const buffer =
      Buffer.from(
        await file.arrayBuffer()
      );

    const workbook =
      XLSX.read(buffer, {
        type: "buffer",
      });

    const firstSheetName =
      workbook.SheetNames[0];

    if (!firstSheetName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The spreadsheet does not contain a worksheet.",
        },
        {
          status: 400,
        }
      );
    }

    const worksheet =
      workbook.Sheets[
        firstSheetName
      ];

    const rows =
      XLSX.utils.sheet_to_json<
        unknown[]
      >(worksheet, {
        header: 1,
        defval: "",
        raw: false,
      });

    if (
      rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The spreadsheet is empty.",
        },
        {
          status: 400,
        }
      );
    }

    let headerRowIndex =
      -1;

    let productCodeColumn =
      -1;

    let locationColumn =
      -1;

    for (
      let rowIndex = 0;
      rowIndex <
      Math.min(
        rows.length,
        30
      );
      rowIndex += 1
    ) {
      const row =
        rows[rowIndex] ??
        [];

      const headers =
        row.map(
          normaliseHeader
        );

      const possibleProductCodeColumn =
        headers.findIndex(
          (header) =>
            header ===
              "itemcode" ||
            header ===
              "productcode" ||
            header ===
              "code"
        );

      const possibleLocationColumn =
        headers.findIndex(
          (header) =>
            header ===
            "location"
        );

      if (
        possibleProductCodeColumn >=
          0 &&
        possibleLocationColumn >=
          0
      ) {
        headerRowIndex =
          rowIndex;

        productCodeColumn =
          possibleProductCodeColumn;

        locationColumn =
          possibleLocationColumn;

        break;
      }
    }

    if (
      headerRowIndex < 0 ||
      productCodeColumn <
        0 ||
      locationColumn < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Could not find the "Item Code/Product Code" and "Location" columns.',
        },
        {
          status: 400,
        }
      );
    }

    const assignments:
      ParsedAssignment[] =
      [];

    const invalidRows: Array<{
      rowNumber: number;
      productCode: string;
      rawLocation: string;
      message: string;
    }> = [];

    let blankLocationRows =
      0;

    for (
      let rowIndex =
        headerRowIndex + 1;
      rowIndex <
      rows.length;
      rowIndex += 1
    ) {
      const row =
        rows[rowIndex] ??
        [];

      const productCode =
        cleanText(
          row[
            productCodeColumn
          ]
        );

      const rawLocation =
        cleanText(
          row[
            locationColumn
          ]
        );

      if (
        !productCode &&
        !rawLocation
      ) {
        continue;
      }

      /*
       * Blank location means:
       *
       * do nothing.
       *
       * This is what allows Batch 1
       * today and Batch 2 tomorrow.
       */
      if (!rawLocation) {
        blankLocationRows +=
          1;

        continue;
      }

      if (!productCode) {
        invalidRows.push({
          rowNumber:
            rowIndex + 1,
          productCode: "",
          rawLocation,
          message:
            "Location supplied without a product code.",
        });

        continue;
      }

      try {
        const locations =
          expandLocations(
            rawLocation
          );

        if (
          locations.length ===
          0
        ) {
          invalidRows.push({
            rowNumber:
              rowIndex + 1,
            productCode,
            rawLocation,
            message:
              "No valid warehouse locations were found.",
          });

          continue;
        }

        for (
          const locationCode of
          locations
        ) {
          assignments.push({
            rowNumber:
              rowIndex + 1,
            productCode,
            locationCode,
          });
        }
      } catch (error) {
        invalidRows.push({
          rowNumber:
            rowIndex + 1,
          productCode,
          rawLocation,
          message:
            error instanceof Error
              ? error.message
              : "Invalid warehouse location.",
        });
      }
    }

    /*
     * Do not confirm a file containing
     * invalid populated rows.
     *
     * Blank locations are fine because
     * they are intentionally ignored.
     */
    if (
      invalidRows.length >
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The spreadsheet contains invalid location rows. Correct them and preview the file again before confirming.",
          invalidRows,
        },
        {
          status: 400,
        }
      );
    }

    if (
      assignments.length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "There are no populated warehouse locations to import.",
        },
        {
          status: 400,
        }
      );
    }

    const uniqueProductCodes =
      Array.from(
        new Set(
          assignments.map(
            (assignment) =>
              assignment.productCode
          )
        )
      );

    const products =
      await prisma.product.findMany({
        where: {
          companyId,

          productCode: {
            in: uniqueProductCodes,
          },
        },

        select: {
          id: true,
          productCode: true,
        },
      });

    const productByCode =
      new Map(
        products.map(
          (product) => [
            product.productCode,
            product,
          ]
        )
      );

    const unmatchedProducts =
      uniqueProductCodes.filter(
        (productCode) =>
          !productByCode.has(
            productCode
          )
      );

    /*
     * A populated location row with an
     * unknown product is treated as an
     * error rather than silently skipped.
     *
     * This prevents typos from appearing
     * to have imported successfully.
     */
    if (
      unmatchedProducts.length >
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Some populated rows contain product codes that do not exist in Odin.",
          unmatchedProducts,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Deduplicate product/location pairs.
     */
    const uniqueAssignments =
      new Map<
        string,
        {
          productId: number;
          productCode: string;
          locationCode: string;
        }
      >();

    for (
      const assignment of
      assignments
    ) {
      const product =
        productByCode.get(
          assignment.productCode
        );

      if (!product) {
        continue;
      }

      const key =
        `${product.id}:${assignment.locationCode}`;

      uniqueAssignments.set(
        key,
        {
          productId:
            product.id,
          productCode:
            product.productCode,
          locationCode:
            assignment.locationCode,
        }
      );
    }

    const locationCodes =
      Array.from(
        new Set(
          Array.from(
            uniqueAssignments.values()
          ).map(
            (assignment) =>
              assignment.locationCode
          )
        )
      ).sort(
        naturalLocationSort
      );

    const result =
      await prisma.$transaction(
        async (tx) => {
          const existingLocations =
            await tx.warehouseLocation.findMany({
              where: {
                companyId,

                code: {
                  in: locationCodes,
                },
              },

              select: {
                id: true,
                code: true,
                active: true,
              },
            });

          const locationByCode =
            new Map(
              existingLocations.map(
                (location) => [
                  location.code,
                  location,
                ]
              )
            );

          let createdLocations =
            0;

          let reactivatedLocations =
            0;

          /*
           * Get the end of the current
           * stocktake walking order.
           */
          const lastLocation =
            await tx.warehouseLocation.findFirst({
              where: {
                companyId,
              },

              orderBy: [
                {
                  stocktakeOrder:
                    "desc",
                },
                {
                  code: "desc",
                },
              ],

              select: {
                stocktakeOrder:
                  true,
              },
            });

          let nextStocktakeOrder =
            (
              lastLocation
                ?.stocktakeOrder ??
              0
            ) + 10;

          /*
           * Create missing locations in
           * natural order.
           *
           * D2 therefore comes before
           * D10.
           */
          for (
            const code of
            locationCodes
          ) {
            const existing =
              locationByCode.get(
                code
              );

            if (existing) {
              if (
                !existing.active
              ) {
                const reactivated =
                  await tx.warehouseLocation.update({
                    where: {
                      id: existing.id,
                    },

                    data: {
                      active: true,
                    },

                    select: {
                      id: true,
                      code: true,
                      active: true,
                    },
                  });

                locationByCode.set(
                  code,
                  reactivated
                );

                reactivatedLocations +=
                  1;
              }

              continue;
            }

            const created =
              await tx.warehouseLocation.create({
                data: {
                  companyId,
                  code,
                  stocktakeOrder:
                    nextStocktakeOrder,
                  active: true,
                },

                select: {
                  id: true,
                  code: true,
                  active: true,
                },
              });

            nextStocktakeOrder +=
              10;

            locationByCode.set(
              code,
              created
            );

            createdLocations +=
              1;
          }

          let createdAssignments =
            0;

          let existingAssignments =
            0;

          /*
           * Incremental import:
           *
           * existing assignments are
           * left untouched.
           *
           * missing assignments are
           * created with quantity 0.
           *
           * Nothing is deleted.
           */
          for (
            const assignment of
            uniqueAssignments.values()
          ) {
            const location =
              locationByCode.get(
                assignment.locationCode
              );

            if (!location) {
              throw new Error(
                `Warehouse location ${assignment.locationCode} could not be resolved.`
              );
            }

            const existingAssignment =
              await tx.productStockLocation.findUnique({
                where: {
                  companyId_productId_locationId:
                    {
                      companyId,
                      productId:
                        assignment.productId,
                      locationId:
                        location.id,
                    },
                },

                select: {
                  id: true,
                },
              });

            if (
              existingAssignment
            ) {
              existingAssignments +=
                1;

              continue;
            }

            await tx.productStockLocation.create({
              data: {
                companyId,

                productId:
                  assignment.productId,

                locationId:
                  location.id,

                quantity: 0,
              },
            });

            createdAssignments +=
              1;
          }

          return {
            createdLocations,
            reactivatedLocations,
            createdAssignments,
            existingAssignments,
          };
        }
      );

    return NextResponse.json({
      success: true,

      message:
        "Warehouse locations imported successfully.",

      fileName:
        file.name,

      summary: {
        blankLocationRows,

        productsWithLocations:
          uniqueProductCodes.length,

        uniqueLocations:
          locationCodes.length,

        productLocationAssignments:
          uniqueAssignments.size,

        createdLocations:
          result.createdLocations,

        reactivatedLocations:
          result.reactivatedLocations,

        createdAssignments:
          result.createdAssignments,

        existingAssignments:
          result.existingAssignments,
      },
    });
  } catch (error) {
    console.error(
      "Warehouse location import confirm error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to import warehouse locations.",
      },
      {
        status: 500,
      }
    );
  }
}