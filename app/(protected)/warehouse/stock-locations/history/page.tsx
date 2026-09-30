import Link from "next/link";

import CancelStocktakeButton from "./CancelStocktakeButton";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

function formatQuantity(
  value: number
) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      maximumFractionDigits: 3,
    }
  ).format(value);
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

export default async function StocktakeHistoryPage() {
  const { companyId } =
    await requireCompanyContext();

  const sessions =
    await prisma.stocktakeSession.findMany({
      where: {
        companyId,
      },

      orderBy: {
        startedAt: "desc",
      },

      select: {
        id: true,
        reference: true,
        status: true,
        startedAt: true,
        completedAt: true,

        lines: {
          select: {
            productId: true,
            expectedSystemQuantity:
              true,
            physicalCount: true,
          },
        },
      },
    });

  const history =
    sessions.map((session) => {
      /*
       * A product may exist in several
       * warehouse locations, so group
       * the stocktake lines by product
       * before calculating the overall
       * physical quantity and variance.
       */
      const products =
        new Map<
          number,
          {
            expectedSystemQuantity:
              number | null;
            physicalTotal: number;
            hasPhysicalCount: boolean;
          }
        >();

      for (const line of session.lines) {
        const existing =
          products.get(
            line.productId
          );

        if (existing) {
          if (
            line.physicalCount !==
            null
          ) {
            existing.physicalTotal +=
              line.physicalCount;

            existing.hasPhysicalCount =
              true;
          }

          continue;
        }

        products.set(
          line.productId,
          {
            expectedSystemQuantity:
              line.expectedSystemQuantity,

            physicalTotal:
              line.physicalCount ??
              0,

            hasPhysicalCount:
              line.physicalCount !==
              null,
          }
        );
      }

      let productsCounted = 0;
      let exact = 0;
      let shortages = 0;
      let overages = 0;
      let totalAbsoluteVariance = 0;

      for (const product of products.values()) {
        if (
          !product.hasPhysicalCount
        ) {
          continue;
        }

        productsCounted += 1;

        if (
          product.expectedSystemQuantity ===
          null
        ) {
          continue;
        }

        const variance =
          product.physicalTotal -
          product.expectedSystemQuantity;

        totalAbsoluteVariance +=
          Math.abs(variance);

        if (variance < 0) {
          shortages += 1;
        } else if (variance > 0) {
          overages += 1;
        } else {
          exact += 1;
        }
      }

      return {
        ...session,
        productsCounted,
        exact,
        shortages,
        overages,
        totalAbsoluteVariance,
      };
    });

  return (
    <main
      style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <Link
            href="/warehouse/stock-locations"
            style={{
              color: "#6b7280",
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            ← Back to Stock Locations
          </Link>

          <h1
            style={{
              margin: "10px 0 0",
              fontSize: 28,
            }}
          >
            Stocktake History
          </h1>

          <p
            style={{
              margin: "6px 0 0",
              color: "#6b7280",
            }}
          >
            Historical warehouse
            stocktakes and their
            recorded variances.
          </p>
        </div>
      </div>

      {history.length === 0 ? (
        <div
          style={{
            padding: 24,
            border:
              "1px solid #e5e7eb",
            borderRadius: 14,
            background: "#ffffff",
          }}
        >
          No stocktakes have been
          recorded yet.
        </div>
      ) : (
        <div
          style={{
            border:
              "1px solid #e5e7eb",
            borderRadius: 14,
            background: "#ffffff",
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
                    "Reference",
                    "Started",
                    "Completed",
                    "Status",
                    "Products",
                    "Exact",
                    "Shortages",
                    "Overages",
                    "Total Variance",
                    "",
                  ].map(
                    (heading) => (
                      <th
                        key={
                          heading ||
                          "actions"
                        }
                        style={{
                          padding:
                            "12px 14px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid #e5e7eb",
                          whiteSpace:
                            "nowrap",
                          fontSize: 12,
                          color:
                            "#6b7280",
                        }}
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {history.map(
                  (session) => (
                    <tr
                      key={
                        session.id
                      }
                    >
                      <td
                        style={{
                          padding:
                            "14px",
                          borderBottom:
                            "1px solid #f3f4f6",
                          fontWeight: 800,
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {
                          session.reference
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "14px",
                          borderBottom:
                            "1px solid #f3f4f6",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {formatDate(
                          session.startedAt
                        )}
                      </td>

                      <td
                        style={{
                          padding:
                            "14px",
                          borderBottom:
                            "1px solid #f3f4f6",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {formatDate(
                          session.completedAt
                        )}
                      </td>

                      <td
                        style={{
                          padding:
                            "14px",
                          borderBottom:
                            "1px solid #f3f4f6",
                        }}
                      >
                        <span
                          style={{
                            display:
                              "inline-block",
                            padding:
                              "5px 9px",
                            borderRadius:
                              999,
                            fontSize: 12,
                            fontWeight: 800,
                            ...statusStyle(
                              session.status
                            ),
                          }}
                        >
                          {
                            session.status
                          }
                        </span>
                      </td>

                      <td
                        style={{
                          padding:
                            "14px",
                          borderBottom:
                            "1px solid #f3f4f6",
                          fontWeight: 700,
                        }}
                      >
                        {
                          session.productsCounted
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "14px",
                          borderBottom:
                            "1px solid #f3f4f6",
                        }}
                      >
                        {
                          session.exact
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "14px",
                          borderBottom:
                            "1px solid #f3f4f6",
                        }}
                      >
                        {
                          session.shortages
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "14px",
                          borderBottom:
                            "1px solid #f3f4f6",
                        }}
                      >
                        {
                          session.overages
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "14px",
                          borderBottom:
                            "1px solid #f3f4f6",
                          fontWeight: 800,
                        }}
                      >
                        {formatQuantity(
                          session.totalAbsoluteVariance
                        )}
                      </td>

                      <td
                        style={{
                          padding: "14px",
                          borderBottom:
                            "1px solid #f3f4f6",
                          textAlign:
                            "right",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "flex-end",
                            alignItems:
                              "center",
                            gap: 8,
                          }}
                        >
                          {session.status ===
                            "OPEN" && (
                            <CancelStocktakeButton
                              sessionId={
                                session.id
                              }
                              reference={
                                session.reference
                              }
                            />
                          )}

                          <Link
                            href={`/warehouse/stock-locations/history/${session.id}`}
                            style={{
                              display:
                                "inline-block",
                              padding:
                                "7px 11px",
                              borderRadius: 8,
                              background:
                                "#111827",
                              color:
                                "#ffffff",
                              textDecoration:
                                "none",
                              fontWeight: 700,
                              fontSize: 12,
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            View Stocktake
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}