import { NextResponse } from "next/server";

import { previewCustomerImport } from "@/app/actions/previewCustomerImport";
import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";
import { saveCustomerImportSession } from "@/lib/customerImportSession";

export async function POST(request: Request) {
  try {
    const companyContext =
      await getApiCompanyContext();

    if (
      companyContext.status ===
      "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        {
          error:
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
          error:
            "No active company membership found.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      companyId,
    } = companyContext;

    const body =
      await request.json();

    const rows =
      Array.isArray(body?.rows)
        ? body.rows
        : [];

    saveCustomerImportSession(
      companyId,
      rows
    );

    const result =
      await previewCustomerImport(
        rows
      );

    return NextResponse.json(
      result
    );
  } catch (error) {
    console.error(
      "Customer import preview failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "OdinIQ could not preview this customer import.",
      },
      {
        status: 500,
      }
    );
  }
}