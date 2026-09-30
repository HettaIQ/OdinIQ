import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";
import { isPublicDemoContext } from "@/lib/auth/isPublicDemoContext";
import { prisma } from "@/lib/prisma";

type PurchaseOrderImportRow = {
  purchaseOrderNumber?: string | number;
  orderDate?: string;
  supplierAccountCode?: string;
  productCode?: string;
  description?: string;
  unitOfSale?: string;
  quantity?: string | number;
  discountAmount?: string | number;
  netValue?: string | number;
  vatValue?: string | number;
  grossValue?: string | number;
};

function toNumber(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const cleaned = String(value)
    .replace(/Ã‚Â£/g, "")
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

function parseSageDate(value: unknown) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  /*
   * Preferred format from the OdinIQ purchase
   * uploader. Excel serial dates are converted
   * to YYYY-MM-DD before being sent here.
   */
  const isoMatch = text.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);

    if (
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      );
    }

    return null;
  }

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
   * Sage normally exports UK dates as DD/MM/YYYY.
   *
   * XLSX can sometimes render Excel dates as
   * MM/DD/YY in the browser.
   *
   * If the second number is above 12 it cannot
   * be a month, so the date must be MM/DD/YY.
   * Otherwise we retain Sage's normal UK format.
   */
  if (second > 12 && first <= 12) {
    month = first;
    day = second;
  } else {
    day = first;
    month = second;
  }

  if (
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );
}

function firstText(
  rows: PurchaseOrderImportRow[],
  getter: (
    row: PurchaseOrderImportRow
  ) => unknown
) {
  for (const row of rows) {
    const value = String(
      getter(row) ?? ""
    ).trim();

    if (value) {
      return value;
    }
  }

  return null;
}

function sumField(
  rows: PurchaseOrderImportRow[],
  getter: (
    row: PurchaseOrderImportRow
  ) => unknown
) {
  const values = rows
    .map((row) =>
      toNumber(getter(row))
    )
    .filter(
      (value): value is number =>
        value !== null
    );

  if (values.length === 0) {
    return null;
  }

  return Number(
    values
      .reduce(
        (total, value) =>
          total + value,
        0
      )
      .toFixed(2)
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

    if (
      isPublicDemoContext(context)
    ) {
      return NextResponse.json(
        {
          error:
            "The public OdinIQ demo is read-only.",
        },
        { status: 403 }
      );
    }

    const canImport =
      user.platformRole ===
        "SUPER_ADMIN" ||
      Boolean(
        membership.role?.permissions.some(
          ({ permission }) =>
            permission.key ===
            "imports.manage"
        )
      );

    if (!canImport) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to import purchase order data.",
        },
        { status: 403 }
      );
    }

    const body =
      await request.json();

    const rows = Array.isArray(
      body.rows
    )
      ? (body.rows as PurchaseOrderImportRow[])
      : [];

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "No purchase order rows were supplied.",
        },
        { status: 400 }
      );
    }

    const groupedRows = new Map<
      string,
      PurchaseOrderImportRow[]
    >();

    for (const row of rows) {
      const purchaseOrderNumber =
        String(
          row.purchaseOrderNumber ?? ""
        ).trim();

      if (!purchaseOrderNumber) {
        continue;
      }

      const existing =
        groupedRows.get(
          purchaseOrderNumber
        ) ?? [];

      existing.push(row);

      groupedRows.set(
        purchaseOrderNumber,
        existing
      );
    }

    let importedPurchaseOrders = 0;
    let importedPurchaseOrderLines = 0;

    for (
      const [
        purchaseOrderNumber,
        purchaseOrderRows,
      ] of groupedRows
    ) {
      const existingPurchaseOrder =
        await prisma.purchaseOrder.findUnique(
          {
            where: {
              companyId_purchaseOrderNumber:
                {
                  companyId,
                  purchaseOrderNumber,
                },
            },
          }
        );

      const orderDateText =
        firstText(
          purchaseOrderRows,
          (row) => row.orderDate
        );

      const importedOrderDate =
        parseSageDate(
          orderDateText
        );

      const orderDate =
        importedOrderDate ??
        existingPurchaseOrder?.orderDate ??
        null;

      const importedSupplierAccountCode =
        firstText(
          purchaseOrderRows,
          (row) =>
            row.supplierAccountCode
        );

      const supplierAccountCode =
        importedSupplierAccountCode ??
        existingPurchaseOrder
          ?.supplierAccountCode ??
        null;

      const importedNetValue =
        sumField(
          purchaseOrderRows,
          (row) => row.netValue
        );

      const netValue =
        importedNetValue ??
        existingPurchaseOrder?.netValue ??
        null;

      const savedPurchaseOrder =
        await prisma.purchaseOrder.upsert(
          {
            where: {
              companyId_purchaseOrderNumber:
                {
                  companyId,
                  purchaseOrderNumber,
                },
            },

            update: {
              orderDate,
              supplierAccountCode,
              netValue,
              source: "SAGE",
            },

            create: {
              companyId,
              purchaseOrderNumber,
              orderDate,
              supplierAccountCode,
              netValue,
              source: "SAGE",
            },
          }
        );

      /*
       * The Sage "Purchase Orders By Product"
       * report contains the final quantities
       * held against each PO.
       *
       * Hetta updates the PO when the goods
       * arrive if the supplier delivers a
       * different quantity.
       *
       * Therefore quantity is also stored as
       * quantityDelivered for purchase
       * intelligence reporting.
       */

      await prisma.purchaseOrderLine.deleteMany(
        {
          where: {
            purchaseOrderId:
              savedPurchaseOrder.id,
          },
        }
      );

      for (
        let index = 0;
        index <
        purchaseOrderRows.length;
        index++
      ) {
        const row =
          purchaseOrderRows[index];

        const productCode =
          String(
            row.productCode ?? ""
          ).trim();

        const description =
          String(
            row.description ?? ""
          ).trim();

        const quantity =
          toNumber(row.quantity);

        const netValue =
          toNumber(row.netValue);

        /*
         * Ignore completely empty Sage rows,
         * but retain genuine FOC product lines.
         */
        if (
          !productCode &&
          !description &&
          quantity === null &&
          netValue === null
        ) {
          continue;
        }

        await prisma.purchaseOrderLine.create(
          {
            data: {
              purchaseOrderId:
                savedPurchaseOrder.id,

              lineNumber:
                index + 1,

              productCode:
                productCode || null,

              description:
                description || null,

              quantity,

              /*
               * Hetta amends the PO to the
               * quantity actually delivered.
               */
              quantityDelivered:
                quantity,

              unitOfSale:
                String(
                  row.unitOfSale ?? ""
                ).trim() || null,

              discountAmount:
                toNumber(
                  row.discountAmount
                ),

              /*
               * Unit cost is deliberately not
               * invented from the Sage export.
               * Purchase intelligence can derive
               * average cost from net spend /
               * quantity where appropriate.
               */
              unitCost: null,

              netValue,

              vatValue:
                toNumber(row.vatValue),

              grossValue:
                toNumber(row.grossValue),
            },
          }
        );

        importedPurchaseOrderLines++;
      }

      importedPurchaseOrders++;
    }

    revalidatePath(
      "/purchase-order-import"
    );

    revalidatePath(
      "/commercial",
      "layout"
    );

    return NextResponse.json({
      success: true,

      purchaseOrderCount:
        importedPurchaseOrders,

      purchaseOrderLineCount:
        importedPurchaseOrderLines,
    });
  } catch (error) {
    console.error(
      "Purchase order import failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "OdinIQ could not import the purchase order data.",
      },
      { status: 500 }
    );
  }
}
