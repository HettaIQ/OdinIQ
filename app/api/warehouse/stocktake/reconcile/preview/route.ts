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

function readNumber(
  value: unknown
): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null;
  }

  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .trim();

  if (cleaned === "") {
    return null;
  }

  const parsed = Number(cleaned);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

type UploadedCount = {
  rowNumber: number;
  productCode: string;
  locationCode: string;
  physicalCount: number;
  notes: string;
  removeFromList: boolean;
};

type IssueRow = {
  rowNumber: number;
  productCode: string;
  location: string;
  value?: string;
};

export async function POST(
  request: Request
) {
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
            "Please select a completed stocktake spreadsheet.",
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
      !fileName.endsWith(".xls")
    ) {
      return NextResponse.json(
        {
          error:
            "Please upload the completed OdinIQ Excel stocktake workbook.",
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

    /*
     * -------------------------------------------------
     * IDENTIFY THE STOCKTAKE SESSION
     * -------------------------------------------------
     *
     * New OdinIQ stocktakes contain a hidden
     * _OdinIQ worksheet. This ties the returned
     * count to the exact frozen snapshot created
     * when Start Stocktake was clicked.
     */
    const metadataSheet =
      workbook.Sheets["_OdinIQ"];

    if (!metadataSheet) {
      return NextResponse.json(
        {
          error:
            "This workbook does not contain an OdinIQ stocktake session. Please upload the workbook created by Start Stocktake.",
        },
        {
          status: 400,
        }
      );
    }

    const metadataRows =
      XLSX.utils.sheet_to_json<unknown[]>(
        metadataSheet,
        {
          header: 1,
          defval: null,
          raw: true,
        }
      );

    const marker =
      String(
        metadataRows[0]?.[0] ?? ""
      ).trim();

    if (marker !== "ODINIQ_STOCKTAKE") {
      return NextResponse.json(
        {
          error:
            "The OdinIQ stocktake metadata is not valid.",
        },
        {
          status: 400,
        }
      );
    }

    const sessionIdRow =
      metadataRows.find(
        (row) =>
          normalise(row[0]) ===
          "session id"
      );

    const referenceRow =
      metadataRows.find(
        (row) =>
          normalise(row[0]) ===
          "reference"
      );

    const sessionId = Number(
      sessionIdRow?.[1]
    );

    const workbookReference =
      String(
        referenceRow?.[1] ?? ""
      ).trim();

    if (
      !Number.isInteger(sessionId) ||
      sessionId <= 0 ||
      !workbookReference
    ) {
      return NextResponse.json(
        {
          error:
            "The OdinIQ stocktake session information is incomplete.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Load the session and its frozen lines.
     *
     * This is now our source of truth for
     * reconciliation — NOT live stock.
     */
    const session =
      await prisma.stocktakeSession.findFirst({
        where: {
          id: sessionId,
          companyId,
        },

        select: {
          id: true,
          reference: true,
          status: true,
          startedAt: true,
          completedAt: true,

          lines: {
            select: {
              id: true,

              expectedSystemQuantity:
                true,

              expectedLocationQuantity:
                true,

              physicalCount: true,
              notes: true,

              product: {
                select: {
                  id: true,
                  productCode: true,
                  description: true,
                  stockQuantity: true,
                },
              },

              location: {
                select: {
                  id: true,
                  code: true,
                  description: true,
                },
              },
            },
          },
        },
      });

    if (!session) {
      return NextResponse.json(
        {
          error:
            "Odin could not find the stocktake session linked to this workbook.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      session.reference !==
      workbookReference
    ) {
      return NextResponse.json(
        {
          error:
            "The stocktake reference in the workbook does not match the OdinIQ stocktake session.",
        },
        {
          status: 400,
        }
      );
    }

    if (session.status !== "OPEN") {
      return NextResponse.json(
        {
          error:
            `Stocktake ${session.reference} is ${session.status} and cannot be previewed as an open stocktake.`,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * -------------------------------------------------
     * READ THE BLIND STOCKTAKE SHEET
     * -------------------------------------------------
     */

    const stocktakeSheetName =
      workbook.SheetNames.find(
        (name) =>
          name !== "_OdinIQ" &&
          normalise(name) ===
            "blind stocktake"
      ) ??
      workbook.SheetNames.find(
        (name) =>
          name !== "_OdinIQ" &&
          name !== "Instructions"
      );

    if (!stocktakeSheetName) {
      return NextResponse.json(
        {
          error:
            "Odin could not find the Blind Stocktake worksheet.",
        },
        {
          status: 400,
        }
      );
    }

    const stocktakeSheet =
      workbook.Sheets[
        stocktakeSheetName
      ];

    const rawRows =
      XLSX.utils.sheet_to_json<unknown[]>(
        stocktakeSheet,
        {
          header: 1,
          defval: null,
          raw: true,
        }
      );

    const headingRowIndex =
      rawRows.findIndex((row) => {
        const headings =
          row.map(normalise);

        return (
          headings.includes("location") &&
          headings.includes(
            "product code"
          ) &&
          headings.includes(
            "physical count"
          )
        );
      });

    if (headingRowIndex === -1) {
      return NextResponse.json(
        {
          error:
            "Odin could not find the Location, Product Code and Physical Count headings.",
        },
        {
          status: 400,
        }
      );
    }

    const headingRow =
      rawRows[headingRowIndex];

    const locationIndex =
      findHeadingIndex(headingRow, [
        "location",
        "warehouse location",
        "bay",
      ]);

    const productCodeIndex =
      findHeadingIndex(headingRow, [
        "product code",
        "item code",
        "code",
      ]);

    const physicalCountIndex =
      findHeadingIndex(headingRow, [
        "physical count",
        "count",
        "counted quantity",
        "counted qty",
      ]);

    const notesIndex =
      findHeadingIndex(headingRow, [
        "notes",
        "comments",
        "comment",
      ]);

    if (
      locationIndex === -1 ||
      productCodeIndex === -1 ||
      physicalCountIndex === -1
    ) {
      return NextResponse.json(
        {
          error:
            "Odin found the stocktake table but could not identify the required columns.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Build a map of the frozen stocktake
     * lines. Only Product + Location pairs
     * that were part of the original session
     * are valid.
     */
    const snapshotByKey =
      new Map(
        session.lines.map((line) => [
          `${
            line.location.code
              .trim()
              .toUpperCase()
          }::${
            line.product.productCode
              .trim()
              .toUpperCase()
          }`,
          line,
        ])
      );

    const uploadedCounts:
      UploadedCount[] = [];

    const uncountedRows:
      IssueRow[] = [];

    const unmatchedProducts:
      IssueRow[] = [];

    const unknownLocations:
      IssueRow[] = [];

    const invalidRows:
      IssueRow[] = [];

    const duplicateRows:
      IssueRow[] = [];

    const unexpectedRows:
      IssueRow[] = [];

    const seenKeys =
      new Set<string>();

    const snapshotProductCodes =
      new Set(
        session.lines.map((line) =>
          line.product.productCode
            .trim()
            .toUpperCase()
        )
      );

    const snapshotLocationCodes =
      new Set(
        session.lines.map((line) =>
          line.location.code
            .trim()
            .toUpperCase()
        )
      );

    const dataRows =
      rawRows.slice(
        headingRowIndex + 1
      );

    for (
      let index = 0;
      index < dataRows.length;
      index += 1
    ) {
      const row = dataRows[index];

      const rowNumber =
        headingRowIndex +
        index +
        2;

      const locationCode =
        String(
          row[locationIndex] ?? ""
        )
          .trim()
          .toUpperCase();

      const productCode =
        String(
          row[
            productCodeIndex
          ] ?? ""
        )
          .trim()
          .toUpperCase();

      /*
       * Empty-product rows represent empty
       * locations in the walking route.
       */
      if (!productCode) {
        continue;
      }

      if (
        !snapshotProductCodes.has(
          productCode
        )
      ) {
        unmatchedProducts.push({
          rowNumber,
          productCode,
          location: locationCode,
        });

        continue;
      }

      if (
        !snapshotLocationCodes.has(
          locationCode
        )
      ) {
        unknownLocations.push({
          rowNumber,
          productCode,
          location: locationCode,
        });

        continue;
      }

      const key =
        `${locationCode}::${productCode}`;

      /*
       * A known product moved into another
       * location after the stocktake started
       * must not silently become part of the
       * original snapshot.
       */
      

      if (seenKeys.has(key)) {
        duplicateRows.push({
          rowNumber,
          productCode,
          location: locationCode,
        });

        continue;
      }

      seenKeys.add(key);

      const rawPhysicalCount =
        row[physicalCountIndex];

      if (
        rawPhysicalCount === null ||
        rawPhysicalCount === undefined ||
        String(
          rawPhysicalCount
        ).trim() === ""
      ) {
        uncountedRows.push({
          rowNumber,
          productCode,
          location: locationCode,
        });

        continue;
      }

      const physicalCount =
        readNumber(
          rawPhysicalCount
        );

      if (
        physicalCount === null ||
        physicalCount < 0
      ) {
        invalidRows.push({
          rowNumber,
          productCode,
          location: locationCode,
          value: String(
            rawPhysicalCount ?? ""
          ),
        });

        continue;
      }

      const notes =
        notesIndex >= 0
          ? String(
              row[notesIndex] ?? ""
            ).trim()
          : "";

          const removeFromList =
  normalise(notes) === "remove from list";

      uploadedCounts.push({
  rowNumber,
  productCode,
  locationCode,
  physicalCount,
  notes,
  removeFromList,
});
    }

    /*
     * Also detect snapshot lines that have
     * disappeared completely from the
     * returned workbook.
     */
    const missingRows =
      session.lines
        .filter((line) => {
          const key =
            `${
              line.location.code
                .trim()
                .toUpperCase()
            }::${
              line.product.productCode
                .trim()
                .toUpperCase()
            }`;

          return !seenKeys.has(key);
        })
        .map((line) => ({
          rowNumber: 0,
          productCode:
            line.product.productCode,
          location:
            line.location.code,
        }));

    /*
     * -------------------------------------------------
     * PRODUCT RECONCILIATION
     * -------------------------------------------------
     *
     * A product can exist in several bays.
     * We total all physical counts and compare
     * them with the frozen SYSTEM quantity.
     */

    const countsByKey =
      new Map(
        uploadedCounts.map(
          (count) => [
            `${count.locationCode}::${count.productCode}`,
            count,
          ]
        )
      );

    const products =
      new Map<
        number,
        {
          productId: number;
          productCode: string;
          description: string;
          systemStock: number | null;
          liveSystemStock:
            | number
            | null;
          locations: {
            location: string;
            expectedLocationQuantity: number;
            physicalCount: number;
            locationVariance: number;
            notes: string;
          }[];
          physicalTotal: number;
        }
      >();

    for (const line of session.lines) {
      const key =
        `${
          line.location.code
            .trim()
            .toUpperCase()
        }::${
          line.product.productCode
            .trim()
            .toUpperCase()
        }`;

      const count =
        countsByKey.get(key);

      /*
       * Only counted lines contribute to the
       * preview total. Any missing/blank count
       * remains an issue and prevents us from
       * treating it as zero.
       */
      if (!count) {
        continue;
      }

      const effectivePhysicalCount =
  count.removeFromList
    ? 0
    : count.physicalCount;

const locationVariance =
  effectivePhysicalCount -
  line.expectedLocationQuantity;

      const existing =
        products.get(
          line.product.id
        );

      if (existing) {
        existing.locations.push({
          location:
            line.location.code,

          expectedLocationQuantity:
            line.expectedLocationQuantity,

          physicalCount:
  effectivePhysicalCount,

          locationVariance,

          notes: count.notes,
        });

        existing.physicalTotal +=
  effectivePhysicalCount;
      } else {
        products.set(
          line.product.id,
          {
            productId:
              line.product.id,

            productCode:
              line.product.productCode,

            description:
              line.product.description,

            /*
             * expectedSystemQuantity is frozen
             * at session creation.
             */
            systemStock:
              line.expectedSystemQuantity,

            /*
             * Useful later for showing that
             * live stock may have moved since
             * the stocktake started.
             */
            liveSystemStock:
              line.product
                .stockQuantity ?? null,

            locations: [
              {
                location:
                  line.location.code,

                expectedLocationQuantity:
                  line.expectedLocationQuantity,

                physicalCount:
  effectivePhysicalCount,

                locationVariance,

                notes: count.notes,
              },
            ],

            physicalTotal:
  effectivePhysicalCount,
          }
        );
      }
    }

    const reconciliation =
      Array.from(
        products.values()
      )
        .map((product) => {
          const variance =
            product.systemStock === null
              ? null
              : product.physicalTotal -
                product.systemStock;

          const liveStockChanged =
            product.systemStock !==
              null &&
            product.liveSystemStock !==
              null &&
            product.liveSystemStock !==
              product.systemStock;

          return {
            ...product,
            variance,
            liveStockChanged,
          };
        })
        .sort((a, b) => {
          const aVariance =
            Math.abs(
              a.variance ?? 0
            );

          const bVariance =
            Math.abs(
              b.variance ?? 0
            );

          if (
            bVariance !== aVariance
          ) {
            return (
              bVariance -
              aVariance
            );
          }

          return a.productCode.localeCompare(
            b.productCode
          );
        });

    const shortages =
      reconciliation.filter(
        (product) =>
          product.variance !== null &&
          product.variance < 0
      );

    const overages =
      reconciliation.filter(
        (product) =>
          product.variance !== null &&
          product.variance > 0
      );

    const exactMatches =
      reconciliation.filter(
        (product) =>
          product.variance === 0
      );

    const withoutSystemStock =
      reconciliation.filter(
        (product) =>
          product.systemStock === null
      );

    const liveStockChanged =
      reconciliation.filter(
        (product) =>
          product.liveStockChanged
      );

    const totalIssues =
      uncountedRows.length +
      unmatchedProducts.length +
      unknownLocations.length +
      invalidRows.length +
      duplicateRows.length +
      unexpectedRows.length +
      missingRows.length;

    return NextResponse.json({
      success: true,

      fileName: file.name,
      sheetName:
        stocktakeSheetName,

      session: {
        id: session.id,
        reference:
          session.reference,
        status: session.status,
        startedAt:
          session.startedAt,
      },

      summary: {
        productsCounted:
          reconciliation.length,

        exactMatches:
          exactMatches.length,

        shortages:
          shortages.length,

        overages:
          overages.length,

        withoutSystemStock:
          withoutSystemStock.length,

        uncountedRows:
          uncountedRows.length,

        unmatchedProducts:
          unmatchedProducts.length,

        unknownLocations:
          unknownLocations.length,

        invalidRows:
          invalidRows.length,

        duplicateRows:
          duplicateRows.length,

        unexpectedRows:
          unexpectedRows.length,

        missingRows:
          missingRows.length,

        liveStockChanged:
          liveStockChanged.length,

        totalIssues,
      },

      reconciliation,

      issues: {
        uncountedRows,
        unmatchedProducts,
        unknownLocations,
        invalidRows,
        duplicateRows,
        unexpectedRows,
        missingRows,
      },
    });
  } catch (error) {
    console.error(
      "Stocktake reconciliation preview failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Odin could not reconcile the stocktake.",
      },
      {
        status: 500,
      }
    );
  }
}