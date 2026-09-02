import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";

type SalesOrderImportRow = {
  salesOrderNumber?: string | number;
  orderDate?: string;
  customerAccountCode?: string;
  customerName?: string;
  orderValue?: string | number;
  status?: string;
  importBatchAt?: string;
};

type SalesOrderBatchBody = {
  rows?: SalesOrderImportRow[];
  importBatchAt?: string;
};

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseSageDate(value: unknown) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  const match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/
  );

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);

  let year = Number(match[3]);

  if (year < 100) {
    year += 2000;
  }

  return new Date(
    Date.UTC(year, month - 1, day)
  );
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const membership = user.memberships[0];

    if (!membership) {
      return NextResponse.json(
        {
          error: "No active company membership found.",
        },
        { status: 403 }
      );
    }

    const canImport =
      membership.role?.name === "Company Admin" ||
      membership.role?.name === "Accounts";

    if (!canImport) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to import Sales Order data.",
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as
      | SalesOrderImportRow
      | SalesOrderBatchBody;

    const isBatch =
      "rows" in body && Array.isArray(body.rows);

    const rows: SalesOrderImportRow[] =
      isBatch
        ? body.rows ?? []
        : [body as SalesOrderImportRow];

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error: "No Sales Orders were supplied.",
        },
        { status: 400 }
      );
    }

    const batchDateValue =
      "importBatchAt" in body
        ? body.importBatchAt
        : undefined;

    const importBatchAt = batchDateValue
      ? new Date(batchDateValue)
      : new Date();

    let imported = 0;
    let skipped = 0;

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const salesOrderNumber = String(
          row.salesOrderNumber ?? ""
        ).trim();

        if (!salesOrderNumber) {
          skipped++;
          continue;
        }

        const customerAccountCode =
          String(
            row.customerAccountCode ?? ""
          ).trim() || null;

        const customerName =
          String(row.customerName ?? "").trim() ||
          null;

        const orderDate = parseSageDate(
          row.orderDate
        );

        const orderValue = toNumber(
          row.orderValue
        );

        const status =
          String(row.status ?? "").trim() ||
          null;

        await tx.salesOrder.upsert({
          where: {
            companyId_salesOrderNumber: {
              companyId: membership.companyId,
              salesOrderNumber,
            },
          },

          update: {
            orderDate,
            customerAccountCode,
            customerName,
            orderValue,
            status,
            importedAt: importBatchAt,
          },

          create: {
            companyId: membership.companyId,
            salesOrderNumber,
            orderDate,
            customerAccountCode,
            customerName,
            orderValue,
            status,
            importedAt: importBatchAt,
          },
        });

        imported++;
      }
    });

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      received: rows.length,
    });
  } catch (error) {
    console.error(
      "Sales Order import failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "OdinIQ could not import the Sales Orders.",
      },
      { status: 500 }
    );
  }
}