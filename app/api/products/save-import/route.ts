import { NextResponse } from "next/server";

import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const context =
      await getApiCompanyContext();

    if (
      context.status ===
      "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be signed in.",
        },
        { status: 401 }
      );
    }

    if (
      context.status ===
      "NO_COMPANY"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No active company membership was found.",
        },
        { status: 403 }
      );
    }

    const { companyId } = context;

    const count =
      await prisma.product.count({
        where: {
          companyId,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Database connection successful.",
      products: count,
    });
  } catch (error) {
    console.error(
      "Database test failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Database connection failed.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const context =
      await getApiCompanyContext();

    if (
      context.status ===
      "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be signed in.",
        },
        { status: 401 }
      );
    }

    if (
      context.status ===
      "NO_COMPANY"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No active company membership was found.",
        },
        { status: 403 }
      );
    }

    const {
  user,
  membership,
  companyId,
} = context;

const allowed =
  user.platformRole === "SUPER_ADMIN" ||
  Boolean(
    membership.role?.permissions.some(
      ({ permission }) =>
        permission.key === "products.import",
    ),
  );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to import products.",
        },
        { status: 403 }
      );
    }

    const body =
      await request.json();

    const products =
      Array.isArray(body.products)
        ? body.products
        : [];

    if (products.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No products were supplied for import.",
        },
        { status: 400 }
      );
    }

    function cleanText(
      value: unknown
    ): string {
      return String(
        value ?? ""
      ).trim();
    }

    function parsePrice(
      value: unknown
    ): number | null {
      if (
        typeof value === "number" &&
        Number.isFinite(value)
      ) {
        return value;
      }

      const cleaned = String(
        value ?? ""
      )
        .replace(/Â£/g, "")
        .replace(/,/g, "")
        .trim();

      if (!cleaned) {
        return null;
      }

      const parsed =
        Number(cleaned);

      return Number.isFinite(parsed)
        ? parsed
        : null;
    }

    function parseActive(
      value: unknown
    ): boolean | null {
      const cleaned =
        cleanText(value).toUpperCase();

      if (!cleaned) {
        return null;
      }

      if (
        cleaned === "ACTIVE" ||
        cleaned === "YES" ||
        cleaned === "TRUE"
      ) {
        return true;
      }

      if (
        cleaned === "INACTIVE" ||
        cleaned === "NO" ||
        cleaned === "FALSE"
      ) {
        return false;
      }

      return null;
    }

    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let skipped = 0;

    let costPricesUpdated = 0;
    let zeroOrBlankCostsIgnored = 0;

    const errors: Array<{
      row: number;
      productCode?: string;
      reason: string;
    }> = [];

    for (
      let index = 0;
      index < products.length;
      index += 1
    ) {
      const row =
        products[index] as Record<
          string,
          unknown
        >;

      const productCode =
        cleanText(
          row["*ItemCode"] ??
            row["Product Code"] ??
            row.productCode ??
            row["Product code"] ??
            row.Code
        );

      const description =
        cleanText(
          row.ItemName ??
            row.Description ??
            row.description ??
            row[
              "Product Description"
            ] ??
            row.SalesDescription ??
            row.PurchasesDescription
        );

      const supplier =
        cleanText(
          row.Supplier ??
            row.supplier
        );

      const incomingCostPrice =
        parsePrice(
          row.PurchasesUnitPrice ??
            row["Cost to us"] ??
            row["Cost Price"] ??
            row.costPrice
        );

      const incomingListPrice =
        parsePrice(
          row.SalesUnitPrice ??
            row[
              "New August Price"
            ] ??
            row["New Price"] ??
            row["List Price"] ??
            row.listPrice
        );

      const incomingActive =
        parseActive(
          row.Status ??
            row.status
        );

      if (!productCode) {
        skipped += 1;

        errors.push({
          row: index + 1,
          reason:
            "Missing product code.",
        });

        continue;
      }

      try {
        /*
         * Products are unique inside
         * each OdinIQ company.
         *
         * The same product code can
         * therefore exist independently
         * in different customer tenants.
         */
        const existingProduct =
          await prisma.product.findUnique({
            where: {
              companyId_productCode: {
                companyId,
                productCode,
              },
            },

            select: {
              id: true,
              description: true,
              supplier: true,
              costPrice: true,
              listPrice: true,
              active: true,
            },
          });

        if (existingProduct) {
          const updateData: {
            description?: string;
            supplier?: string | null;
            costPrice?: number;
            listPrice?: number;
            active?: boolean;
          } = {};

          if (
            description &&
            description !==
              existingProduct.description
          ) {
            updateData.description =
              description;
          }

          if (
            supplier &&
            supplier !==
              existingProduct.supplier
          ) {
            updateData.supplier =
              supplier;
          }

          /*
           * Cost safety rule:
           *
           * Only a genuine positive incoming
           * cost is allowed to update OdinIQ.
           *
           * Blank, null or £0.00 values are
           * ignored so they cannot wipe or
           * replace a real product cost.
           */
          if (
            incomingCostPrice !== null &&
            incomingCostPrice > 0
          ) {
            if (
              existingProduct.costPrice !==
              incomingCostPrice
            ) {
              updateData.costPrice =
                incomingCostPrice;

              costPricesUpdated += 1;
            }
          } else {
            zeroOrBlankCostsIgnored += 1;
          }

          /*
           * Same safety principle for
           * sales/list prices: only positive
           * values update.
           */
          if (
            incomingListPrice !== null &&
            incomingListPrice > 0 &&
            existingProduct.listPrice !==
              incomingListPrice
          ) {
            updateData.listPrice =
              incomingListPrice;
          }

          if (
            incomingActive !== null &&
            existingProduct.active !==
              incomingActive
          ) {
            updateData.active =
              incomingActive;
          }

          if (
            Object.keys(
              updateData
            ).length > 0
          ) {
            await prisma.product.update({
              where: {
                id: existingProduct.id,
              },
              data: updateData,
            });

            updated += 1;
          } else {
            unchanged += 1;
          }
        } else {
          /*
           * New product:
           *
           * We require a description, but a
           * product can still be created
           * without a cost.
           *
           * OdinIQ can then flag the missing
           * cost rather than treating £0.00
           * as a genuine product cost.
           */
          if (!description) {
            skipped += 1;

            errors.push({
              row: index + 1,
              productCode,
              reason:
                "New product has no description.",
            });

            continue;
          }

          await prisma.product.create({
            data: {
              companyId,

              productCode,
              description,

              supplier:
                supplier || null,

              costPrice:
                incomingCostPrice !==
                  null &&
                incomingCostPrice > 0
                  ? incomingCostPrice
                  : null,

              listPrice:
                incomingListPrice !==
                  null &&
                incomingListPrice > 0
                  ? incomingListPrice
                  : null,

              active:
                incomingActive ?? true,
            },
          });

          if (
            incomingCostPrice !== null &&
            incomingCostPrice > 0
          ) {
            costPricesUpdated += 1;
          } else {
            zeroOrBlankCostsIgnored += 1;
          }

          created += 1;
        }
      } catch (error) {
        skipped += 1;

        errors.push({
          row: index + 1,
          productCode,

          reason:
            error instanceof Error
              ? error.message
              : "Unknown database error.",
        });
      }
    }

    /*
     * Only count products belonging
     * to the active company.
     */
    const totalProducts =
      await prisma.product.count({
        where: {
          companyId,
        },
      });

    return NextResponse.json({
      success: true,

      message:
        `Import complete: ` +
        `${created} created, ` +
        `${updated} updated, ` +
        `${unchanged} unchanged and ` +
        `${skipped} skipped.`,

      summary: {
        received:
          products.length,
        created,
        updated,
        unchanged,
        skipped,
        costPricesUpdated,
        zeroOrBlankCostsIgnored,
        totalProducts,
      },

      errors:
        errors.slice(0, 20),
    });
  } catch (error) {
    console.error(
      "Product import failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "The product import could not be completed.",

        error:
          error instanceof Error
            ? error.message
            : "Unknown import error.",
      },
      { status: 500 }
    );
  }
}