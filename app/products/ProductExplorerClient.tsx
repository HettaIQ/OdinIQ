"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Product = {
  id: number;
  productCode: string;
  description: string;
  supplier?: string | null;
  costPrice?: number | null;
  listPrice: number | null;
  active: boolean;

  qtySoldYtd: number;
  salesYtd: number;
  previousYearQtyYtd: number;
  previousYearSalesYtd: number;
  salesMovement: number | null;
  lastSold: string | null;
};

type ProductExplorerClientProps = {
  products: Product[];
  canViewCommercialProductData: boolean;
  period: string;
};

type SortOption =
  | "code-asc"
  | "code-desc"
  | "description-asc"
  | "supplier-asc"
  | "cost-asc"
  | "cost-desc"
  | "list-asc"
  | "list-desc"
  | "margin-asc"
  | "margin-desc"
  | "qty-desc"
  | "qty-asc"
  | "sales-desc"
  | "sales-asc"
  | "previous-sales-desc"
  | "movement-desc"
  | "movement-asc"
  | "last-sold-desc";

export default function ProductExplorerClient({
  products,
  canViewCommercialProductData,
  period,
}: ProductExplorerClientProps) {
  const [query, setQuery] = useState("");
  const [supplier, setSupplier] = useState("");
  const [sort, setSort] =
    useState<SortOption>("code-asc");
  const [page, setPage] = useState(1);

  const pageSize = 25;

  const suppliers = useMemo(() => {
    if (!canViewCommercialProductData) {
      return [];
    }

    return Array.from(
      new Set(
        products
          .map((product) =>
            product.supplier?.trim()
          )
          .filter(
            (value): value is string =>
              Boolean(value)
          )
      )
    ).sort((first, second) =>
      first.localeCompare(second)
    );
  }, [
    products,
    canViewCommercialProductData,
  ]);

  const filteredProducts = useMemo(() => {
    const normalisedQuery =
      query.trim().toLowerCase();

    const filtered = products.filter(
      (product) => {
        const matchesBasicQuery =
          normalisedQuery === "" ||
          product.productCode
            .toLowerCase()
            .includes(normalisedQuery) ||
          product.description
            .toLowerCase()
            .includes(normalisedQuery);

        const matchesSupplierQuery =
          canViewCommercialProductData &&
          Boolean(
            product.supplier
              ?.toLowerCase()
              .includes(normalisedQuery)
          );

        const matchesQuery =
          matchesBasicQuery ||
          matchesSupplierQuery;

        const matchesSupplier =
          !canViewCommercialProductData ||
          supplier === "" ||
          String(product.supplier ?? "")
            .trim()
            .toLowerCase() ===
            supplier
              .trim()
              .toLowerCase();

        return (
          matchesQuery &&
          matchesSupplier
        );
      }
    );

    return [...filtered].sort(
      (first, second) => {
        const firstMargin =
          calculateMargin(first);

        const secondMargin =
          calculateMargin(second);

        switch (sort) {
          case "code-desc":
            return second.productCode.localeCompare(
              first.productCode
            );

          case "description-asc":
            return first.description.localeCompare(
              second.description
            );

          case "supplier-asc":
            if (
              !canViewCommercialProductData
            ) {
              return first.productCode.localeCompare(
                second.productCode
              );
            }

            return (
              first.supplier ?? ""
            ).localeCompare(
              second.supplier ?? ""
            );

          case "cost-asc":
            if (
              !canViewCommercialProductData
            ) {
              return 0;
            }

            return compareNullableNumbers(
              first.costPrice ?? null,
              second.costPrice ?? null
            );

          case "cost-desc":
            if (
              !canViewCommercialProductData
            ) {
              return 0;
            }

            return compareNullableNumbers(
              second.costPrice ?? null,
              first.costPrice ?? null
            );

          case "list-asc":
            return compareNullableNumbers(
              first.listPrice,
              second.listPrice
            );

          case "list-desc":
            return compareNullableNumbers(
              second.listPrice,
              first.listPrice
            );

          case "margin-asc":
            if (
              !canViewCommercialProductData
            ) {
              return 0;
            }

            return compareNullableNumbers(
              firstMargin,
              secondMargin
            );

          case "margin-desc":
            if (
              !canViewCommercialProductData
            ) {
              return 0;
            }

            return compareNullableNumbers(
              secondMargin,
              firstMargin
            );

          case "qty-desc":
            return (
              second.qtySoldYtd -
              first.qtySoldYtd
            );

          case "qty-asc":
            return (
              first.qtySoldYtd -
              second.qtySoldYtd
            );

          case "sales-desc":
            return (
              second.salesYtd -
              first.salesYtd
            );

          case "sales-asc":
            return (
              first.salesYtd -
              second.salesYtd
            );

          case "previous-sales-desc":
            return (
              second.previousYearSalesYtd -
              first.previousYearSalesYtd
            );

          case "movement-desc":
            return compareGrowthDescending(
              first,
              second
            );

          case "movement-asc":
            return compareNullableNumbers(
              first.salesMovement,
              second.salesMovement
            );

          case "last-sold-desc":
            return compareDatesDescending(
              first.lastSold,
              second.lastSold
            );

          default:
            return first.productCode.localeCompare(
              second.productCode
            );
        }
      }
    );
  }, [
    products,
    query,
    supplier,
    sort,
    canViewCommercialProductData,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredProducts.length /
        pageSize
    )
  );

  const safePage = Math.min(
    page,
    totalPages
  );

  const visibleProducts =
    canViewCommercialProductData &&
    supplier
      ? filteredProducts
      : filteredProducts.slice(
          (safePage - 1) *
            pageSize,
          safePage * pageSize
        );

  function resetPage() {
    setPage(1);
  }

  function selectSupplier(
    supplierName: string
  ) {
    setSupplier(
      supplierName.trim()
    );
    setPage(1);
  }

  const periodLabels =
    getPeriodLabels(period);

  return (
    <>

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginTop: "24px",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setSort("sales-desc");
            setPage(1);
          }}
          style={quickSortButtonStyle(
            sort === "sales-desc"
          )}
        >
          🏆 Best Sellers by Sales
        </button>

        <button
          type="button"
          onClick={() => {
            setSort("qty-desc");
            setPage(1);
          }}
          style={quickSortButtonStyle(
            sort === "qty-desc"
          )}
        >
          📦 Best Sellers by Quantity
        </button>

        <button
          type="button"
          onClick={() => {
            setSort("movement-desc");
            setPage(1);
          }}
          style={quickSortButtonStyle(
            sort === "movement-desc"
          )}
        >
          📈 Biggest Growth
        </button>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
          marginTop: "14px",
        }}
      >
        <span
          style={{
            color: "#777777",
            fontSize: "14px",
            fontWeight: "bold",
            marginRight: "4px",
          }}
        >
          Sales period:
        </span>

        <Link
          href="/products?period=this-month"
          style={periodButtonStyle(
            period === "this-month"
          )}
        >
          This Month
        </Link>

        <Link
          href="/products?period=last-month"
          style={periodButtonStyle(
            period === "last-month"
          )}
        >
          Last Month
        </Link>

        <Link
          href="/products?period=ytd"
          style={periodButtonStyle(
            period === "ytd"
          )}
        >
          YTD
        </Link>

        <Link
          href="/products?period=last-12-months"
          style={periodButtonStyle(
            period === "last-12-months"
          )}
        >
          Last 12 Months
        </Link>
      </div>
      <div
        style={{
          marginTop: "30px",
          display: "grid",
          gridTemplateColumns:
            canViewCommercialProductData
              ? "minmax(240px, 1.5fr) minmax(180px, 1fr) minmax(190px, 1fr)"
              : "minmax(240px, 1.5fr) minmax(190px, 1fr)",
          gap: "12px",
          padding: "20px",
          background: "#151515",
          border:
            "1px solid #2b2b2b",
          borderRadius: "14px",
        }}
      >
        <input
          value={query}
          onChange={(event) => {
            setQuery(
              event.target.value
            );
            resetPage();
          }}
          placeholder={
            canViewCommercialProductData
              ? "Search code, description or supplier"
              : "Search code or description"
          }
          style={inputStyle}
        />

        {canViewCommercialProductData && (
          <select
            value={supplier}
            onChange={(event) => {
              setSupplier(
                event.target.value
              );
              resetPage();
            }}
            style={inputStyle}
          >
            <option value="">
              All suppliers
            </option>

            {suppliers.map(
              (supplierName) => (
                <option
                  key={
                    supplierName
                  }
                  value={
                    supplierName
                  }
                >
                  {supplierName}
                </option>
              )
            )}
          </select>
        )}

        <select
          value={sort}
          onChange={(event) => {
            setSort(
              event.target
                .value as SortOption
            );
            resetPage();
          }}
          style={inputStyle}
        >
          <option value="code-asc">
            Code A–Z
          </option>

          <option value="code-desc">
            Code Z–A
          </option>

          <option value="description-asc">
            Description A–Z
          </option>

          <option value="qty-desc">
            Qty sold — highest
          </option>

          <option value="qty-asc">
            Qty sold — lowest
          </option>

          <option value="sales-desc">
            {periodLabels.sales} — highest
          </option>

          <option value="sales-asc">
            {periodLabels.sales} — lowest
          </option>

          <option value="previous-sales-desc">
            {periodLabels.previousSales} — highest
          </option>

          <option value="movement-desc">
            Movement — biggest increase
          </option>

          <option value="movement-asc">
            Movement — biggest decline
          </option>

          <option value="last-sold-desc">
            Most recently sold
          </option>

          {canViewCommercialProductData && (
            <>
              <option value="supplier-asc">
                Supplier A–Z
              </option>

              <option value="cost-asc">
                Cost low to high
              </option>

              <option value="cost-desc">
                Cost high to low
              </option>
            </>
          )}

          <option value="list-asc">
            List low to high
          </option>

          <option value="list-desc">
            List high to low
          </option>

          {canViewCommercialProductData && (
            <>
              <option value="margin-asc">
                Margin low to high
              </option>

              <option value="margin-desc">
                Margin high to low
              </option>
            </>
          )}
        </select>
      </div>

      {canViewCommercialProductData &&
        supplier && (
          <div
            style={{
              marginTop: "14px",
              display: "flex",
              alignItems:
                "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                color: "#999999",
                fontSize: "14px",
              }}
            >
              Showing products
              supplied by
            </span>

            <strong
              style={{
                color: "#d4af37",
              }}
            >
              {supplier}
            </strong>

            <button
              type="button"
              onClick={() => {
                setSupplier("");
                setPage(1);
              }}
              style={{
                border:
                  "1px solid #444444",
                background:
                  "#151515",
                color: "#ffffff",
                borderRadius: "8px",
                padding:
                  "6px 10px",
                cursor: "pointer",
              }}
            >
              Clear supplier
            </button>
          </div>
        )}

      <div
        style={{
          marginTop: "18px",
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        <p
          style={{
            color: "#999999",
            margin: 0,
          }}
        >
          Showing{" "}
          <strong
            style={{
              color: "#ffffff",
            }}
          >
            {filteredProducts.length === 0
              ? "0"
              : supplier
              ? filteredProducts.length
              : `${(safePage - 1) * pageSize + 1}-${Math.min(
                  safePage * pageSize,
                  filteredProducts.length
                )}`}
          </strong>{" "}
          of{" "}
          <strong
            style={{
              color: "#ffffff",
            }}
          >
            {filteredProducts.length}
          </strong>{" "}
          products
        </p>

        {canViewCommercialProductData && (
          <Link
            href="/products/import"
            style={{
              color: "#d4af37",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            Import product file →
          </Link>
        )}
      </div>

      <section
        style={{
          marginTop: "18px",
          background: "#151515",
          border:
            "1px solid #2b2b2b",
          borderRadius: "14px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse:
                "collapse",
              minWidth:
                canViewCommercialProductData
                  ? "1650px"
                  : "1200px",
            }}
          >
            <thead>
              <tr
                style={{
                  background:
                    "#0b0b0f",
                }}
              >
                <th style={headingStyle}>
                  Code
                </th>

                <th style={headingStyle}>
                  Description
                </th>

                {canViewCommercialProductData && (
                  <th
                    style={headingStyle}
                  >
                    Supplier
                  </th>
                )}

                <th
  style={{
    ...numberHeadingStyle,
    cursor: "pointer",
    userSelect: "none",
  }}
  onClick={() => {
    setSort(
      sort === "qty-desc"
        ? "qty-asc"
        : "qty-desc"
    );
    setPage(1);
  }}
  title="Click to sort by quantity sold"
>
  {periodLabels.qty}{" "}
  {sort === "qty-desc"
    ? "↓"
    : sort === "qty-asc"
    ? "↑"
    : ""}
</th>

                <th
                  style={numberHeadingStyle}
                >
                  {periodLabels.sales}
                </th>

                <th
                  style={numberHeadingStyle}
                >
                  {periodLabels.previousSales}
                </th>

                <th
                  style={numberHeadingStyle}
                >
                  Movement
                </th>

                <th style={headingStyle}>
                  Last Sold
                </th>

                {canViewCommercialProductData && (
                  <th
                    style={
                      numberHeadingStyle
                    }
                  >
                    Cost
                  </th>
                )}

                <th
                  style={
                    numberHeadingStyle
                  }
                >
                  List
                </th>

                {canViewCommercialProductData && (
                  <th
                    style={
                      numberHeadingStyle
                    }
                  >
                    Gross Margin
                  </th>
                )}

                <th style={headingStyle}>
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleProducts.map(
                (product) => {
                  const grossMargin =
                    canViewCommercialProductData
                      ? calculateMargin(
                          product
                        )
                      : null;

                  return (
                    <tr
                      key={product.id}
                    >
                      <td
                        style={cellStyle}
                      >
                        <Link
                          href={`/products/${encodeURIComponent(
                            product.productCode
                          )}`}
                          style={{
                            color:
                              "#d4af37",
                            textDecoration:
                              "none",
                            fontWeight:
                              "bold",
                          }}
                        >
                          {
                            product.productCode
                          }
                        </Link>
                      </td>

                      <td
                        style={cellStyle}
                      >
                        {
                          product.description
                        }
                      </td>

                      {canViewCommercialProductData && (
                        <td
                          style={
                            cellStyle
                          }
                        >
                          {product.supplier ? (
                            <button
                              type="button"
                              onClick={() =>
                                selectSupplier(
                                  product.supplier!
                                )
                              }
                              title={`Show all products supplied by ${product.supplier}`}
                              style={{
                                padding: 0,
                                border:
                                  "none",
                                background:
                                  "transparent",
                                color:
                                  "#d4af37",
                                cursor:
                                  "pointer",
                                font:
                                  "inherit",
                                textDecoration:
                                  "underline",
                                textUnderlineOffset:
                                  "3px",
                              }}
                            >
                              {
                                product.supplier
                              }
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      )}

                      <td
                        style={
                          numberCellStyle
                        }
                      >
                        {formatQuantity(
                          product.qtySoldYtd
                        )}
                      </td>

                      <td
                        style={
                          numberCellStyle
                        }
                      >
                        {formatCurrency(
                          product.salesYtd
                        )}
                      </td>

                      <td
                        style={
                          numberCellStyle
                        }
                      >
                        {formatCurrency(
                          product.previousYearSalesYtd
                        )}
                      </td>

                      <td
                        style={
                          numberCellStyle
                        }
                      >
                        <span
                          style={
                            movementStyle(
                              product.salesMovement
                            )
                          }
                        >
                          {formatMovement(
                            product.salesMovement,
                            product.salesYtd,
                            product.previousYearSalesYtd
                          )}
                        </span>
                      </td>

                      <td
                        style={cellStyle}
                      >
                        {formatDate(
                          product.lastSold
                        )}
                      </td>

                      {canViewCommercialProductData && (
                        <td
                          style={
                            numberCellStyle
                          }
                        >
                          {formatCurrency(
                            product.costPrice ??
                              null
                          )}
                        </td>
                      )}

                      <td
                        style={
                          numberCellStyle
                        }
                      >
                        {formatCurrency(
                          product.listPrice
                        )}
                      </td>

                      {canViewCommercialProductData && (
                        <td
                          style={
                            numberCellStyle
                          }
                        >
                          {grossMargin ===
                          null
                            ? "—"
                            : `${grossMargin.toFixed(
                                1
                              )}%`}
                        </td>
                      )}

                      <td
                        style={cellStyle}
                      >
                        <span
                          style={{
                            display:
                              "inline-block",
                            padding:
                              "5px 9px",
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
                            fontSize:
                              "12px",
                            fontWeight:
                              "bold",
                          }}
                        >
                          {product.active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>

        {filteredProducts.length ===
          0 && (
          <div
            style={{
              padding: "32px",
              textAlign:
                "center",
              color: "#999999",
            }}
          >
            No products match the
            current search and
            filters.
          </div>
        )}
      </section>

      {!supplier &&
        filteredProducts.length >
          pageSize && (
          <div
            style={{
              marginTop: "18px",
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: "14px",
              flexWrap: "wrap",
            }}
          >
            <p
              style={{
                color: "#999999",
                margin: 0,
              }}
            >
              Page {safePage} of{" "}
              {totalPages}
            </p>

            <div
              style={{
                display: "flex",
                gap: "10px",
              }}
            >
              <button
                type="button"
                disabled={
                  safePage === 1
                }
                onClick={() =>
                  setPage(
                    (
                      currentPage
                    ) =>
                      Math.max(
                        1,
                        currentPage -
                          1
                      )
                  )
                }
                style={paginationButtonStyle(
                  safePage === 1
                )}
              >
                ← Previous
              </button>

              <button
                type="button"
                disabled={
                  safePage ===
                  totalPages
                }
                onClick={() =>
                  setPage(
                    (
                      currentPage
                    ) =>
                      Math.min(
                        totalPages,
                        currentPage +
                          1
                      )
                  )
                }
                style={paginationButtonStyle(
                  safePage ===
                    totalPages
                )}
              >
                Next →
              </button>
            </div>
          </div>
        )}
    </>
  );
}

function compareGrowthDescending(
  first: Product,
  second: Product
) {
  /*
   * Biggest Growth should prioritise genuine
   * percentage growth from an existing
   * comparison-period sales value.
   *
   * NEW products (sales now, zero before)
   * come after genuine percentage growth.
   * Products with no current sales come last.
   */
  const firstHasCurrentSales =
    first.salesYtd > 0;
  const secondHasCurrentSales =
    second.salesYtd > 0;

  if (
    firstHasCurrentSales !==
    secondHasCurrentSales
  ) {
    return firstHasCurrentSales
      ? -1
      : 1;
  }

  const firstHasMovement =
    first.salesMovement !== null;
  const secondHasMovement =
    second.salesMovement !== null;

  if (
    firstHasMovement &&
    secondHasMovement
  ) {
    const movementDifference =
      (second.salesMovement ?? 0) -
      (first.salesMovement ?? 0);

    if (movementDifference !== 0) {
      return movementDifference;
    }

    return (
      second.salesYtd -
      first.salesYtd
    );
  }

  if (
    firstHasMovement !==
    secondHasMovement
  ) {
    return firstHasMovement
      ? -1
      : 1;
  }

  const firstIsNew =
    first.salesYtd > 0 &&
    first.previousYearSalesYtd === 0;

  const secondIsNew =
    second.salesYtd > 0 &&
    second.previousYearSalesYtd === 0;

  if (firstIsNew !== secondIsNew) {
    return firstIsNew
      ? -1
      : 1;
  }

  return (
    second.salesYtd -
    first.salesYtd
  );
}

function getPeriodLabels(
  period: string
) {
  const now = new Date();

  const monthFormatter =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }
    );

  switch (period) {
    case "this-month":
      return {
        qty: "Qty This Month",
        sales: `Sales ${monthFormatter.format(
          now
        )}`,
        previousSales: `Sales ${monthFormatter.format(
          new Date(
            Date.UTC(
              now.getUTCFullYear() - 1,
              now.getUTCMonth(),
              1
            )
          )
        )}`,
      };

    case "last-month": {
      const currentMonth =
        new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth() - 1,
            1
          )
        );

      const previousMonth =
        new Date(
          Date.UTC(
            currentMonth.getUTCFullYear() - 1,
            currentMonth.getUTCMonth(),
            1
          )
        );

      return {
        qty: `Qty ${monthFormatter.format(
          currentMonth
        )}`,
        sales: `Sales ${monthFormatter.format(
          currentMonth
        )}`,
        previousSales: `Sales ${monthFormatter.format(
          previousMonth
        )}`,
      };
    }

    case "last-12-months":
      return {
        qty: "Qty Last 12 Months",
        sales: "Sales Last 12 Months",
        previousSales:
          "Previous 12 Months",
      };

    case "ytd":
    default:
      return {
        qty: "Qty Sold YTD",
        sales: `Sales ${now.getUTCFullYear()} YTD`,
        previousSales: `Sales ${
          now.getUTCFullYear() - 1
        } YTD`,
      };
  }
}

function calculateMargin(
  product: Product
): number | null {
  const costPrice =
    product.costPrice ?? null;

  if (
    costPrice === null ||
    product.listPrice === null ||
    product.listPrice <= 0
  ) {
    return null;
  }

  return (
    ((product.listPrice -
      costPrice) /
      product.listPrice) *
    100
  );
}

function compareNullableNumbers(
  first: number | null,
  second: number | null
): number {
  if (
    first === null &&
    second === null
  ) {
    return 0;
  }

  if (first === null) {
    return 1;
  }

  if (second === null) {
    return -1;
  }

  return first - second;
}

function compareDatesDescending(
  first: string | null,
  second: string | null
) {
  if (!first && !second) {
    return 0;
  }

  if (!first) {
    return 1;
  }

  if (!second) {
    return -1;
  }

  return (
    new Date(second).getTime() -
    new Date(first).getTime()
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function formatQuantity(
  value: number
) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function formatMovement(
  movement: number | null,
  currentSales: number,
  previousSales: number
) {
  if (
    movement === null &&
    previousSales === 0 &&
    currentSales > 0
  ) {
    return "NEW";
  }

  if (movement === null) {
    return "—";
  }

  const prefix =
    movement > 0 ? "+" : "";

  return `${prefix}${movement.toFixed(
    1
  )}%`;
}

function movementStyle(
  movement: number | null
) {
  if (movement === null) {
    return {
      color: "#d4af37",
      fontWeight: "bold",
    };
  }

  if (movement > 0) {
    return {
      color: "#6eeb83",
      fontWeight: "bold",
    };
  }

  if (movement < 0) {
    return {
      color: "#ff8f8f",
      fontWeight: "bold",
    };
  }

  return {
    color: "#bbbbbb",
    fontWeight: "bold",
  };
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      timeZone: "UTC",
    }
  ).format(new Date(value));
}

function paginationButtonStyle(
  disabled: boolean
) {
  return {
    padding: "10px 16px",
    borderRadius: "8px",
    border:
      "1px solid #333333",
    background: disabled
      ? "#1a1a1a"
      : "#d4af37",
    color: disabled
      ? "#666666"
      : "#111111",
    cursor: disabled
      ? "not-allowed"
      : "pointer",
    fontWeight: "bold",
  };
}

const inputStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding: "12px",
  background: "#0b0b0f",
  color: "#ffffff",
  border:
    "1px solid #333333",
  borderRadius: "8px",
};

const headingStyle = {
  padding: "14px",
  textAlign: "left" as const,
  color: "#d4af37",
  borderBottom:
    "1px solid #292929",
  fontSize: "13px",
  whiteSpace: "nowrap" as const,
};

const numberHeadingStyle = {
  ...headingStyle,
  textAlign: "right" as const,
};

const cellStyle = {
  padding: "14px",
  color: "#dddddd",
  borderBottom:
    "1px solid #242424",
  fontSize: "14px",
  verticalAlign: "top" as const,
};

const numberCellStyle = {
  ...cellStyle,
  textAlign: "right" as const,
  whiteSpace: "nowrap" as const,
};
function quickSortButtonStyle(
  active: boolean
) {
  return {
    padding: "11px 16px",
    borderRadius: "9px",
    border: active
      ? "1px solid #d4af37"
      : "1px solid #333333",
    background: active
      ? "#d4af37"
      : "#151515",
    color: active
      ? "#111111"
      : "#ffffff",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px",
  };
}
function periodButtonStyle(
  active: boolean
) {
  return {
    display: "inline-block",
    padding: "8px 13px",
    borderRadius: "8px",
    border: active
      ? "1px solid #d4af37"
      : "1px solid #333333",
    background: active
      ? "#2a2512"
      : "#151515",
    color: active
      ? "#d4af37"
      : "#bbbbbb",
    textDecoration: "none",
    fontWeight: active
      ? "bold"
      : "normal",
    fontSize: "13px",
  };
}