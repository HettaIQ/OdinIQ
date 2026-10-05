import { NextResponse } from "next/server";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

type ApplyStocktakeBody = {
  sessionId?: number;
};

export async function POST(
  request: Request
) {
  try {
    const { companyId } =
      await requireCompanyContext();

    const body =
      (await request.json()) as ApplyStocktakeBody;

    const sessionId =
      Number(body.sessionId);

    if (
      !Number.isInteger(sessionId) ||
      sessionId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "A valid stocktake session is required.",
        },
        {
          status: 400,
        }
      );
    }

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
          completedAt: true,

          lines: {
            select: {
              id: true,
              productId: true,
              locationId: true,

              expectedSystemQuantity:
                true,

              expectedLocationQuantity:
                true,

              physicalCount: true,
notes: true,

product: {
                select: {
                  productCode: true,
                  description: true,
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
            "Odin could not find this stocktake.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * The physical counts must first have
     * been finalised and locked.
     */
    if (
      session.status !== "COMPLETED"
    ) {
      return NextResponse.json(
        {
          error:
            `Stocktake ${session.reference} must be finalised before its counts can be applied.`,
        },
        {
          status: 400,
        }
      );
    }

    if (session.lines.length === 0) {
      return NextResponse.json(
        {
          error:
            "This stocktake contains no stock lines.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Every frozen line must contain a
     * physical count before anything can
     * be applied.
     */
    const uncountedLines =
      session.lines.filter(
        (line) =>
          line.physicalCount === null
      );

    if (uncountedLines.length > 0) {
      return NextResponse.json(
        {
          error:
            "This stocktake contains uncounted lines and cannot be applied.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Total the physical stock across every
     * warehouse location for each product.
     *
     * Example:
     * A01 = 50
     * B04 = 30
     * New Product.stockQuantity = 80
     */
   const productTotals =
  new Map<number, number>();

for (const line of session.lines) {
  const removeFromList =
    String(line.notes ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ") ===
    "remove from list";

  const effectivePhysicalCount =
    removeFromList
      ? 0
      : (line.physicalCount as number);

  const existing =
    productTotals.get(
      line.productId
    ) ?? 0;

  productTotals.set(
    line.productId,
    existing + effectivePhysicalCount
  );
}

    const now = new Date();

    /*
     * Apply everything in one transaction.
     *
     * If any update fails, none of the
     * stock figures are changed.
     */
    await prisma.$transaction(
      async (tx) => {
        /*
         * Update each individual warehouse
         * location to its physical count.
         */
        for (const line of session.lines) {
  const removeFromList =
    String(line.notes ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ") ===
    "remove from list";

  if (removeFromList) {
    await tx.productStockLocation.deleteMany({
      where: {
        companyId,
        productId:
          line.productId,
        locationId:
          line.locationId,
      },
    });
  } else {
    await tx.productStockLocation.upsert({
      where: {
        companyId_productId_locationId: {
          companyId,
          productId:
            line.productId,
          locationId:
            line.locationId,
        },
      },

      update: {
        quantity:
          line.physicalCount as number,
      },

      create: {
        companyId,
        productId:
          line.productId,
        locationId:
          line.locationId,
        quantity:
          line.physicalCount as number,
      },
    });
  }
}

        /*
         * Update Odin's overall System Stock
         * to the total physical count across
         * all warehouse locations.
         */
        for (const [
          productId,
          physicalTotal,
        ] of productTotals) {
          await tx.product.update({
            where: {
              id: productId,
            },

            data: {
              stockQuantity:
                physicalTotal,

              stockQuantityUpdatedAt:
                now,
            },
          });
        }

        /*
         * Mark the stocktake as applied.
         *
         * We use a distinct status so this
         * stocktake cannot accidentally be
         * applied again.
         */
        await tx.stocktakeSession.update({
          where: {
            id: session.id,
          },

          data: {
            status: "APPLIED",
          },
        });
      }
    );

    const adjustments =
      Array.from(
        productTotals.entries()
      ).map(
        ([
          productId,
          physicalTotal,
        ]) => {
          const firstLine =
            session.lines.find(
              (line) =>
                line.productId ===
                productId
            );

          const frozenSystemStock =
            firstLine
              ?.expectedSystemQuantity ??
            null;

          const variance =
            frozenSystemStock === null
              ? null
              : physicalTotal -
                frozenSystemStock;

          return {
            productId,

            productCode:
              firstLine?.product
                .productCode ?? "",

            description:
              firstLine?.product
                .description ?? "",

            previousStock:
              frozenSystemStock,

            newStock:
              physicalTotal,

            variance,
          };
        }
      )
        .sort((a, b) =>
          a.productCode.localeCompare(
            b.productCode
          )
        );

    return NextResponse.json({
      success: true,

      session: {
        id: session.id,
        reference:
          session.reference,
        status: "APPLIED",
      },

      summary: {
        productsUpdated:
          productTotals.size,

        locationsUpdated:
          session.lines.length,
      },

      adjustments,

      message:
        "Stocktake applied successfully. Odin stock quantities and warehouse location quantities have been updated. Xero has not been changed.",
    });
  } catch (error) {
    console.error(
      "Apply stocktake failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Odin could not apply the stocktake.",
      },
      {
        status: 500,
      }
    );
  }
}