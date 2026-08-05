import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const count = await prisma.product.count();

    return NextResponse.json({
      success: true,
      message: "Database connection successful.",
      products: count,
    });
  } catch (error) {
    console.error("Database test failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const products = Array.isArray(body.products) ? body.products : [];

    if (products.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No products were supplied for import.",
        },
        { status: 400 }
      );
    }

    function cleanText(value: unknown): string {
      return String(value ?? "").trim();
    }

    function parsePrice(value: unknown): number | null {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }

      const cleaned = String(value ?? "")
        .replace(/£/g, "")
        .replace(/,/g, "")
        .trim();

      if (!cleaned) {
        return null;
      }

      const parsed = Number(cleaned);

      return Number.isFinite(parsed) ? parsed : null;
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    const errors: Array<{
      row: number;
      productCode?: string;
      reason: string;
    }> = [];

    for (let index = 0; index < products.length; index += 1) {
      const row = products[index] as Record<string, unknown>;

      const productCode = cleanText(
        row["Product Code"] ??
          row.productCode ??
          row["Product code"] ??
          row.Code
      );

      const description = cleanText(
        row.Description ??
          row.description ??
          row["Product Description"]
      );

      const supplier = cleanText(
        row.Supplier ??
          row.supplier
      );

      const costPrice = parsePrice(
        row["Cost to us"] ??
          row["Cost Price"] ??
          row.costPrice
      );

      const listPrice = parsePrice(
        row["New August Price"] ??
          row["New Price"] ??
          row["List Price"] ??
          row.listPrice
      );

      if (!productCode || !description) {
        skipped += 1;

        errors.push({
          row: index + 1,
          productCode: productCode || undefined,
          reason: "Missing product code or description.",
        });

        continue;
      }

      try {
        const existingProduct = await prisma.product.findUnique({
          where: {
            productCode,
          },
          select: {
            id: true,
          },
        });

        await prisma.product.upsert({
          where: {
            productCode,
          },
          update: {
            description,
            supplier: supplier || null,
            costPrice,
            listPrice,
          },
          create: {
            productCode,
            description,
            supplier: supplier || null,
            costPrice,
            listPrice,
          },
        });

        if (existingProduct) {
          updated += 1;
        } else {
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

    const totalProducts = await prisma.product.count();

    return NextResponse.json({
      success: true,
      message: `Import complete: ${created} created, ${updated} updated and ${skipped} skipped.`,
      summary: {
        received: products.length,
        created,
        updated,
        skipped,
        totalProducts,
      },
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    console.error("Product import failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "The product import could not be completed.",
        error:
          error instanceof Error
            ? error.message
            : "Unknown import error.",
      },
      { status: 500 }
    );
  }
}