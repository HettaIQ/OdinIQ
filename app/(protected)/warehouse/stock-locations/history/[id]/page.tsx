import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

function formatQuantity(
  value: number | null
) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-GB",
    {
      maximumFractionDigits: 3,
    }
  ).format(value);
}

function formatVariance(
  value: number | null
) {
  if (value === null) {
    return "—";
  }

  if (value > 0) {
    return `+${formatQuantity(
      value
    )}`;
  }

  return formatQuantity(value);
}

function formatDate(
  value: Date | null
) {
  if (!value) {
    return "—";
  }

  return value.toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );
}

function statusStyle(
  status: string
) {
  if (status === "APPLIED") {
    return {
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (status === "COMPLETED") {
    return {
      background: "#dbeafe",
      color: "#1e40af",
    };
  }

  if (status === "CANCELLED") {
    return {
      background: "#f3f4f6",
      color: "#4b5563",
    };
  }

  return {
    background: "#fef3c7",
    color: "#92400e",
  };
}

export default async function StocktakeDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { companyId } =
    await requireCompanyContext();

  const { id } = await params;

  const sessionId = Number(id);

  if (
    !Number.isInteger(sessionId) ||
    sessionId <= 0
  ) {
    notFound();
  }

  const session =
    await prisma.stocktakeSession.findFirst({
      where: {
        id: sessionId,
        companyId,
      },

      select: {
        id: true,
        reference: true,
        status: true,
        startedAt: true,
        completedAt: true,

        lines: {
          select: {
            id: true,
            productId: true,

            expectedSystemQuantity:
              true,

            expectedLocationQuantity:
              true,

            physicalCount: true,
            notes: true,
            countedAt: true,

            product: {
              select: {
                productCode: true,
                description: true,
                stockQuantity: true,
              },
            },

            location: {
              select: {
                code: true,
                description: true,
              },
            },
          },

          orderBy: [
            {
              location: {
                stocktakeOrder:
                  "asc",
              },
            },
            {
              location: {
                code: "asc",
              },
            },
          ],
        },
      },
    });

  if (!session) {
    notFound();
  }

  /*
   * Group location lines by product.
   *
   * A product can be stored in several
   * warehouse locations, but the overall
   * stocktake variance is against the
   * frozen SYSTEM quantity.
   */
  const productMap =
    new Map<
      number,
      {
        productId: number;
        productCode: string;
        description: string;
        frozenSystemStock:
          number | null;
        currentSystemStock:
          number | null;
        physicalTotal: number;
        hasCompleteCount: boolean;

        locations: Array<{
          code: string;
          description:
            string | null;
          frozenLocationQuantity:
            number;
          physicalCount:
            number | null;
          variance: number | null;
          notes: string | null;
          countedAt: Date | null;
        }>;
      }
    >();

  for (const line of session.lines) {
    const existing =
      productMap.get(
        line.productId
      );

    const locationVariance =
      line.physicalCount === null
        ? null
        : line.physicalCount -
          line.expectedLocationQuantity;

    if (existing) {
      existing.locations.push({
        code:
          line.location.code,

        description:
          line.location.description,

        frozenLocationQuantity:
          line.expectedLocationQuantity,

        physicalCount:
          line.physicalCount,

        variance:
          locationVariance,

        notes:
          line.notes,

        countedAt:
          line.countedAt,
      });

      if (
        line.physicalCount !== null
      ) {
        existing.physicalTotal +=
          line.physicalCount;
      } else {
        existing.hasCompleteCount =
          false;
      }

      continue;
    }

    productMap.set(
      line.productId,
      {
        productId:
          line.productId,

        productCode:
          line.product.productCode,

        description:
          line.product.description,

        frozenSystemStock:
          line.expectedSystemQuantity,

        currentSystemStock:
          line.product
            .stockQuantity ?? null,

        physicalTotal:
          line.physicalCount ??
          0,

        hasCompleteCount:
          line.physicalCount !==
          null,

        locations: [
          {
            code:
              line.location.code,

            description:
              line.location
                .description,

            frozenLocationQuantity:
              line.expectedLocationQuantity,

            physicalCount:
              line.physicalCount,

            variance:
              locationVariance,

            notes:
              line.notes,

            countedAt:
              line.countedAt,
          },
        ],
      }
    );
  }

  const products =
    Array.from(
      productMap.values()
    )
      .map((product) => {
        const variance =
          !product.hasCompleteCount ||
          product.frozenSystemStock ===
            null
            ? null
            : product.physicalTotal -
              product.frozenSystemStock;

        return {
          ...product,
          variance,
        };
      })
      .sort((a, b) => {
        const aVariance =
          Math.abs(
            a.variance ?? 0
          );

        const bVariance =
          Math.abs(
            b.variance ?? 0
          );

        if (
          aVariance !== bVariance
        ) {
          return (
            bVariance -
            aVariance
          );
        }

        return a.productCode.localeCompare(
          b.productCode
        );
      });

  const countedProducts =
    products.filter(
      (product) =>
        product.hasCompleteCount
    );

  const exact =
    countedProducts.filter(
      (product) =>
        product.variance === 0
    ).length;

  const shortages =
    countedProducts.filter(
      (product) =>
        product.variance !== null &&
        product.variance < 0
    ).length;

  const overages =
    countedProducts.filter(
      (product) =>
        product.variance !== null &&
        product.variance > 0
    ).length;

  const totalAbsoluteVariance =
    countedProducts.reduce(
      (total, product) =>
        total +
        Math.abs(
          product.variance ?? 0
        ),
      0
    );

  return (
    <main
      style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: 24,
      }}
    >
      <Link
        href="/warehouse/stock-locations/history"
        style={{
          color: "#6b7280",
          textDecoration: "none",
          fontSize: 14,
        }}
      >
        ← Back to Stocktake History
      </Link>

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginTop: 12,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
            }}
          >
            Stocktake{" "}
            {session.reference}
          </h1>

          <p
            style={{
              margin:
                "6px 0 0",
              color: "#6b7280",
            }}
          >
            Permanent stocktake
            audit record.
          </p>
        </div>

        <span
          style={{
            display:
              "inline-block",
            padding:
              "7px 12px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 800,
            ...statusStyle(
              session.status
            ),
          }}
        >
          {session.status}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginTop: 22,
        }}
      >
        {[
          [
            "Started",
            formatDate(
              session.startedAt
            ),
          ],
          [
            "Completed",
            formatDate(
              session.completedAt
            ),
          ],
          [
            "Products Counted",
            countedProducts.length,
          ],
          [
            "Exact",
            exact,
          ],
          [
            "Shortages",
            shortages,
          ],
          [
            "Overages",
            overages,
          ],
          [
            "Total Variance",
            formatQuantity(
              totalAbsoluteVariance
            ),
          ],
        ].map(
          ([label, value]) => (
            <div
              key={String(label)}
              style={{
                padding: 14,
                border:
                  "1px solid #e5e7eb",
                borderRadius: 12,
                background:
                  "#ffffff",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color:
                    "#6b7280",
                }}
              >
                {label}
              </div>

              <div
                style={{
                  marginTop: 5,
                  fontWeight: 800,
                  fontSize: 17,
                }}
              >
                {value}
              </div>
            </div>
          )
        )}
      </div>

      <div
        style={{
          marginTop: 24,
          border:
            "1px solid #e5e7eb",
          borderRadius: 14,
          background: "#ffffff",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom:
              "1px solid #e5e7eb",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
            }}
          >
            Product Reconciliation
          </h2>

          <p
            style={{
              margin:
                "5px 0 0",
              color: "#6b7280",
              fontSize: 13,
            }}
          >
            Frozen System is the
            stock quantity recorded
            when the stocktake
            started. Current System
            shows what Odin holds
            now.
          </p>
        </div>

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
              fontSize: 14,
            }}
          >
            <thead>
              <tr
                style={{
                  background:
                    "#f9fafb",
                }}
              >
                {[
                  "Product",
                  "Description",
                  "Frozen System",
                  "Physical",
                  "Variance",
                  "Current System",
                ].map(
                  (heading) => (
                    <th
                      key={
                        heading
                      }
                      style={{
                        padding:
                          "11px 14px",
                        textAlign:
                          "left",
                        borderBottom:
                          "1px solid #e5e7eb",
                        color:
                          "#6b7280",
                        fontSize: 12,
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {products.map(
                (product) => (
                  <tr
                    key={
                      product.productId
                    }
                  >
                    <td
                      style={{
                        padding:
                          "13px 14px",
                        borderBottom:
                          "1px solid #f3f4f6",
                        fontWeight: 800,
                      }}
                    >
                      {
                        product.productCode
                      }
                    </td>

                    <td
                      style={{
                        padding:
                          "13px 14px",
                        borderBottom:
                          "1px solid #f3f4f6",
                      }}
                    >
                      {
                        product.description
                      }
                    </td>

                    <td
                      style={{
                        padding:
                          "13px 14px",
                        borderBottom:
                          "1px solid #f3f4f6",
                      }}
                    >
                      {formatQuantity(
                        product.frozenSystemStock
                      )}
                    </td>

                    <td
                      style={{
                        padding:
                          "13px 14px",
                        borderBottom:
                          "1px solid #f3f4f6",
                        fontWeight: 700,
                      }}
                    >
                      {product.hasCompleteCount
                        ? formatQuantity(
                            product.physicalTotal
                          )
                        : "Incomplete"}
                    </td>

                    <td
                      style={{
                        padding:
                          "13px 14px",
                        borderBottom:
                          "1px solid #f3f4f6",
                        fontWeight: 800,
                      }}
                    >
                      {formatVariance(
                        product.variance
                      )}
                    </td>

                    <td
                      style={{
                        padding:
                          "13px 14px",
                        borderBottom:
                          "1px solid #f3f4f6",
                        fontWeight: 700,
                      }}
                    >
                      {formatQuantity(
                        product.currentSystemStock
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
          marginTop: 24,
          border:
            "1px solid #e5e7eb",
          borderRadius: 14,
          background: "#ffffff",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom:
              "1px solid #e5e7eb",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
            }}
          >
            Location Counts
          </h2>

          <p
            style={{
              margin:
                "5px 0 0",
              color: "#6b7280",
              fontSize: 13,
            }}
          >
            Physical counts and
            location-level variances
            recorded during this
            stocktake.
          </p>
        </div>

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
              fontSize: 14,
            }}
          >
            <thead>
              <tr
                style={{
                  background:
                    "#f9fafb",
                }}
              >
                {[
                  "Location",
                  "Product",
                  "Description",
                  "Frozen Location Qty",
                  "Physical Count",
                  "Location Variance",
                  "Counted At",
                  "Notes",
                ].map(
                  (heading) => (
                    <th
                      key={
                        heading
                      }
                      style={{
                        padding:
                          "11px 14px",
                        textAlign:
                          "left",
                        borderBottom:
                          "1px solid #e5e7eb",
                        color:
                          "#6b7280",
                        fontSize: 12,
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {products.flatMap(
                (product) =>
                  product.locations.map(
                    (
                      location,
                      index
                    ) => (
                      <tr
                        key={`${product.productId}-${location.code}-${index}`}
                      >
                        <td
                          style={{
                            padding:
                              "13px 14px",
                            borderBottom:
                              "1px solid #f3f4f6",
                            fontWeight: 800,
                          }}
                        >
                          {
                            location.code
                          }
                        </td>

                        <td
                          style={{
                            padding:
                              "13px 14px",
                            borderBottom:
                              "1px solid #f3f4f6",
                            fontWeight: 700,
                          }}
                        >
                          {
                            product.productCode
                          }
                        </td>

                        <td
                          style={{
                            padding:
                              "13px 14px",
                            borderBottom:
                              "1px solid #f3f4f6",
                          }}
                        >
                          {
                            product.description
                          }
                        </td>

                        <td
                          style={{
                            padding:
                              "13px 14px",
                            borderBottom:
                              "1px solid #f3f4f6",
                          }}
                        >
                          {formatQuantity(
                            location.frozenLocationQuantity
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              "13px 14px",
                            borderBottom:
                              "1px solid #f3f4f6",
                            fontWeight: 700,
                          }}
                        >
                          {formatQuantity(
                            location.physicalCount
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              "13px 14px",
                            borderBottom:
                              "1px solid #f3f4f6",
                            fontWeight: 800,
                          }}
                        >
                          {formatVariance(
                            location.variance
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              "13px 14px",
                            borderBottom:
                              "1px solid #f3f4f6",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {formatDate(
                            location.countedAt
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              "13px 14px",
                            borderBottom:
                              "1px solid #f3f4f6",
                          }}
                        >
                          {location.notes ||
                            "—"}
                        </td>
                      </tr>
                    )
                  )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}