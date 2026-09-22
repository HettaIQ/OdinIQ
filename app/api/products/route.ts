import { NextResponse } from "next/server";

import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const companyContext =
      await getApiCompanyContext();

    if (
      companyContext.status ===
      "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be signed in.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      companyContext.status ===
      "NO_COMPANY"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No active company membership was found.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      companyId,
    } = companyContext;

    const products =
      await prisma.product.findMany({
        where: {
          companyId,
        },
        orderBy: {
          productCode: "asc",
        },
      });

    return NextResponse.json(
      products
    );
  } catch (error) {
    console.error(
      "Loading products failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Products could not be loaded.",
      },
      {
        status: 500,
      }
    );
  }
}