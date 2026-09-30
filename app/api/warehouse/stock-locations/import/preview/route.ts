import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

type ParsedRow = {
  rowNumber: number;
  productCode: string;
  rawLocation: string;
  locations: string[];
};

type PreviewRow = {
  rowNumber: number;
  productId: number | null;
  productCode: string;
  description: string | null;
  rawLocation: string;
  locations: string[];
  status:
    | "READY"
    | "UNMATCHED_PRODUCT"
    | "INVALID_LOCATION";
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

    /*
     * Find the header row rather than
     * assuming it is row 1.
     *
     * Supports the user's current:
     *
     * *ItemCode
     * Location
     *
     * and more conventional:
     *
     * Product Code
     * Location
     */
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

    const parsedRows: ParsedRow[] =
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

      /*
       * Completely blank lines are
       * ignored.
       */
      if (
        !productCode &&
        !rawLocation
      ) {
        continue;
      }

      /*
       * This is essential for the
       * incremental warehouse mapping.
       *
       * A blank Location does NOT remove
       * or change anything in Odin.
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

        parsedRows.push({
          rowNumber:
            rowIndex + 1,
          productCode,
          rawLocation,
          locations,
        });
      } catch (error) {
        invalidRows.push({
          rowNumber:
            rowIndex + 1,
          productCode,
          rawLocation,
          message:
            error instanceof
            Error
              ? error.message
              : "Invalid warehouse location.",
        });
      }
    }

    const uniqueProductCodes =
      Array.from(
        new Set(
          parsedRows.map(
            (row) =>
              row.productCode
          )
        )
      );

    const products =
      uniqueProductCodes.length >
      0
        ? await prisma.product.findMany({
            where: {
              companyId,

              productCode: {
                in: uniqueProductCodes,
              },
            },

            select: {
              id: true,
              productCode: true,
              description: true,

              stockLocations: {
                where: {
                  companyId,
                },

                select: {
                  location: {
                    select: {
                      code: true,
                    },
                  },
                },
              },
            },
          })
        : [];

    const productByCode =
      new Map(
        products.map(
          (product) => [
            product.productCode,
            product,
          ]
        )
      );

    const previewRows: PreviewRow[] =
      parsedRows.map(
        (row) => {
          const product =
            productByCode.get(
              row.productCode
            );

          if (!product) {
            return {
              rowNumber:
                row.rowNumber,
              productId: null,
              productCode:
                row.productCode,
              description: null,
              rawLocation:
                row.rawLocation,
              locations:
                row.locations,
              status:
                "UNMATCHED_PRODUCT" as const,
            };
          }

          return {
            rowNumber:
              row.rowNumber,
            productId:
              product.id,
            productCode:
              product.productCode,
            description:
              product.description,
            rawLocation:
              row.rawLocation,
            locations:
              row.locations,
            status:
              "READY" as const,
          };
        }
      );

    const readyRows =
      previewRows.filter(
        (row) =>
          row.status ===
          "READY"
      );

    const unmatchedRows =
      previewRows.filter(
        (row) =>
          row.status ===
          "UNMATCHED_PRODUCT"
      );

    const uniqueLocations =
      Array.from(
        new Set(
          readyRows.flatMap(
            (row) =>
              row.locations
          )
        )
      ).sort(
        (a, b) =>
          a.localeCompare(
            b,
            undefined,
            {
              numeric: true,
            }
          )
      );

    /*
     * Count how many product/location
     * assignments are represented by
     * the spreadsheet.
     */
    const assignmentKeys =
      new Set<string>();

    for (
      const row of readyRows
    ) {
      for (
        const location of
        row.locations
      ) {
        assignmentKeys.add(
          `${row.productId}:${location}`
        );
      }
    }

    return NextResponse.json({
      success: true,

      fileName:
        file.name,

      summary: {
        spreadsheetRows:
          Math.max(
            0,
            rows.length -
              headerRowIndex -
              1
          ),

        blankLocationRows,

        rowsWithLocations:
          parsedRows.length,

        readyRows:
          readyRows.length,

        unmatchedProducts:
          unmatchedRows.length,

        invalidRows:
          invalidRows.length,

        uniqueLocations:
          uniqueLocations.length,

        productLocationAssignments:
          assignmentKeys.size,
      },

      rows:
        previewRows,

      invalidRows,

      uniqueLocations,
    });
  } catch (error) {
    console.error(
      "Warehouse location import preview error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to preview the warehouse location spreadsheet.",
      },
      {
        status: 500,
      }
    );
  }
}