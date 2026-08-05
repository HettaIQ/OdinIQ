"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Product = {
  id: number;
  productCode: string;
  description: string;
  supplier: string | null;
  costPrice: number | null;
  listPrice: number | null;
  active: boolean;
};

type ProductExplorerClientProps = {
  products: Product[];
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
  | "margin-desc";

export default function ProductExplorerClient({
  products,
}: ProductExplorerClientProps) {
  const [query, setQuery] = useState("");
  const [supplier, setSupplier] = useState("");
  const [sort, setSort] = useState<SortOption>("code-asc");
  const [page, setPage] = useState(1);

  const pageSize = 25;

  const suppliers = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((product) => product.supplier?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((first, second) => first.localeCompare(second));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const matchesQuery =
        normalisedQuery === "" ||
        product.productCode.toLowerCase().includes(normalisedQuery) ||
        product.description.toLowerCase().includes(normalisedQuery) ||
        product.supplier?.toLowerCase().includes(normalisedQuery);

      const matchesSupplier =
        supplier === "" || product.supplier === supplier;

      return matchesQuery && matchesSupplier;
    });

    return [...filtered].sort((first, second) => {
      const firstMargin = calculateMargin(first);
      const secondMargin = calculateMargin(second);

      switch (sort) {
        case "code-desc":
          return second.productCode.localeCompare(first.productCode);

        case "description-asc":
          return first.description.localeCompare(second.description);

        case "supplier-asc":
          return (first.supplier ?? "").localeCompare(
            second.supplier ?? ""
          );

        case "cost-asc":
          return compareNullableNumbers(first.costPrice, second.costPrice);

        case "cost-desc":
          return compareNullableNumbers(second.costPrice, first.costPrice);

        case "list-asc":
          return compareNullableNumbers(first.listPrice, second.listPrice);

        case "list-desc":
          return compareNullableNumbers(second.listPrice, first.listPrice);

        case "margin-asc":
          return compareNullableNumbers(firstMargin, secondMargin);

        case "margin-desc":
          return compareNullableNumbers(secondMargin, firstMargin);

        default:
          return first.productCode.localeCompare(second.productCode);
      }
    });
  }, [products, query, supplier, sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / pageSize)
  );

  const safePage = Math.min(page, totalPages);

  const visibleProducts = filteredProducts.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  function resetPage() {
    setPage(1);
  }

  return (
    <>
      <div
        style={{
          marginTop: "30px",
          display: "grid",
          gridTemplateColumns:
            "minmax(240px, 1.5fr) minmax(180px, 1fr) minmax(190px, 1fr)",
          gap: "12px",
          padding: "20px",
          background: "#151515",
          border: "1px solid #2b2b2b",
          borderRadius: "14px",
        }}
      >
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            resetPage();
          }}
          placeholder="Search code, description or supplier"
          style={inputStyle}
        />

        <select
          value={supplier}
          onChange={(event) => {
            setSupplier(event.target.value);
            resetPage();
          }}
          style={inputStyle}
        >
          <option value="">All suppliers</option>

          {suppliers.map((supplierName) => (
            <option key={supplierName} value={supplierName}>
              {supplierName}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as SortOption);
            resetPage();
          }}
          style={inputStyle}
        >
          <option value="code-asc">Code A–Z</option>
          <option value="code-desc">Code Z–A</option>
          <option value="description-asc">Description A–Z</option>
          <option value="supplier-asc">Supplier A–Z</option>
          <option value="cost-asc">Cost low to high</option>
          <option value="cost-desc">Cost high to low</option>
          <option value="list-asc">List low to high</option>
          <option value="list-desc">List high to low</option>
          <option value="margin-asc">Margin low to high</option>
          <option value="margin-desc">Margin high to low</option>
        </select>
      </div>

      <div
        style={{
          marginTop: "18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        <p style={{ color: "#999999", margin: 0 }}>
          Showing{" "}
          <strong style={{ color: "#ffffff" }}>
            {filteredProducts.length}
          </strong>{" "}
          products
        </p>

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
      </div>

      <section
        style={{
          marginTop: "18px",
          background: "#151515",
          border: "1px solid #2b2b2b",
          borderRadius: "14px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "980px",
            }}
          >
            <thead>
              <tr style={{ background: "#0b0b0f" }}>
                <th style={headingStyle}>Code</th>
                <th style={headingStyle}>Description</th>
                <th style={headingStyle}>Supplier</th>
                <th style={headingStyle}>Cost</th>
                <th style={headingStyle}>List</th>
                <th style={headingStyle}>Gross Margin</th>
                <th style={headingStyle}>Status</th>
              </tr>
            </thead>

            <tbody>
              {visibleProducts.map((product) => {
                const grossMargin = calculateMargin(product);

                return (
                  <tr key={product.id}>
                    <td style={cellStyle}>
                      <Link
                        href={`/products/${encodeURIComponent(
                          product.productCode
                        )}`}
                        style={{
                          color: "#d4af37",
                          textDecoration: "none",
                          fontWeight: "bold",
                        }}
                      >
                        {product.productCode}
                      </Link>
                    </td>

                    <td style={cellStyle}>{product.description}</td>

                    <td style={cellStyle}>
                      {product.supplier ?? "—"}
                    </td>

                    <td style={cellStyle}>
                      {formatCurrency(product.costPrice)}
                    </td>

                    <td style={cellStyle}>
                      {formatCurrency(product.listPrice)}
                    </td>

                    <td style={cellStyle}>
                      {grossMargin === null
                        ? "—"
                        : `${grossMargin.toFixed(1)}%`}
                    </td>

                    <td style={cellStyle}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "5px 9px",
                          borderRadius: "999px",
                          background: product.active
                            ? "#18351d"
                            : "#3a1b1b",
                          color: product.active
                            ? "#6eeb83"
                            : "#ff8f8f",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {product.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div
            style={{
              padding: "32px",
              textAlign: "center",
              color: "#999999",
            }}
          >
            No products match the current search and filters.
          </div>
        )}
      </section>

      {filteredProducts.length > pageSize && (
        <div
          style={{
            marginTop: "18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <p style={{ color: "#999999", margin: 0 }}>
            Page {safePage} of {totalPages}
          </p>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() =>
                setPage((currentPage) => Math.max(1, currentPage - 1))
              }
              style={paginationButtonStyle(safePage === 1)}
            >
              ← Previous
            </button>

            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() =>
                setPage((currentPage) =>
                  Math.min(totalPages, currentPage + 1)
                )
              }
              style={paginationButtonStyle(
                safePage === totalPages
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

function calculateMargin(product: Product): number | null {
  if (
    product.costPrice === null ||
    product.listPrice === null ||
    product.listPrice <= 0
  ) {
    return null;
  }

  return (
    ((product.listPrice - product.costPrice) / product.listPrice) * 100
  );
}

function compareNullableNumbers(
  first: number | null,
  second: number | null
): number {
  if (first === null && second === null) return 0;
  if (first === null) return 1;
  if (second === null) return -1;

  return first - second;
}

function formatCurrency(value: number | null): string {
  if (value === null) return "—";

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function paginationButtonStyle(disabled: boolean) {
  return {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "1px solid #333333",
    background: disabled ? "#1a1a1a" : "#d4af37",
    color: disabled ? "#666666" : "#111111",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: "bold",
  };
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px",
  background: "#0b0b0f",
  color: "#ffffff",
  border: "1px solid #333333",
  borderRadius: "8px",
};

const headingStyle = {
  padding: "14px",
  textAlign: "left" as const,
  color: "#d4af37",
  borderBottom: "1px solid #292929",
  fontSize: "13px",
};

const cellStyle = {
  padding: "14px",
  color: "#dddddd",
  borderBottom: "1px solid #242424",
  fontSize: "14px",
  verticalAlign: "top" as const,
};