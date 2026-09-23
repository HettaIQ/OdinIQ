import { NextRequest, NextResponse } from "next/server";

import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function normaliseCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function escapeCsvValue(
  value: string | number | null | undefined
) {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function roundQuantity(value: number) {
  return Number(value.toFixed(2));
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function isCreditInvoice(
  invoiceType: string | null
) {
  const value = String(invoiceType ?? "")
    .trim()
    .toUpperCase();

  return (
    value === "CRD" ||
    value === "CREDIT" ||
    value.includes("CREDIT NOTE")
  );
}

export async function GET(
  request: NextRequest
) {
  const context =
    await getApiCompanyContext();

  if (context.status === "UNAUTHENTICATED") {
    return NextResponse.json(
      {
        error: "Unauthenticated",
      },
      {
        status: 401,
      }
    );
  }

  if (
    context.status !== "OK" ||
    !context.companyId ||
    !context.membership
  ) {
    return NextResponse.json(
      {
        error: "No active company selected",
      },
      {
        status: 403,
      }
    );
  }

  const {
    companyId,
    membership,
    user,
  } = context;

  /*
   * Supplier information is commercially
   * sensitive, so use the same permission
   * rule as Product Explorer.
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

  if (!canViewCommercialProductData) {
    return NextResponse.json(
      {
        error:
          "You do not have permission to export supplier data",
      },
      {
        status: 403,
      }
    );
  }

  const supplier =
    request.nextUrl.searchParams
      .get("supplier")
      ?.trim();

  if (!supplier) {
    return NextResponse.json(
      {
        error: "Supplier is required",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * Only products belonging to the currently
   * selected company can enter the report.
   */
  const products =
    await prisma.product.findMany({
      where: {
        companyId,
        supplier: {
          equals: supplier,
        },
      },

      select: {
        id: true,
        productCode: true,
        description: true,
        supplier: true,
        active: true,
      },

      orderBy: {
        productCode: "asc",
      },
    });

  if (products.length === 0) {
    return NextResponse.json(
      {
        error:
          "No products were found for this supplier",
      },
      {
        status: 404,
      }
    );
  }

  const productIds =
    products.map(
      (product) => product.id
    );

  /*
   * Build a map of every valid Sage stock
   * code to its current Odin product.
   *
   * This includes aliases so historic sales
   * under an old stock code are not lost.
   */
  const aliases =
    await prisma.productAlias.findMany({
      where: {
        companyId,
        productId: {
          in: productIds,
        },
      },

      select: {
        aliasCode: true,
        productId: true,
      },
    });

  const productById =
    new Map(
      products.map(
        (product) => [
          product.id,
          product,
        ]
      )
    );

  const codeToProductId =
    new Map<string, number>();

  for (const product of products) {
    const code =
      normaliseCode(
        product.productCode
      );

    if (code) {
      codeToProductId.set(
        code,
        product.id
      );
    }
  }

  for (const alias of aliases) {
    const code =
      normaliseCode(
        alias.aliasCode
      );

    if (code) {
      codeToProductId.set(
        code,
        alias.productId
      );
    }
  }

  const salesCodes =
    Array.from(
      codeToProductId.keys()
    );

  const today =
    new Date();

  const currentYear =
    today.getFullYear();

  const previousYear =
    currentYear - 1;

  const currentMonthIndex =
    today.getMonth();

  const currentStart =
    new Date(
      Date.UTC(
        currentYear,
        0,
        1
      )
    );

  const currentEnd =
    new Date(
      Date.UTC(
        currentYear,
        today.getMonth(),
        today.getDate() + 1
      )
    );

  const previousStart =
    new Date(
      Date.UTC(
        previousYear,
        0,
        1
      )
    );

  const previousEnd =
    new Date(
      Date.UTC(
        previousYear,
        today.getMonth(),
        today.getDate() + 1
      )
    );

  /*
   * Fetch the full available history for
   * every selected supplier product in one
   * database query.
   */
  const salesLines =
    salesCodes.length > 0
      ? await prisma.salesInvoiceLine.findMany({
          where: {
            stockCode: {
              in: salesCodes,
            },

            salesInvoice: {
              companyId,

              invoiceDate: {
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
        })
      : [];

  type ProductHistory = {
    firstSold: Date | null;

    currentQty: number;
    currentSales: number;

    previousQty: number;
    previousSales: number;

    monthly: Map<
      string,
      {
        qty: number;
        sales: number;
      }
    >;
  };

  const historyByProduct =
    new Map<number, ProductHistory>();

  function getHistory(
    productId: number
  ) {
    const existing =
      historyByProduct.get(
        productId
      );

    if (existing) {
      return existing;
    }

    const created: ProductHistory = {
      firstSold: null,

      currentQty: 0,
      currentSales: 0,

      previousQty: 0,
      previousSales: 0,

      monthly:
        new Map(),
    };

    historyByProduct.set(
      productId,
      created
    );

    return created;
  }

  function monthKey(
    year: number,
    monthIndex: number
  ) {
    return `${year}-${monthIndex}`;
  }

  for (const line of salesLines) {
    const stockCode =
      normaliseCode(
        line.stockCode
      );

    const productId =
      codeToProductId.get(
        stockCode
      );

    if (!productId) {
      continue;
    }

    const invoiceDate =
      line.salesInvoice
        .invoiceDate;

    if (!invoiceDate) {
      continue;
    }

    const history =
      getHistory(
        productId
      );

    if (
      !history.firstSold ||
      invoiceDate <
        history.firstSold
    ) {
      history.firstSold =
        invoiceDate;
    }

    const isCredit =
      isCreditInvoice(
        line.salesInvoice
          .invoiceType
      );

    const rawQty =
      Number(
        line.quantity ?? 0
      );

    const rawSales =
      Number(
        line.netValue ?? 0
      );

    const quantity =
      isCredit
        ? -Math.abs(rawQty)
        : rawQty;

    const sales =
      isCredit
        ? -Math.abs(rawSales)
        : rawSales;

    if (
      invoiceDate >= currentStart &&
      invoiceDate < currentEnd
    ) {
      history.currentQty +=
        quantity;

      history.currentSales +=
        sales;
    }

    if (
      invoiceDate >= previousStart &&
      invoiceDate < previousEnd
    ) {
      history.previousQty +=
        quantity;

      history.previousSales +=
        sales;
    }

    const year =
      invoiceDate.getUTCFullYear();

    const monthIndex =
      invoiceDate.getUTCMonth();

    const key =
      monthKey(
        year,
        monthIndex
      );

    const existingMonth =
      history.monthly.get(
        key
      );

    if (existingMonth) {
      existingMonth.qty +=
        quantity;

      existingMonth.sales +=
        sales;
    } else {
      history.monthly.set(
        key,
        {
          qty: quantity,
          sales,
        }
      );
    }
  }

  const reportRows =
    products.map(
      (product) => {
        const history =
          getHistory(
            product.id
          );

        const firstSold =
          history.firstSold;

        const firstHistoryYear =
          firstSold
            ? firstSold.getUTCFullYear()
            : previousYear;

        const firstHistoryMonth =
          firstSold
            ? firstSold.getUTCMonth()
            : 0;

        const historyYears =
          firstHistoryYear <=
          previousYear
            ? Array.from(
                {
                  length:
                    previousYear -
                    firstHistoryYear +
                    1,
                },
                (_, index) =>
                  firstHistoryYear +
                  index
              )
            : [];

        const monthlyAverages =
          MONTH_NAMES.map(
            (
              month,
              monthIndex
            ) => {
              const validYears =
                historyYears.filter(
                  (year) =>
                    !(
                      year ===
                        firstHistoryYear &&
                      monthIndex <
                        firstHistoryMonth
                    )
                );

              let historicalQty =
                0;

              let historicalSales =
                0;

              for (
                const year of
                validYears
              ) {
                const data =
                  history.monthly.get(
                    monthKey(
                      year,
                      monthIndex
                    )
                  );

                historicalQty +=
                  data?.qty ?? 0;

                historicalSales +=
                  data?.sales ?? 0;
              }

              const yearCount =
                validYears.length;

              return {
                month,
                monthIndex,

                averageQty:
                  yearCount > 0
                    ? historicalQty /
                      yearCount
                    : 0,

                averageSales:
                  yearCount > 0
                    ? historicalSales /
                      yearCount
                    : 0,

                yearCount,
              };
            }
          );

        const rankedMonths =
          [...monthlyAverages]
            .filter(
              (month) =>
                month.averageQty >
                0
            )
            .sort(
              (
                first,
                second
              ) =>
                second.averageQty -
                first.averageQty
            );

        const strongestMonth =
          rankedMonths[0]
            ?.month ?? "";

        const peakMonths =
          rankedMonths
            .slice(0, 3)
            .map(
              (month) =>
                month.month
            )
            .join(", ");

        const upcomingPeak =
          monthlyAverages
            .filter(
              (month) =>
                month.monthIndex >
                  currentMonthIndex &&
                month.averageQty >
                  0
            )
            .sort(
              (
                first,
                second
              ) =>
                second.averageQty -
                first.averageQty
            )[0]?.month ?? "";

        const qtyChange =
          history.currentQty -
          history.previousQty;

        const qtyChangePercent =
          history.previousQty !==
          0
            ? (
                qtyChange /
                Math.abs(
                  history.previousQty
                )
              ) *
              100
            : null;

        const salesChange =
          history.currentSales -
          history.previousSales;

        const salesChangePercent =
          history.previousSales !==
          0
            ? (
                salesChange /
                Math.abs(
                  history.previousSales
                )
              ) *
              100
            : null;

        const yearsHistory =
          new Set(
            monthlyAverages
              .flatMap(
                (month) =>
                  month.yearCount >
                  0
                    ? [month.yearCount]
                    : []
              )
          );

        const maximumYearsHistory =
          yearsHistory.size > 0
            ? Math.max(
                ...yearsHistory
              )
            : 0;

        return {
          productCode:
            product.productCode,

          description:
            product.description,

          supplier:
            product.supplier ?? "",

          active:
            product.active,

          previousQty:
            roundQuantity(
              history.previousQty
            ),

          currentQty:
            roundQuantity(
              history.currentQty
            ),

          qtyChange:
            roundQuantity(
              qtyChange
            ),

          qtyChangePercent:
            qtyChangePercent ===
            null
              ? null
              : Number(
                  qtyChangePercent.toFixed(
                    1
                  )
                ),

          previousSales:
            roundMoney(
              history.previousSales
            ),

          currentSales:
            roundMoney(
              history.currentSales
            ),

          salesChange:
            roundMoney(
              salesChange
            ),

          salesChangePercent:
            salesChangePercent ===
            null
              ? null
              : Number(
                  salesChangePercent.toFixed(
                    1
                  )
                ),

          monthlyAverages,

          strongestMonth,
          peakMonths,
          upcomingPeak,

          yearsHistory:
            maximumYearsHistory,

          firstSold:
            firstSold
              ? firstSold.toISOString()
              : null,
        };
      }
    );

  const headers = [
    "Product Code",
    "Description",
    "Supplier",
    "Status",

    `${previousYear} YTD Qty`,
    `${currentYear} YTD Qty`,
    "Qty Change",
    "Qty Change %",

    `${previousYear} YTD Sales`,
    `${currentYear} YTD Sales`,
    "Sales Change",
    "Sales Change %",

    ...MONTH_NAMES.map(
      (month) =>
        `${month} Historic Avg Qty`
    ),

    "Strongest Month",
    "Top 3 Peak Months",
    "Upcoming Peak Month",
    "Years History",
    "First Sold",
  ];

  const csvRows =
    reportRows.map(
      (row) => [
        row.productCode,
        row.description,
        row.supplier,
        row.active
          ? "Active"
          : "Inactive",

        row.previousQty,
        row.currentQty,
        row.qtyChange,
        row.qtyChangePercent ??
          "",

        row.previousSales.toFixed(
          2
        ),
        row.currentSales.toFixed(
          2
        ),
        row.salesChange.toFixed(
          2
        ),
        row.salesChangePercent ??
          "",

        ...row.monthlyAverages.map(
          (month) =>
            month.averageQty.toFixed(
              2
            )
        ),

        row.strongestMonth,
        row.peakMonths,
        row.upcomingPeak,
        row.yearsHistory,

        row.firstSold
          ? new Date(
              row.firstSold
            ).toLocaleDateString(
              "en-GB"
            )
          : "",
      ]
        .map(escapeCsvValue)
        .join(",")
    );

  const csv = [
    headers
      .map(escapeCsvValue)
      .join(","),

    ...csvRows,
  ].join("\r\n");

  const safeSupplier =
    supplier
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      );

  return new NextResponse(
    "\uFEFF" + csv,
    {
      status: 200,

      headers: {
        "Content-Type":
          "text/csv; charset=utf-8",

        "Content-Disposition":
          `attachment; filename="${safeSupplier}-seasonality-${currentYear}.csv"`,

        "Cache-Control":
          "no-store",
      },
    }
  );
}