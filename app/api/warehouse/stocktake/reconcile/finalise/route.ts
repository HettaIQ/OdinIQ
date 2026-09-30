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

  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

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
            "Please provide the completed stocktake workbook.",
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
     * ----------------------------------------
     * READ ODINIQ SESSION METADATA
     * ----------------------------------------
     */
    const metadataSheet =
      workbook.Sheets["_OdinIQ"];

    if (!metadataSheet) {
      return NextResponse.json(
        {
          error:
            "This workbook does not contain an OdinIQ stocktake session.",
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

    if (
      String(
        metadataRows[0]?.[0] ?? ""
      ).trim() !== "ODINIQ_STOCKTAKE"
    ) {
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

    const reference =
      String(
        referenceRow?.[1] ?? ""
      ).trim();

    if (
      !Number.isInteger(sessionId) ||
      sessionId <= 0 ||
      !reference
    ) {
      return NextResponse.json(
        {
          error:
            "The stocktake session information is incomplete.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ----------------------------------------
     * LOAD FROZEN STOCKTAKE SESSION
     * ----------------------------------------
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

          lines: {
            select: {
              id: true,

              product: {
                select: {
                  productCode: true,
                },
              },

              location: {
                select: {
                  code: true,
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
      session.reference !== reference
    ) {
      return NextResponse.json(
        {
          error:
            "The workbook reference does not match the OdinIQ stocktake session.",
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
            `Stocktake ${session.reference} is already ${session.status}.`,
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ----------------------------------------
     * FIND BLIND STOCKTAKE SHEET
     * ----------------------------------------
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

    const rows =
      XLSX.utils.sheet_to_json<unknown[]>(
        workbook.Sheets[
          stocktakeSheetName
        ],
        {
          header: 1,
          defval: null,
          raw: true,
        }
      );

    const headingRowIndex =
      rows.findIndex((row) => {
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
            "Odin could not find the required stocktake headings.",
        },
        {
          status: 400,
        }
      );
    }

    const headings =
      rows[headingRowIndex].map(
        normalise
      );

    const locationIndex =
      headings.indexOf("location");

    const productCodeIndex =
      headings.indexOf(
        "product code"
      );

    const physicalCountIndex =
      headings.indexOf(
        "physical count"
      );

    const notesIndex =
      headings.indexOf("notes");

    /*
     * Build the list of exact Product +
     * Location combinations frozen into
     * this stocktake.
     */
    const lineByKey =
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

    const counts =
      new Map<
        string,
        {
          lineId: number;
          physicalCount: number;
          notes: string | null;
        }
      >();

    const problems: string[] = [];

    const dataRows =
      rows.slice(
        headingRowIndex + 1
      );

    for (
      let index = 0;
      index < dataRows.length;
      index += 1
    ) {
      const row =
        dataRows[index];

      const rowNumber =
        headingRowIndex +
        index +
        2;

      const location =
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
       * Empty-product rows are configured
       * empty warehouse locations and do
       * not require a physical quantity.
       */
      if (!productCode) {
        continue;
      }

      const key =
        `${location}::${productCode}`;

      const snapshotLine =
        lineByKey.get(key);

      if (!snapshotLine) {
        problems.push(
          `Row ${rowNumber}: ${productCode} at ${location || "no location"} was not part of the original stocktake.`
        );

        continue;
      }

      if (counts.has(key)) {
        problems.push(
          `Row ${rowNumber}: duplicate count for ${productCode} at ${location}.`
        );

        continue;
      }

      const rawCount =
        row[physicalCountIndex];

      if (
        rawCount === null ||
        rawCount === undefined ||
        String(rawCount).trim() === ""
      ) {
        problems.push(
          `Row ${rowNumber}: ${productCode} at ${location} has not been counted.`
        );

        continue;
      }

      const physicalCount =
        readNumber(rawCount);

      if (
        physicalCount === null ||
        physicalCount < 0
      ) {
        problems.push(
          `Row ${rowNumber}: ${productCode} at ${location} has an invalid physical count.`
        );

        continue;
      }

      const notes =
        notesIndex >= 0
          ? String(
              row[notesIndex] ?? ""
            ).trim()
          : "";

      counts.set(key, {
        lineId:
          snapshotLine.id,

        physicalCount,

        notes:
          notes || null,
      });
    }

    /*
     * Every frozen stocktake line must
     * appear exactly once with a count.
     */
    for (const [
      key,
      line,
    ] of lineByKey) {
      if (!counts.has(key)) {
        const alreadyReported =
          problems.some((problem) =>
            problem.includes(
              line.product.productCode
            )
          );

        if (!alreadyReported) {
          problems.push(
            `${line.product.productCode} at ${line.location.code} is missing from the completed stocktake.`
          );
        }
      }
    }

    if (problems.length > 0) {
      return NextResponse.json(
        {
          error:
            "The stocktake cannot be finalised because it contains unresolved issues.",

          problems,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ----------------------------------------
     * FINALISE ATOMICALLY
     * ----------------------------------------
     *
     * Re-check the session inside the
     * transaction. This protects against
     * accidental double-finalisation.
     *
     * Product.stockQuantity is NOT changed.
     */
    const completedAt =
      new Date();

    await prisma.$transaction(
      async (tx) => {
        const currentSession =
          await tx.stocktakeSession.findFirst({
            where: {
              id: session.id,
              companyId,
            },

            select: {
              status: true,
            },
          });

        if (
          !currentSession ||
          currentSession.status !==
            "OPEN"
        ) {
          throw new Error(
            "This stocktake is no longer open and cannot be finalised."
          );
        }

        for (const count of counts.values()) {
          await tx.stocktakeLine.update({
            where: {
              id: count.lineId,
            },

            data: {
              physicalCount:
                count.physicalCount,

              notes:
                count.notes,

              countedAt:
                completedAt,
            },
          });
        }

        await tx.stocktakeSession.update({
          where: {
            id: session.id,
          },

          data: {
            status: "COMPLETED",
            completedAt,
          },
        });
      }
    );

    return NextResponse.json({
      success: true,

      session: {
        id: session.id,
        reference:
          session.reference,
        status: "COMPLETED",
        completedAt,
      },

      summary: {
        linesFinalised:
          counts.size,
      },

      message:
        "Stocktake finalised successfully. Physical counts have been saved. System stock has not been changed.",
    });
  } catch (error) {
    console.error(
      "Finalise stocktake failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Odin could not finalise the stocktake.",
      },
      {
        status: 500,
      }
    );
  }
}