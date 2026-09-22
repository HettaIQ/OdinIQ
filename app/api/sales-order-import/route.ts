import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";
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
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function textOrNull(value: unknown) {
  const text = String(value ?? "").trim();

  return text || null;
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

  const first = Number(match[1]);
  const second = Number(match[2]);

  let year = Number(match[3]);

  if (year < 100) {
    year += 2000;
  }

  let day: number;
  let month: number;

  /*
   * Prefer unambiguous dates.
   * Ambiguous dates default to UK DD/MM/YYYY
   * for Sales Order imports.
   */
  if (first > 12) {
    day = first;
    month = second;
  } else if (second > 12) {
    month = first;
    day = second;
  } else {
    day = first;
    month = second;
  }

  return new Date(
    Date.UTC(year, month - 1, day)
  );
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
      error:
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
      error:
        "No active company membership found.",
    },
    { status: 403 }
  );
}

const {
  user,
  membership,
  companyId,
} = context;

const canImport =
  user.platformRole === "SUPER_ADMIN" ||
  Boolean(
    membership.role?.permissions.some(
      ({ permission }) =>
        permission.key === "imports.manage",
    ),
  );

    if (!canImport) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to import Sales Order data.",
        },
        { status: 403 }
      );
    }

    const body =
      (await request.json()) as
        | SalesOrderImportRow
        | SalesOrderBatchBody;

    const isBatch =
      "rows" in body &&
      Array.isArray(body.rows);

    const rows: SalesOrderImportRow[] =
      isBatch
        ? body.rows ?? []
        : [
            body as SalesOrderImportRow,
          ];

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "No Sales Orders were supplied.",
        },
        { status: 400 }
      );
    }

    const batchDateValue =
      "importBatchAt" in body
        ? body.importBatchAt
        : undefined;

    const importBatchAt =
      batchDateValue
        ? new Date(batchDateValue)
        : new Date();

    let imported = 0;
    let skipped = 0;

    await prisma.$transaction(
      async (tx) => {
        for (const row of rows) {
          const salesOrderNumber =
            String(
              row.salesOrderNumber ?? ""
            ).trim();

          if (!salesOrderNumber) {
            skipped++;
            continue;
          }

          /*
           * Check whether OdinIQ already knows
           * about this Sales Order.
           *
           * This is important for Warehouse:
           * only genuinely new Sales Orders
           * automatically enter the live
           * Warehouse workflow.
           */
          const existingSalesOrder =
            await tx.salesOrder.findUnique({
              where: {
                companyId_salesOrderNumber: {
                  companyId,
                  salesOrderNumber,
                },
              },
              select: {
                id: true,
                orderDate: true,
                customerAccountCode: true,
                customerName: true,
                orderValue: true,
                status: true,
              },
            });

          const importedCustomerAccountCode =
            textOrNull(
              row.customerAccountCode
            );

          const importedCustomerName =
            textOrNull(
              row.customerName
            );

          const importedOrderDate =
            parseSageDate(
              row.orderDate
            );

          const importedOrderValue =
            toNumber(
              row.orderValue
            );

          const importedStatus =
            textOrNull(
              row.status
            );

          /*
           * Never let a blank field in a later
           * import erase good existing Sales
           * Order information.
           */
          const customerAccountCode =
            importedCustomerAccountCode ??
            existingSalesOrder
              ?.customerAccountCode ??
            null;

          const customerName =
            importedCustomerName ??
            existingSalesOrder
              ?.customerName ??
            null;

          const orderDate =
            importedOrderDate ??
            existingSalesOrder
              ?.orderDate ??
            null;

          const orderValue =
            importedOrderValue ??
            existingSalesOrder
              ?.orderValue ??
            null;

          const status =
            importedStatus ??
            existingSalesOrder
              ?.status ??
            null;

          await tx.salesOrder.upsert({
            where: {
              companyId_salesOrderNumber: {
                companyId,
                salesOrderNumber,
              },
            },

            /*
             * Existing Sales Orders may receive
             * updated Sage information, but their
             * Warehouse state is deliberately
             * left untouched.
             */
            update: {
              orderDate,
              customerAccountCode,
              customerName,
              orderValue,
              status,
              importedAt:
                importBatchAt,
            },

            /*
             * A genuinely new Sales Order enters
             * the live Warehouse workflow at
             * Order Received.
             */
            create: {
              companyId,
              salesOrderNumber,
              orderDate,
              customerAccountCode,
              customerName,
              orderValue,
              status,
              importedAt:
                importBatchAt,

              warehouseActive: true,
              warehouseStatus:
                "ORDER_RECEIVED",
            },
          });

          imported++;
        }
      }
    );

    /*
     * Refresh OdinIQ pages after new Sales Order
     * data has been written.
     */
    revalidatePath(
      "/commercial/customers",
      "layout"
    );

    revalidatePath(
      "/despatch-audit",
      "layout"
    );

    revalidatePath(
      "/warehouse",
      "layout"
    );

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      received:
        rows.length,
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