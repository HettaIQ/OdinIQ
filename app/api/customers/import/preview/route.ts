import { NextResponse } from "next/server";

import { previewCustomerImport } from "@/app/actions/previewCustomerImport";
import { requireAuth } from "@/lib/auth/requireAuth";
import { saveCustomerImportSession } from "@/lib/customerImportSession";

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const membership = user.memberships[0];

    if (!membership) {
      throw new Error("No active company membership found.");
    }

    const body = await request.json();

    const rows = Array.isArray(body?.rows) ? body.rows : [];

    saveCustomerImportSession(membership.companyId, rows);

    const result = await previewCustomerImport(rows);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Customer import preview failed:", error);

    return NextResponse.json(
      {
        error: "OdinIQ could not preview this customer import.",
      },
      {
        status: 500,
      }
    );
  }
}