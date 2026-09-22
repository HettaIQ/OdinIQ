import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ProductDetailPageProps = {
  params: Promise<{
    productCode: string;
  }>;
  searchParams: Promise<{
    month?: string;
  }>;
};

export default async function ProductDetailPage({
  params,
  searchParams,
}: ProductDetailPageProps) {
  const {
    user,
    membership,
    companyId,
  } = await requireCompanyContext();

  if (!membership) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0b0b0f",
          color: "#ffffff",
          padding: "48px 32px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "1180px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              border: "1px solid #7f1d1d",
              background: "#2a1010",
              borderRadius: "12px",
              padding: "20px",
              color: "#fecaca",
            }}
          >
            No active company membership was found.
          </div>
        </div>
      </main>
    );
  }

  const canViewCommercialProductData =
    user.platformRole === "SUPER_ADMIN" ||
    Boolean(
      membership.role?.permissions.some(
        ({ permission }) =>
          permission.key ===
          "products.view_cost_price"
      )
    );

  const canEditProduct =
    user.platformRole === "SUPER_ADMIN" ||
    membership.role?.name === "Company Admin" ||
    membership.role?.name === "Accounts";

  const { productCode } = await params;
  const resolvedSearchParams = await searchParams;

  const selectedMonthNumber =
    Number(resolvedSearchParams.month);

  const selectedMonthIndex =
    Number.isInteger(selectedMonthNumber) &&
    selectedMonthNumber >= 1 &&
    selectedMonthNumber <= 12
      ? selectedMonthNumber - 1
      : null;

  const decodedProductCode =
    decodeURIComponent(productCode);

  const product =
  await prisma.product.findFirst({
    where: {
      productCode:
        decodedProductCode,

      companyId:
        companyId,
    },

    include: {
        merchantPrices:
          canViewCommercialProductData
            ? {
                orderBy: {
                  merchantName: "asc",
                },
              }
            : false,
      },
    });

  if (!product) {
    notFound();
  }

  const grossProfit =
    canViewCommercialProductData &&
    product.costPrice !== null &&
    product.listPrice !== null
      ? product.listPrice -
        product.costPrice
      : null;

  const grossMargin =
    canViewCommercialProductData &&
    product.costPrice !== null &&
    product.listPrice !== null &&
    product.listPrice > 0
      ? ((product.listPrice -
          product.costPrice) /
          product.listPrice) *
        100
      : null;

  const merchantPrices =
    canViewCommercialProductData &&
    Array.isArray(
      product.merchantPrices
    )
      ? product.merchantPrices
      : [];
  /*
   * PRODUCT SALES INTELLIGENCE
   *
   * Compare current YTD with the same
   * period last year using detailed
   * invoice and credit lines.
   */

  const today = new Date();

  const currentYear =
    today.getFullYear();

  const previousYear =
    currentYear - 1;

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

  const aliases =
    await prisma.productAlias.findMany({
      where: {
        companyId:
          companyId,

        productId:
          product.id,
      },

      select: {
        aliasCode: true,
      },
    });

  const salesCodes = Array.from(
    new Set([
      product.productCode
        .trim()
        .toUpperCase(),

      ...aliases.map(
        (alias) =>
          alias.aliasCode
            .trim()
            .toUpperCase()
      ),
    ])
  );

  const salesLines =
    await prisma.salesInvoiceLine.findMany({
      where: {
        stockCode: {
          in: salesCodes,
        },

        salesInvoice: {
          companyId:
            companyId,

          invoiceDate: {
            lt: currentEnd,
          },
        },
      },

      select: {
        id: true,
        stockCode: true,
        description: true,
        quantity: true,
        netValue: true,

        salesInvoice: {
          select: {
            invoiceNumber: true,
            invoiceDate: true,
            invoiceType: true,
            customerAccountCode: true,
            customerName: true,
          },
        },
      },

      orderBy: {
        salesInvoice: {
          invoiceDate: "desc",
        },
      },
    });

  let currentQty = 0;
  let currentSales = 0;

  let previousQty = 0;
  let previousSales = 0;

  let lastSold: Date | null = null;
  let firstSold: Date | null = null;

  const customerSales =
    new Map<
      string,
      {
        customerName: string;
        quantity: number;
        sales: number;
      }
    >();

  for (const line of salesLines) {
    const invoiceDate =
      line.salesInvoice.invoiceDate;

    if (!invoiceDate) {
      continue;
    }

    if (
      !firstSold ||
      invoiceDate < firstSold
    ) {
      firstSold = invoiceDate;
    }

    const invoiceType =
      String(
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
      currentQty += quantity;
      currentSales += sales;

      if (
        !isCredit &&
        rawQty > 0 &&
        (
          !lastSold ||
          invoiceDate > lastSold
        )
      ) {
        lastSold = invoiceDate;
      }

      const customerKey =
        String(
          line.salesInvoice
            .customerAccountCode ??
            line.salesInvoice
              .customerName ??
            "UNKNOWN"
        )
          .trim()
          .toUpperCase();

      const existing =
        customerSales.get(
          customerKey
        );

      if (existing) {
        existing.quantity +=
          quantity;

        existing.sales += sales;
      } else {
        customerSales.set(
          customerKey,
          {
            customerName:
              line.salesInvoice
                .customerName ??
              line.salesInvoice
                .customerAccountCode ??
              "Unknown customer",

            quantity,
            sales,
          }
        );
      }
    }

    if (
      invoiceDate >= previousStart &&
      invoiceDate < previousEnd
    ) {
      previousQty += quantity;
      previousSales += sales;
    }
  }

  const salesMovement =
    previousSales !== 0
      ? (
          (
            currentSales -
            previousSales
          ) /
          Math.abs(previousSales)
        ) *
        100
      : null;

  const quantityMovement =
    previousQty !== 0
      ? (
          (
            currentQty -
            previousQty
          ) /
          Math.abs(previousQty)
        ) *
        100
      : null;

  const topCustomers =
    Array.from(
      customerSales.values()
    )
      .sort(
        (first, second) =>
          second.sales -
          first.sales
      )
      .slice(0, 10);

  const recentSalesLines =
    salesLines
      .filter(
        (line) =>
          line.salesInvoice
            .invoiceDate &&
          line.salesInvoice
              .invoiceDate >=
            currentStart &&
          line.salesInvoice
              .invoiceDate <
            currentEnd
      )
      .slice(0, 20);

  /*
   * FULL-HISTORY PRODUCT SEASONALITY
   *
   * Historical seasonality uses every
   * completed year available for this
   * product. The current partial year is
   * shown separately so it cannot distort
   * the long-term monthly pattern.
   */

  const monthNames = [
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

  const currentMonthIndex =
    today.getMonth();

  const firstHistoryYear =
    firstSold
      ? firstSold.getUTCFullYear()
      : previousYear;

  const firstHistoryMonth =
    firstSold
      ? firstSold.getUTCMonth()
      : 0;

  const historyYears =
    firstHistoryYear <= previousYear
      ? Array.from(
          {
            length:
              previousYear -
              firstHistoryYear +
              1,
          },
          (_, index) =>
            firstHistoryYear + index
        )
      : [];

  const historyStartLabel =
    firstSold
      ? firstSold.toLocaleDateString(
          "en-GB",
          {
            month: "short",
            year: "numeric",
          }
        )
      : "No sales history";

  type MonthYearData = {
    qty: number;
    sales: number;
    invoices: Set<string>;
    customers: Set<string>;
  };

  const monthlyYearData =
    new Map<
      string,
      MonthYearData
    >();

  const getMonthYearKey = (
    year: number,
    monthIndex: number
  ) =>
    `${year}-${monthIndex}`;

  for (const line of salesLines) {
    const invoiceDate =
      line.salesInvoice.invoiceDate;

    if (!invoiceDate) {
      continue;
    }

    const invoiceType =
      String(
        line.salesInvoice.invoiceType ??
          ""
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

    const quantity =
      isCredit
        ? -Math.abs(rawQty)
        : rawQty;

    const sales =
      isCredit
        ? -Math.abs(rawSales)
        : rawSales;

    const year =
      invoiceDate.getUTCFullYear();

    const monthIndex =
      invoiceDate.getUTCMonth();

    const key =
      getMonthYearKey(
        year,
        monthIndex
      );

    let data =
      monthlyYearData.get(key);

    if (!data) {
      data = {
        qty: 0,
        sales: 0,
        invoices:
          new Set<string>(),
        customers:
          new Set<string>(),
      };

      monthlyYearData.set(
        key,
        data
      );
    }

    data.qty += quantity;
    data.sales += sales;
    data.invoices.add(
      line.salesInvoice.invoiceNumber
    );

    const customerKey =
      String(
        line.salesInvoice
          .customerAccountCode ??
          line.salesInvoice
            .customerName ??
          "UNKNOWN"
      )
        .trim()
        .toUpperCase();

    data.customers.add(
      customerKey
    );
  }

  const seasonalMonths =
    monthNames.map(
      (month, monthIndex) => {
        const historicalYearsForMonth =
          historyYears.filter(
            (year) =>
              !(
                year ===
                  firstHistoryYear &&
                monthIndex <
                  firstHistoryMonth
              )
          );

        let historicalQty = 0;
        let historicalSales = 0;

        for (
          const year of
          historicalYearsForMonth
        ) {
          const data =
            monthlyYearData.get(
              getMonthYearKey(
                year,
                monthIndex
              )
            );

          historicalQty +=
            data?.qty ?? 0;

          historicalSales +=
            data?.sales ?? 0;
        }

        const historicalYearCount =
          historicalYearsForMonth.length;

        const historicalAverageQty =
          historicalYearCount > 0
            ? historicalQty /
              historicalYearCount
            : 0;

        const historicalAverageSales =
          historicalYearCount > 0
            ? historicalSales /
              historicalYearCount
            : 0;

        const previousData =
          monthlyYearData.get(
            getMonthYearKey(
              previousYear,
              monthIndex
            )
          );

        const currentData =
          monthlyYearData.get(
            getMonthYearKey(
              currentYear,
              monthIndex
            )
          );

        return {
          month,
          monthIndex,
          historicalAverageQty,
          historicalAverageSales,
          historicalYearCount,
          previousQty:
            previousData?.qty ?? 0,
          previousSales:
            previousData?.sales ?? 0,
          currentQty:
            currentData?.qty ?? 0,
          currentSales:
            currentData?.sales ?? 0,
          isCurrentMonth:
            monthIndex ===
            currentMonthIndex,
          isFutureMonth:
            monthIndex >
            currentMonthIndex,
        };
      }
    );

  const rankedSeasonalMonths =
    [...seasonalMonths].sort(
      (first, second) =>
        second.historicalAverageQty -
        first.historicalAverageQty
    );

  const strongestMonth =
    rankedSeasonalMonths[0] ?? null;

  const peakMonthNames =
    rankedSeasonalMonths
      .filter(
        (month) =>
          month.historicalAverageQty >
          0
      )
      .slice(0, 3)
      .map(
        (month) => month.month
      );

  const upcomingDemand =
    seasonalMonths
      .filter(
        (month) =>
          month.isFutureMonth &&
          month.historicalAverageQty >
            0
      )
      .sort(
        (first, second) =>
          second.historicalAverageQty -
          first.historicalAverageQty
      )[0] ?? null;

  /*
   * CLICKABLE MONTH DRILL-DOWN
   *
   * A selected month now shows the full
   * history for that calendar month,
   * including year-by-year demand and the
   * customers responsible for it.
   */

  const selectedMonth =
    selectedMonthIndex !== null
      ? seasonalMonths[
          selectedMonthIndex
        ]
      : null;

  const selectedMonthCustomers =
    new Map<
      string,
      {
        customerName: string;
        quantity: number;
        sales: number;
        invoices: Set<string>;
        years: Set<number>;
        lastBought: Date | null;
      }
    >();

  if (selectedMonthIndex !== null) {
    for (const line of salesLines) {
      const invoiceDate =
        line.salesInvoice.invoiceDate;

      if (
        !invoiceDate ||
        invoiceDate.getUTCMonth() !==
          selectedMonthIndex
      ) {
        continue;
      }

      const invoiceType =
        String(
          line.salesInvoice.invoiceType ??
            ""
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

      const quantity =
        isCredit
          ? -Math.abs(rawQty)
          : rawQty;

      const sales =
        isCredit
          ? -Math.abs(rawSales)
          : rawSales;

      const customerKey =
        String(
          line.salesInvoice
            .customerAccountCode ??
            line.salesInvoice
              .customerName ??
            "UNKNOWN"
        )
          .trim()
          .toUpperCase();

      const customerName =
        line.salesInvoice.customerName ??
        line.salesInvoice
          .customerAccountCode ??
        "Unknown customer";

      let customer =
        selectedMonthCustomers.get(
          customerKey
        );

      if (!customer) {
        customer = {
          customerName,
          quantity: 0,
          sales: 0,
          invoices:
            new Set<string>(),
          years:
            new Set<number>(),
          lastBought: null,
        };

        selectedMonthCustomers.set(
          customerKey,
          customer
        );
      }

      customer.quantity +=
        quantity;

      customer.sales += sales;

      customer.invoices.add(
        line.salesInvoice.invoiceNumber
      );

      customer.years.add(
        invoiceDate.getUTCFullYear()
      );

      if (
        !customer.lastBought ||
        invoiceDate >
          customer.lastBought
      ) {
        customer.lastBought =
          invoiceDate;
      }
    }
  }

  const selectedMonthCustomerRows =
    Array.from(
      selectedMonthCustomers.values()
    )
      .map((customer) => ({
        customerName:
          customer.customerName,
        quantity:
          customer.quantity,
        sales:
          customer.sales,
        invoiceCount:
          customer.invoices.size,
        yearsBought:
          Array.from(
            customer.years
          ).sort(
            (first, second) =>
              second - first
          ),
        lastBought:
          customer.lastBought,
      }))
      .filter(
        (customer) =>
          customer.quantity !== 0 ||
          customer.sales !== 0
      )
      .sort(
        (first, second) =>
          second.quantity -
          first.quantity
      );

  const selectedMonthYearRows =
    selectedMonthIndex !== null
      ? Array.from(
          new Set([
            ...historyYears,
            currentYear,
          ])
        )
          .sort(
            (first, second) =>
              second - first
          )
          .map((year) => {
            const data =
              monthlyYearData.get(
                getMonthYearKey(
                  year,
                  selectedMonthIndex
                )
              );

            const isUnavailableCurrentFuture =
              year === currentYear &&
              selectedMonthIndex >
                currentMonthIndex;

            return {
              year,
              qty:
                data?.qty ?? 0,
              sales:
                data?.sales ?? 0,
              invoiceCount:
                data?.invoices.size ??
                0,
              customerCount:
                data?.customers.size ??
                0,
              isUnavailableCurrentFuture,
            };
          })
          .filter(
            (row) =>
              row.year !==
                firstHistoryYear ||
              selectedMonthIndex >=
                firstHistoryMonth
          )
      : [];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0b0f",
        color: "#ffffff",
        padding: "48px 32px",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/products"
            style={{
              color: "#d4af37",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            ← Back to Product Explorer
          </Link>

          {canEditProduct && (
            <Link
              href={`/products/${encodeURIComponent(
                product.productCode
              )}/edit`}
              style={{
                display:
                  "inline-block",
                padding:
                  "11px 18px",
                borderRadius: "9px",
                background:
                  "#d4af37",
                color: "#111111",
                textDecoration:
                  "none",
                fontWeight: "bold",
              }}
            >
              Edit Product
            </Link>
          )}
        </div>

        <div
          style={{
            marginTop: "34px",
            display: "flex",
            justifyContent:
              "space-between",
            gap: "24px",
            alignItems:
              "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                color: "#d4af37",
                fontSize: "13px",
                fontWeight: "bold",
                letterSpacing:
                  "1.5px",
                textTransform:
                  "uppercase",
                marginBottom:
                  "10px",
              }}
            >
              Product Intelligence
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: "46px",
                lineHeight: 1.1,
              }}
            >
              {product.productCode}
            </h1>

            <p
              style={{
                color: "#c7c7c7",
                fontSize: "20px",
                lineHeight: 1.5,
                marginTop: "14px",
                maxWidth: "760px",
              }}
            >
              {product.description}
            </p>
          </div>

          <span
            style={{
              display:
                "inline-block",
              padding: "8px 13px",
              borderRadius:
                "999px",
              background:
                product.active
                  ? "#18351d"
                  : "#3a1b1b",
              color:
                product.active
                  ? "#6eeb83"
                  : "#ff8f8f",
              fontSize: "13px",
              fontWeight: "bold",
            }}
          >
            {product.active
              ? "Active"
              : "Inactive"}
          </span>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              canViewCommercialProductData
                ? "repeat(auto-fit, minmax(210px, 1fr))"
                : "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
            marginTop: "30px",
          }}
        >
          {canViewCommercialProductData && (
            <MetricCard
              label="Supplier"
              value={
                product.supplier ??
                "Not set"
              }
            />
          )}

          {canViewCommercialProductData && (
            <MetricCard
              label="Cost Price"
              value={formatCurrency(
                product.costPrice
              )}
            />
          )}

          <MetricCard
            label="List Price"
            value={formatCurrency(
              product.listPrice
            )}
          />

          {canViewCommercialProductData && (
            <MetricCard
              label="Gross Profit"
              value={formatCurrency(
                grossProfit
              )}
            />
          )}

          {canViewCommercialProductData && (
            <MetricCard
              label="Gross Margin"
              value={
                grossMargin === null
                  ? "—"
                  : `${grossMargin.toFixed(
                      1
                    )}%`
              }
              warning={
                grossMargin !== null &&
                grossMargin < 30
              }
            />
          )}
        </section>
        <section
          style={{
            marginTop: "28px",
            ...panelStyle,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                }}
              >
                Sales Intelligence
              </h2>

              <p
                style={{
                  marginTop: "7px",
                  marginBottom: 0,
                  color: "#999999",
                }}
              >
                {currentYear} year-to-date compared with the
                same period in {previousYear}.
              </p>
            </div>

            <span
              style={{
                color: "#d4af37",
                fontWeight: "bold",
              }}
            >
              Updated to{" "}
              {today.toLocaleDateString("en-GB")}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
              marginTop: "22px",
            }}
          >
            <MetricCard
              label={`${currentYear} Qty Sold`}
              value={formatNumber(currentQty)}
            />

            <MetricCard
              label={`${currentYear} Sales`}
              value={formatCurrency(currentSales)}
            />

            <MetricCard
              label={`${previousYear} Qty Sold`}
              value={formatNumber(previousQty)}
            />

            <MetricCard
              label={`${previousYear} Sales`}
              value={formatCurrency(previousSales)}
            />

            <MetricCard
              label="Sales Movement"
              value={
                salesMovement === null
                  ? currentSales > 0
                    ? "NEW"
                    : "—"
                  : formatPercentageMovement(
                      salesMovement
                    )
              }
              warning={
                salesMovement !== null &&
                salesMovement < 0
              }
            />

            <MetricCard
              label="Qty Movement"
              value={
                quantityMovement === null
                  ? currentQty > 0
                    ? "NEW"
                    : "—"
                  : formatPercentageMovement(
                      quantityMovement
                    )
              }
              warning={
                quantityMovement !== null &&
                quantityMovement < 0
              }
            />

            <MetricCard
              label="Last Sold"
              value={
                lastSold
                  ? lastSold.toLocaleDateString(
                      "en-GB"
                    )
                  : "—"
              }
            />
          </div>

          <div
            style={{
              display: "grid",
             gridTemplateColumns:
  "minmax(360px, 0.85fr) minmax(620px, 1.35fr)",
              gap: "18px",
              marginTop: "24px",
            }}
          >
            <div
              style={{
                background: "#0b0b0f",
                border: "1px solid #292929",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: "6px",
                }}
              >
                Top Customers
              </h3>

              <p
                style={{
                  color: "#999999",
                  marginTop: 0,
                  marginBottom: "18px",
                  fontSize: "14px",
                }}
              >
                Highest-value customers for this product
                during {currentYear}.
              </p>

              {topCustomers.length > 0 ? (
                <div
                  style={{
                    overflowX: "auto",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={headingStyle}>
                          Customer
                        </th>

                        <th style={numberHeadingStyle}>
                          Qty
                        </th>

                        <th style={numberHeadingStyle}>
                          Sales
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {topCustomers.map(
                        (customer, index) => (
                          <tr
                            key={`${customer.customerName}-${index}`}
                          >
                            <td style={cellStyle}>
                              {customer.customerName}
                            </td>

                            <td style={numberCellStyle}>
                              {formatNumber(
                                customer.quantity
                              )}
                            </td>

                            <td style={numberCellStyle}>
                              {formatCurrency(
                                customer.sales
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p
                  style={{
                    color: "#777777",
                  }}
                >
                  No sales found for this product in{" "}
                  {currentYear}.
                </p>
              )}
            </div>

            <div
              style={{
                background: "#0b0b0f",
                border: "1px solid #292929",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: "6px",
                }}
              >
                Recent Sales Activity
              </h3>

              <p
                style={{
                  color: "#999999",
                  marginTop: 0,
                  marginBottom: "18px",
                  fontSize: "14px",
                }}
              >
                Latest invoices and credits containing this
                product.
              </p>

              {recentSalesLines.length > 0 ? (
                <div
                  style={{
                    overflowX: "auto",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                     minWidth: "580px",
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={headingStyle}>
                          Date
                        </th>

                        <th style={headingStyle}>
                          Invoice
                        </th>

                        <th style={headingStyle}>
                          Customer
                        </th>

                        <th style={numberHeadingStyle}>
                          Qty
                        </th>

                        <th style={numberHeadingStyle}>
                          Net
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentSalesLines.map((line) => {
                        const type =
                          String(
                            line.salesInvoice
                              .invoiceType ?? ""
                          )
                            .trim()
                            .toUpperCase();

                        const credit =
                          type === "CRD" ||
                          type === "CREDIT" ||
                          type.includes(
                            "CREDIT NOTE"
                          );

                        const displayQty =
                          credit
                            ? -Math.abs(
                                Number(
                                  line.quantity ??
                                    0
                                )
                              )
                            : Number(
                                line.quantity ??
                                  0
                              );

                        const displayNet =
                          credit
                            ? -Math.abs(
                                Number(
                                  line.netValue ??
                                    0
                                )
                              )
                            : Number(
                                line.netValue ??
                                  0
                              );

                        return (
                          <tr key={line.id}>
                            <td style={cellStyle}>
                              {line.salesInvoice
                                .invoiceDate
                                ? line.salesInvoice.invoiceDate.toLocaleDateString(
                                    "en-GB"
                                  )
                                : "—"}
                            </td>

                            <td style={cellStyle}>
                              {
                                line.salesInvoice
                                  .invoiceNumber
                              }
                            </td>

                            <td style={cellStyle}>
                              {line.salesInvoice
                                .customerName ??
                                line.salesInvoice
                                  .customerAccountCode ??
                                "—"}
                            </td>

                            <td
                              style={{
                                ...numberCellStyle,
                                color: credit
                                  ? "#ff8f8f"
                                  : "#dddddd",
                              }}
                            >
                              {formatNumber(
                                displayQty
                              )}
                            </td>

                            <td
                              style={{
                                ...numberCellStyle,
                                color: credit
                                  ? "#ff8f8f"
                                  : "#dddddd",
                              }}
                            >
                              {formatCurrency(
                                displayNet
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p
                  style={{
                    color: "#777777",
                  }}
                >
                  No invoice activity found for this product
                  in {currentYear}.
                </p>
              )}
            </div>
          </div>
        </section>

          <div
            id="seasonality"
            style={{
              marginTop: "24px",
              background: "#0b0b0f",
              border: "1px solid #292929",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "18px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: "6px",
                  }}
                >
                  Product Seasonality
                </h3>

                <p
                  style={{
                    color: "#999999",
                    marginTop: 0,
                    marginBottom: 0,
                    fontSize: "14px",
                  }}
                >
                  Long-term monthly demand based on all detailed
                  sales history available for this product.
                </p>

                <p
                  style={{
                    color: "#777777",
                    marginTop: "6px",
                    marginBottom: 0,
                    fontSize: "13px",
                  }}
                >
                  History coverage: {historyStartLabel} to{" "}
                  {currentYear} · {historyYears.length} completed{" "}
                  {historyYears.length === 1 ? "year" : "years"} used
                  for the historical averages.
                </p>
              </div>

              <div
                style={{
                  textAlign: "right",
                }}
              >
                <div
                  style={{
                    color: "#999999",
                    fontSize: "13px",
                  }}
                >
                  Strongest Month
                </div>

                <strong
                  style={{
                    display: "block",
                    marginTop: "4px",
                    color: "#d4af37",
                    fontSize: "18px",
                  }}
                >
                  {strongestMonth &&
                  strongestMonth.historicalAverageQty > 0
                    ? strongestMonth.month
                    : "—"}
                </strong>
              </div>
            </div>

            {peakMonthNames.length > 0 && (
              <div
                style={{
                  marginTop: "18px",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  background: "#211e12",
                  border: "1px solid #66571d",
                }}
              >
                <span
                  style={{
                    color: "#999999",
                  }}
                >
                  Long-Term Peak Months:{" "}
                </span>

                <strong
                  style={{
                    color: "#d4af37",
                  }}
                >
                  {peakMonthNames.join(", ")}
                </strong>
              </div>
            )}

            {upcomingDemand && (
              <div
                style={{
                  marginTop: "18px",
                  padding: "16px",
                  borderRadius: "10px",
                  background: "#151515",
                  border: "1px solid #d4af37",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "18px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong
                    style={{
                      color: "#d4af37",
                    }}
                  >
                    Upcoming Demand
                  </strong>

                  <div
                    style={{
                      marginTop: "5px",
                      color: "#cccccc",
                    }}
                  >
                    Historically strongest remaining month:{" "}
                    <strong>
                      {upcomingDemand.month}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      color: "#999999",
                      fontSize: "12px",
                    }}
                  >
                    Historic Avg Qty
                  </div>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "4px",
                      color: "#ffffff",
                      fontSize: "22px",
                    }}
                  >
                    {formatNumber(
                      upcomingDemand.historicalAverageQty
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      color: "#999999",
                      fontSize: "12px",
                    }}
                  >
                    {previousYear} Qty
                  </div>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "4px",
                      color: "#ffffff",
                      fontSize: "22px",
                    }}
                  >
                    {formatNumber(
                      upcomingDemand.previousQty
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      color: "#999999",
                      fontSize: "12px",
                    }}
                  >
                    Historic Avg Sales
                  </div>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "4px",
                      color: "#ffffff",
                      fontSize: "22px",
                    }}
                  >
                    {formatCurrency(
                      upcomingDemand.historicalAverageSales
                    )}
                  </strong>
                </div>
              </div>
            )}

            <div
              style={{
                overflowX: "auto",
                marginTop: "20px",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "980px",
                }}
              >
                <thead>
                  <tr>
                    <th style={headingStyle}>
                      Month
                    </th>

                    <th style={centerHeadingStyle}>
                      Historic Avg Qty
                    </th>

                    <th style={centerHeadingStyle}>
                      {previousYear} Qty
                    </th>

                    <th style={centerHeadingStyle}>
                      {currentYear} Qty
                    </th>

                    <th style={centerHeadingStyle}>
                      Historic Avg Sales
                    </th>

                    <th style={centerHeadingStyle}>
                      {currentYear} Sales
                    </th>

                    <th style={centerHeadingStyle}>
                      Years
                    </th>

                    <th style={centerHeadingStyle}>
                      Seasonality
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {seasonalMonths.map(
                    (month) => {
                      const maxAverage =
                        strongestMonth
                          ?.historicalAverageQty ??
                        0;

                      const ratio =
                        maxAverage > 0
                          ? month.historicalAverageQty /
                            maxAverage
                          : 0;

                      let seasonality =
                        "Low";

                      if (
                        peakMonthNames.includes(
                          month.month
                        )
                      ) {
                        seasonality = "Peak";
                      } else if (
                        ratio >= 0.5
                      ) {
                        seasonality = "High";
                      } else if (
                        ratio >= 0.25
                      ) {
                        seasonality = "Normal";
                      }

                      return (
                        <tr
                          key={month.month}
                        >
                          <td
                            style={{
                              ...cellStyle,
                              fontWeight: "bold",
                            }}
                          >
                            <Link
                              href={`/products/${encodeURIComponent(
                                product.productCode
                              )}?month=${
                                month.monthIndex + 1
                              }#month-breakdown`}
                              title={`See the full ${month.month} sales history for ${product.productCode}`}
                              style={{
                                color:
                                  selectedMonthIndex ===
                                  month.monthIndex
                                    ? "#ffffff"
                                    : "#d4af37",
                                textDecoration:
                                  "none",
                                fontWeight:
                                  "bold",
                                borderBottom:
                                  selectedMonthIndex ===
                                  month.monthIndex
                                    ? "2px solid #d4af37"
                                    : "1px dashed #66571d",
                              }}
                            >
                              {month.month}
                            </Link>
                          </td>

                          <td style={centerCellStyle}>
  {formatNumber(
    month.historicalAverageQty
  )}
</td>

<td style={centerCellStyle}>
  {formatNumber(
    month.previousQty
  )}
</td>

<td style={centerCellStyle}>
  {month.isFutureMonth
    ? "—"
    : month.isCurrentMonth
    ? `${formatNumber(
        month.currentQty
      )} MTD`
    : formatNumber(
        month.currentQty
      )}
</td>

<td style={centerCellStyle}>
  {formatCurrency(
    month.historicalAverageSales
  )}
</td>

<td style={centerCellStyle}>
  {month.isFutureMonth
    ? "—"
    : month.isCurrentMonth
    ? `${formatCurrency(
        month.currentSales
      )} MTD`
    : formatCurrency(
        month.currentSales
      )}
</td>

                          <td style={centerCellStyle}>
                            {month.historicalYearCount}
                          </td>

                          <td style={centerCellStyle}>
                            <span
                              style={{
                                display: "inline-block",
                                minWidth: "70px",
                                padding: "5px 9px",
                                borderRadius: "999px",
                                background:
                                  seasonality === "Peak"
                                    ? "#3b3210"
                                    : seasonality === "High"
                                    ? "#25220f"
                                    : "#171717",
                                color:
                                  seasonality === "Peak" ||
                                  seasonality === "High"
                                    ? "#d4af37"
                                    : "#aaaaaa",
                                fontWeight: "bold",
                                fontSize: "12px",
                              }}
                            >
                              {seasonality}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            {selectedMonth && (
              <div
                id="month-breakdown"
                style={{
                  marginTop: "24px",
                  padding: "20px",
                  background: "#151515",
                  border: "1px solid #d4af37",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                      }}
                    >
                      {selectedMonth.month} Sales History
                    </h3>

                    <p
                      style={{
                        color: "#999999",
                        marginTop: "7px",
                        marginBottom: 0,
                      }}
                    >
                      Full historical demand and customers for{" "}
                      {product.productCode} in{" "}
                      {selectedMonth.month}.
                    </p>
                  </div>

                  <Link
                    href={`/products/${encodeURIComponent(
                      product.productCode
                    )}#seasonality`}
                    style={{
                      color: "#d4af37",
                      textDecoration: "none",
                      fontWeight: "bold",
                    }}
                  >
                    Clear month ×
                  </Link>
                </div>

                <div
                  style={{
                    marginTop: "20px",
                  }}
                >
                  <h4
                    style={{
                      marginTop: 0,
                      marginBottom: "6px",
                      color: "#ffffff",
                    }}
                  >
                    Year-by-Year Demand
                  </h4>

                  <p
                    style={{
                      color: "#888888",
                      marginTop: 0,
                      marginBottom: "14px",
                      fontSize: "13px",
                    }}
                  >
                    See whether the month is consistently strong
                    or driven by one exceptional year.
                  </p>

                  <div
                    style={{
                      overflowX: "auto",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: "700px",
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={centerHeadingStyle}>
                            Year
                          </th>

                          <th style={centerHeadingStyle}>
                            Qty
                          </th>

                          <th style={centerHeadingStyle}>
                            Sales
                          </th>

                          <th style={centerHeadingStyle}>
                            Customers
                          </th>

                          <th style={centerHeadingStyle}>
                            Invoices
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedMonthYearRows.map(
                          (row) => (
                            <tr
                              key={row.year}
                            >
                              <td style={centerCellStyle}>
                                <strong>
                                  {row.year}
                                </strong>
                              </td>

                              <td style={centerCellStyle}>
                                {row.isUnavailableCurrentFuture
                                  ? "—"
                                  : formatNumber(
                                      row.qty
                                    )}
                              </td>

                              <td style={centerCellStyle}>
                                {row.isUnavailableCurrentFuture
                                  ? "—"
                                  : formatCurrency(
                                      row.sales
                                    )}
                              </td>

                              <td style={centerCellStyle}>
                                {row.isUnavailableCurrentFuture
                                  ? "—"
                                  : formatNumber(
                                      row.customerCount
                                    )}
                              </td>

                              <td style={centerCellStyle}>
                                {row.isUnavailableCurrentFuture
                                  ? "—"
                                  : formatNumber(
                                      row.invoiceCount
                                    )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "26px",
                  }}
                >
                  <h4
                    style={{
                      marginTop: 0,
                      marginBottom: "6px",
                      color: "#ffffff",
                    }}
                  >
                    Customers Across Full History
                  </h4>

                  <p
                    style={{
                      color: "#888888",
                      marginTop: 0,
                      marginBottom: "14px",
                      fontSize: "13px",
                    }}
                  >
                    Ranked by total quantity bought in{" "}
                    {selectedMonth.month} across every available
                    year.
                  </p>

                  {selectedMonthCustomerRows.length > 0 ? (
                    <div
                      style={{
                        overflowX: "auto",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          minWidth: "900px",
                        }}
                      >
                        <thead>
                          <tr>
                            <th style={headingStyle}>
                              Customer
                            </th>

                            <th style={centerHeadingStyle}>
                              Total Qty
                            </th>

                            <th style={centerHeadingStyle}>
                              Total Sales
                            </th>

                            <th style={centerHeadingStyle}>
                              Years Bought
                            </th>

                            <th style={centerHeadingStyle}>
                              Invoices
                            </th>

                            <th style={centerHeadingStyle}>
                              Last Bought
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {selectedMonthCustomerRows.map(
                            (
                              customer,
                              index
                            ) => (
                              <tr
                                key={`${customer.customerName}-${index}`}
                              >
                                <td style={cellStyle}>
                                  {customer.customerName}
                                </td>

                                <td style={centerCellStyle}>
                                  {formatNumber(
                                    customer.quantity
                                  )}
                                </td>

                                <td style={centerCellStyle}>
                                  {formatCurrency(
                                    customer.sales
                                  )}
                                </td>

                                <td style={centerCellStyle}>
                                  {customer.yearsBought.join(
                                    ", "
                                  )}
                                </td>

                                <td style={centerCellStyle}>
                                  {formatNumber(
                                    customer.invoiceCount
                                  )}
                                </td>

                                <td style={centerCellStyle}>
                                  {customer.lastBought
                                    ? customer.lastBought.toLocaleDateString(
                                        "en-GB"
                                      )
                                    : "—"}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p
                      style={{
                        color: "#777777",
                      }}
                    >
                      No sales found for this product in{" "}
                      {selectedMonth.month}.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "18px",
            marginTop: "28px",
          }}
        >
          <div style={panelStyle}>
            <h2
              style={{
                marginTop: 0,
              }}
            >
              Product Information
            </h2>

            <InformationRow
              label="Product Code"
              value={
                product.productCode
              }
            />

            <InformationRow
              label="Description"
              value={
                product.description
              }
            />

            {canViewCommercialProductData && (
              <InformationRow
                label="Supplier"
                value={
                  product.supplier ??
                  "Not set"
                }
              />
            )}

            <InformationRow
              label="Category"
              value={
                product.category ??
                "Not set"
              }
            />

            <InformationRow
              label="Brand"
              value={
                product.brand ??
                "Not set"
              }
            />

            <InformationRow
              label="Created"
              value={product.createdAt.toLocaleDateString(
                "en-GB"
              )}
            />

            <InformationRow
              label="Last Updated"
              value={product.updatedAt.toLocaleString(
                "en-GB"
              )}
            />
          </div>

          <div style={panelStyle}>
            <h2
              style={{
                marginTop: 0,
              }}
            >
              Odin Analysis
            </h2>

            {canViewCommercialProductData ? (
              <>
                <Recommendation
                  title="Pricing completeness"
                  text={
                    product.costPrice ===
                      null ||
                    product.listPrice ===
                      null
                      ? "This product is missing pricing information."
                      : "Cost and list prices are both available."
                  }
                  warning={
                    product.costPrice ===
                      null ||
                    product.listPrice ===
                      null
                  }
                />

                <Recommendation
                  title="Gross margin"
                  text={
                    grossMargin === null
                      ? "OdinIQ cannot calculate gross margin until both prices are present."
                      : grossMargin <
                          30
                        ? `Gross margin is ${grossMargin.toFixed(
                            1
                          )}%, which is below the 30% review threshold.`
                        : `Gross margin is ${grossMargin.toFixed(
                            1
                          )}% at list price.`
                  }
                  warning={
                    grossMargin !==
                      null &&
                    grossMargin < 30
                  }
                />

                <Recommendation
                  title="Merchant pricing"
                  text={
                    merchantPrices.length ===
                    0
                      ? "No merchant pricing has been stored for this product yet."
                      : `${merchantPrices.length} merchant pricing records are available.`
                  }
                  warning={
                    merchantPrices.length ===
                    0
                  }
                />
              </>
            ) : (
              <Recommendation
                title="Product status"
                text={
                  product.active
                    ? "This product is currently active."
                    : "This product is currently inactive."
                }
                warning={
                  !product.active
                }
              />
            )}
          </div>
        </section>

        {canViewCommercialProductData && (
          <section
            style={{
              marginTop: "28px",
              ...panelStyle,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: "18px",
                alignItems:
                  "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom:
                      "6px",
                  }}
                >
                  Merchant Pricing
                </h2>

                <p
                  style={{
                    color:
                      "#999999",
                    margin: 0,
                  }}
                >
                  Customer-specific
                  discounts and
                  calculated selling
                  prices.
                </p>
              </div>

              <span
                style={{
                  color: "#d4af37",
                  fontWeight: "bold",
                }}
              >
                {
                  merchantPrices.length
                }{" "}
                records
              </span>
            </div>

            {merchantPrices.length >
            0 ? (
              <div
                style={{
                  overflowX:
                    "auto",
                  marginTop:
                    "22px",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse",
                    minWidth:
                      "700px",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={
                          headingStyle
                        }
                      >
                        Merchant
                      </th>

                      <th
                        style={
                          headingStyle
                        }
                      >
                        Discount
                      </th>

                      <th
                        style={
                          headingStyle
                        }
                      >
                        Net Sell Price
                      </th>

                      <th
                        style={
                          headingStyle
                        }
                      >
                        Profit
                      </th>

                      <th
                        style={
                          headingStyle
                        }
                      >
                        Margin
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {merchantPrices.map(
                      (
                        merchantPrice
                      ) => {
                        const discount =
                          merchantPrice.discount;

                        const netSellPrice =
                          product.listPrice !==
                            null &&
                          discount !==
                            null
                            ? product.listPrice *
                              (1 -
                                discount /
                                  100)
                            : null;

                        const profit =
                          netSellPrice !==
                            null &&
                          product.costPrice !==
                            null
                            ? netSellPrice -
                              product.costPrice
                            : null;

                        const margin =
                          netSellPrice !==
                            null &&
                          netSellPrice >
                            0 &&
                          profit !==
                            null
                            ? (profit /
                                netSellPrice) *
                              100
                            : null;

                        return (
                          <tr
                            key={
                              merchantPrice.id
                            }
                          >
                            <td
                              style={
                                cellStyle
                              }
                            >
                              {
                                merchantPrice.merchantName
                              }
                            </td>

                            <td
                              style={
                                cellStyle
                              }
                            >
                              {discount ===
                              null
                                ? "—"
                                : `${discount.toFixed(
                                    1
                                  )}%`}
                            </td>

                            <td
                              style={
                                cellStyle
                              }
                            >
                              {formatCurrency(
                                netSellPrice
                              )}
                            </td>

                            <td
                              style={
                                cellStyle
                              }
                            >
                              {formatCurrency(
                                profit
                              )}
                            </td>

                            <td
                              style={
                                cellStyle
                              }
                            >
                              {margin ===
                              null
                                ? "—"
                                : `${margin.toFixed(
                                    1
                                  )}%`}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                style={{
                  marginTop: "22px",
                  padding: "24px",
                  background:
                    "#0b0b0f",
                  border:
                    "1px solid #292929",
                  borderRadius:
                    "10px",
                  color: "#999999",
                  textAlign:
                    "center",
                }}
              >
                Merchant pricing will
                appear here once
                discount records are
                imported.
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div
      style={{
        background: warning
          ? "#211e12"
          : "#151515",
        border: warning
          ? "1px solid #66571d"
          : "1px solid #2b2b2b",
        borderRadius: "14px",
        padding: "22px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          color: "#999999",
          margin: 0,
        }}
      >
        {label}
      </p>

      <h2
        style={{
          marginTop: "12px",
          marginBottom: 0,
          fontSize: "28px",
          color: warning
            ? "#d4af37"
            : "#ffffff",
        }}
      >
        {value}
      </h2>
    </div>
  );
}

function InformationRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "140px 1fr",
        gap: "16px",
        padding: "14px 0",
        borderBottom:
          "1px solid #242424",
      }}
    >
      <span
        style={{
          color: "#999999",
        }}
      >
        {label}
      </span>

      <strong>{value}</strong>
    </div>
  );
}

function Recommendation({
  title,
  text,
  warning,
}: {
  title: string;
  text: string;
  warning: boolean;
}) {
  return (
    <div
      style={{
        marginTop: "14px",
        padding: "16px",
        background: warning
          ? "#211e12"
          : "#0b0b0f",
        border: warning
          ? "1px solid #66571d"
          : "1px solid #292929",
        borderRadius: "10px",
      }}
    >
      <strong
        style={{
          color: "#d4af37",
        }}
      >
        {title}
      </strong>

      <p
        style={{
          marginBottom: 0,
          color: "#cccccc",
          lineHeight: 1.5,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function formatCurrency(
  value: number | null
): string {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-GB",
    {
      style: "currency",
      currency: "GBP",
    }
  ).format(value);
}

const panelStyle = {
  background: "#151515",
  border:
    "1px solid #2b2b2b",
  borderRadius: "14px",
  padding: "24px",
};

const headingStyle = {
  padding: "14px",
  textAlign: "left" as const,
  color: "#d4af37",
  borderBottom:
    "1px solid #292929",
};

const cellStyle = {
  padding: "14px",
  color: "#dddddd",
  borderBottom:
    "1px solid #242424",
};

const numberHeadingStyle = {
  ...headingStyle,
  textAlign: "right" as const,
};

const numberCellStyle = {
  ...cellStyle,
  textAlign: "right" as const,
  whiteSpace: "nowrap" as const,
};

const centerHeadingStyle = {
  ...headingStyle,
  textAlign: "center" as const,
};

const centerCellStyle = {
  ...cellStyle,
  textAlign: "center" as const,
  whiteSpace: "nowrap" as const,
};

function formatNumber(
  value: number
): string {
  return new Intl.NumberFormat(
    "en-GB",
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function formatPercentageMovement(
  value: number
): string {
  const sign =
    value > 0 ? "+" : "";

  return `${sign}${value.toFixed(1)}%`;
}
