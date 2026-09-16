import ProductExplorerClient from "./ProductExplorerClient";

import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const NON_PRODUCT_CODES = new Set([
  "M",
  "S1",
  "LAYOUT",
  "PLTDELIVERY",
  "STDELIVERY",
]);

function normaliseCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
  }>;
}) {

  const params = await searchParams;

  const period =
    params.period ?? "ytd";

  const user = await requireAuth();
  const membership = user.memberships[0];

  if (!membership) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        No active company membership was found for this account.
      </div>
    );
  }

  /*
   * Supplier, cost price and margin are
   * commercially sensitive.
   *
   * Agents must not receive these values
   * from the server.
   */
  const canViewCommercialProductData =
    user.platformRole === "SUPER_ADMIN" ||
    Boolean(
      membership.role?.permissions.some(
        ({ permission }) =>
          permission.key ===
          "products.view_cost_price"
      )
    );

  const products =
    await prisma.product.findMany({
      where: {
        OR: [
          {
            companyId:
              membership.companyId,
          },
          {
            companyId: null,
          },
        ],
      },

      select: {
        id: true,
        productCode: true,
        description: true,

        supplier:
          canViewCommercialProductData,

        costPrice:
          canViewCommercialProductData,

        listPrice: true,
        active: true,
      },

      orderBy: {
        productCode: "asc",
      },
    });

  /*
   * Current comparison:
   *
   * 2026 YTD = 1 Jan 2026 through today
   * 2025 YTD = same period in 2025
   *
   * Using the same cutoff date makes the
   * year-on-year comparison fair.
   */
    const today = new Date();

  const currentYear = today.getFullYear();
  const previousYear = currentYear - 1;

  const todayEnd = new Date(
    Date.UTC(
      currentYear,
      today.getMonth(),
      today.getDate() + 1
    )
  );

  let currentStart: Date;
  let currentEnd: Date;
  let previousStart: Date;
  let previousEnd: Date;

  switch (period) {
    case "this-month":
      currentStart = new Date(
        Date.UTC(
          currentYear,
          today.getMonth(),
          1
        )
      );

      currentEnd = todayEnd;

      previousStart = new Date(
        Date.UTC(
          previousYear,
          today.getMonth(),
          1
        )
      );

      previousEnd = new Date(
        Date.UTC(
          previousYear,
          today.getMonth(),
          today.getDate() + 1
        )
      );
      break;

    case "last-month": {
      const lastMonthStart = new Date(
        Date.UTC(
          currentYear,
          today.getMonth() - 1,
          1
        )
      );

      const lastMonthEnd = new Date(
        Date.UTC(
          currentYear,
          today.getMonth(),
          1
        )
      );

      currentStart = lastMonthStart;
      currentEnd = lastMonthEnd;

      previousStart = new Date(
        Date.UTC(
          lastMonthStart.getUTCFullYear() - 1,
          lastMonthStart.getUTCMonth(),
          1
        )
      );

      previousEnd = new Date(
        Date.UTC(
          lastMonthEnd.getUTCFullYear() - 1,
          lastMonthEnd.getUTCMonth(),
          1
        )
      );
      break;
    }

    case "last-12-months":
      currentStart = new Date(
        Date.UTC(
          currentYear - 1,
          today.getMonth(),
          today.getDate()
        )
      );

      currentEnd = todayEnd;

      previousStart = new Date(
        Date.UTC(
          currentYear - 2,
          today.getMonth(),
          today.getDate()
        )
      );

      previousEnd = new Date(
        Date.UTC(
          currentYear - 1,
          today.getMonth(),
          today.getDate() + 1
        )
      );
      break;

    case "ytd":
    default:
      currentStart = new Date(
        Date.UTC(currentYear, 0, 1)
      );

      currentEnd = todayEnd;

      previousStart = new Date(
        Date.UTC(previousYear, 0, 1)
      );

      previousEnd = new Date(
        Date.UTC(
          previousYear,
          today.getMonth(),
          today.getDate() + 1
        )
      );
      break;
  }

  /*
   * Fetch only the invoice-line fields
   * required for product sales intelligence.
   */
  const salesLines =
    await prisma.salesInvoiceLine.findMany({
      where: {
        stockCode: {
          not: null,
        },

        salesInvoice: {
          companyId:
            membership.companyId,

          invoiceDate: {
            gte: previousStart,
            lt: currentEnd,
          },
        },
      },

      select: {
        stockCode: true,
        quantity: true,
        netValue: true,

        salesInvoice: {
          select: {
            invoiceDate: true,
            invoiceType: true,
          },
        },
      },
    });

  type SalesSummary = {
    currentQty: number;
    currentSales: number;
    previousQty: number;
    previousSales: number;
    lastSold: Date | null;
  };

  const salesByProduct =
    new Map<string, SalesSummary>();

  function getSummary(
    stockCode: string
  ) {
    const existing =
      salesByProduct.get(stockCode);

    if (existing) {
      return existing;
    }

    const created: SalesSummary = {
      currentQty: 0,
      currentSales: 0,
      previousQty: 0,
      previousSales: 0,
      lastSold: null,
    };

    salesByProduct.set(
      stockCode,
      created
    );

    return created;
  }

  for (const line of salesLines) {
    const stockCode =
      normaliseCode(line.stockCode);

    if (
      !stockCode ||
      NON_PRODUCT_CODES.has(stockCode)
    ) {
      continue;
    }

    const invoiceDate =
      line.salesInvoice.invoiceDate;

    if (!invoiceDate) {
      continue;
    }

    const invoiceType = String(
      line.salesInvoice.invoiceType ?? ""
    )
      .trim()
      .toUpperCase();

    const isCredit =
      invoiceType === "CRD" ||
      invoiceType === "CREDIT" ||
      invoiceType.includes(
        "CREDIT NOTE"
      );

    const rawQty =
      Number(line.quantity ?? 0);

    const rawSales =
      Number(line.netValue ?? 0);

    /*
     * Credits must reduce movement.
     *
     * Sage detailed credit lines are normally
     * already negative, but abs() makes the
     * calculation safe if a report supplies
     * positive credit quantities/values.
     */
    const quantity = isCredit
      ? -Math.abs(rawQty)
      : rawQty;

    const sales = isCredit
      ? -Math.abs(rawSales)
      : rawSales;

    const summary =
      getSummary(stockCode);

    if (
      invoiceDate >= currentStart &&
      invoiceDate < currentEnd
    ) {
      summary.currentQty += quantity;
      summary.currentSales += sales;

      /*
       * Last Sold is based on a genuine
       * positive invoice movement, not a
       * later credit note.
       */
      if (
        !isCredit &&
        rawQty > 0 &&
        (
          !summary.lastSold ||
          invoiceDate >
            summary.lastSold
        )
      ) {
        summary.lastSold =
          invoiceDate;
      }
    }

    if (
      invoiceDate >= previousStart &&
      invoiceDate < previousEnd
    ) {
      summary.previousQty += quantity;
      summary.previousSales += sales;
    }
  }

  /*
   * Product aliases are important because
   * Sage may use an old/alternate stock code
   * while OdinIQ uses the current product
   * code.
   */
  const aliases =
    await prisma.productAlias.findMany({
      where: {
        companyId:
          membership.companyId,
      },

      select: {
        aliasCode: true,
        product: {
          select: {
            productCode: true,
          },
        },
      },
    });

  for (const alias of aliases) {
    const aliasCode =
      normaliseCode(
        alias.aliasCode
      );

    const productCode =
      normaliseCode(
        alias.product.productCode
      );

    if (
      !aliasCode ||
      !productCode ||
      aliasCode === productCode
    ) {
      continue;
    }

    const aliasSummary =
      salesByProduct.get(aliasCode);

    if (!aliasSummary) {
      continue;
    }

    const productSummary =
      getSummary(productCode);

    productSummary.currentQty +=
      aliasSummary.currentQty;

    productSummary.currentSales +=
      aliasSummary.currentSales;

    productSummary.previousQty +=
      aliasSummary.previousQty;

    productSummary.previousSales +=
      aliasSummary.previousSales;

    if (
      aliasSummary.lastSold &&
      (
        !productSummary.lastSold ||
        aliasSummary.lastSold >
          productSummary.lastSold
      )
    ) {
      productSummary.lastSold =
        aliasSummary.lastSold;
    }
  }

  const productsWithSales =
    products.map((product) => {
      const summary =
        salesByProduct.get(
          normaliseCode(
            product.productCode
          )
        );

      const currentQty =
        summary?.currentQty ?? 0;

      const currentSales =
        summary?.currentSales ?? 0;

      const previousQty =
        summary?.previousQty ?? 0;

      const previousSales =
        summary?.previousSales ?? 0;

      /*
       * Sales movement is based on revenue.
       *
       * null means there was no comparable
       * prior-year sales value.
       */
      const salesMovement =
        previousSales !== 0
          ? (
              (
                currentSales -
                previousSales
              ) /
              Math.abs(
                previousSales
              )
            ) *
            100
          : null;

      return {
        ...product,

        qtySoldYtd:
          Number(
            currentQty.toFixed(2)
          ),

        salesYtd:
          roundMoney(currentSales),

        previousYearQtyYtd:
          Number(
            previousQty.toFixed(2)
          ),

        previousYearSalesYtd:
          roundMoney(previousSales),

        salesMovement:
          salesMovement === null
            ? null
            : Number(
                salesMovement.toFixed(1)
              ),

        lastSold:
          summary?.lastSold
            ? summary.lastSold.toISOString()
            : null,
      };
    });

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold text-amber-600">
          Product Intelligence
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Product Explorer
        </h1>

        <p className="mt-2 text-slate-600">
          Search, filter and review the live
          product database and invoiced product
          movement.
        </p>
      </section>

      <ProductExplorerClient
  products={productsWithSales}
  canViewCommercialProductData={
    canViewCommercialProductData
  }
  period={period}
/>
    </div>
  );
}