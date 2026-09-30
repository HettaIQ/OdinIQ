"use client";

import { useState } from "react";

type StocktakeSession = {
  id: number;
  reference: string;
  status: string;
  startedAt: string;
};

type Summary = {
  productsCounted: number;
  exactMatches: number;
  shortages: number;
  overages: number;
  withoutSystemStock: number;
  uncountedRows: number;
  unmatchedProducts: number;
  unknownLocations: number;
  invalidRows: number;
  duplicateRows: number;
  unexpectedRows: number;
  missingRows: number;
  liveStockChanged: number;
  totalIssues: number;
};

type LocationCount = {
  location: string;
  expectedLocationQuantity: number;
  physicalCount: number;
  locationVariance: number;
  notes: string;
};

type ReconciliationRow = {
  productId: number;
  productCode: string;
  description: string;
  systemStock: number | null;
  liveSystemStock: number | null;
  locations: LocationCount[];
  physicalTotal: number;
  variance: number | null;
  liveStockChanged: boolean;
};

type IssueRow = {
  rowNumber: number;
  productCode: string;
  location: string;
  value?: string;
};

type Issues = {
  uncountedRows: IssueRow[];
  unmatchedProducts: IssueRow[];
  unknownLocations: IssueRow[];
  invalidRows: IssueRow[];
  duplicateRows: IssueRow[];
  unexpectedRows: IssueRow[];
  missingRows: IssueRow[];
};

type PreviewResult = {
  success: boolean;
  fileName: string;
  sheetName: string;
  session: StocktakeSession;
  summary: Summary;
  reconciliation: ReconciliationRow[];
  issues: Issues;
};

type FinaliseResult = {
  success: boolean;

  session: {
    id: number;
    reference: string;
    status: string;
    completedAt: string;
  };

  summary: {
    linesFinalised: number;
  };

  message: string;
};

type ApplyResult = {
  success: boolean;

  session: {
    id: number;
    reference: string;
    status: string;
  };

  summary: {
    productsUpdated: number;
    locationsUpdated: number;
  };

  adjustments: Array<{
    productId: number;
    productCode: string;
    description?: string | null;
    previousStock: number | null;
    newStock: number;
    variance: number | null;
  }>;

  message: string;
};

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

function IssueSection({
  title,
  rows,
}: {
  title: string;
  rows: IssueRow[];
}) {
  if (!rows.length) {
    return null;
  }

  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        border:
          "1px solid #fecaca",
        borderRadius: 12,
        background: "#fff7f7",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: "grid",
          gap: 6,
          fontSize: 14,
        }}
      >
        {rows.map(
          (row, index) => (
            <div key={index}>
              {row.rowNumber > 0
                ? `Row ${row.rowNumber} · `
                : ""}

              {row.productCode}

              {row.location
                ? ` · ${row.location}`
                : ""}

              {row.value
                ? ` · ${row.value}`
                : ""}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function StocktakeReconciliation() {
  const [file, setFile] =
    useState<File | null>(null);

  const [result, setResult] =
    useState<PreviewResult | null>(
      null
    );

  const [
    finaliseResult,
    setFinaliseResult,
  ] =
    useState<FinaliseResult | null>(
      null
    );

  const [applyResult, setApplyResult] =
    useState<ApplyResult | null>(
      null
    );

  const [loading, setLoading] =
    useState(false);

  const [finalising, setFinalising] =
    useState(false);

  const [applying, setApplying] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function previewStocktake() {
    if (!file) {
      setError(
        "Choose a completed OdinIQ stocktake workbook first."
      );
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setFinaliseResult(null);
    setApplyResult(null);

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/warehouse/stocktake/reconcile/preview",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Odin could not review this stocktake."
        );
      }

      setResult(
        data as PreviewResult
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Odin could not review this stocktake."
      );
    } finally {
      setLoading(false);
    }
  }

  async function finaliseStocktake() {
    if (!file || !result) {
      return;
    }

    if (
      result.summary.totalIssues >
      0
    ) {
      setError(
        "Resolve all stocktake issues before finalising."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Finalise stocktake ${result.session.reference}?\n\nThis will permanently save and lock the physical counts.\n\nIt will NOT change Odin System Stock or Xero yet.`
      );

    if (!confirmed) {
      return;
    }

    setFinalising(true);
    setError(null);

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/warehouse/stocktake/reconcile/finalise",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        const details =
          Array.isArray(
            data.problems
          )
            ? ` ${data.problems.join(
                " "
              )}`
            : "";

        throw new Error(
          `${
            data.error ??
            "Odin could not finalise this stocktake."
          }${details}`
        );
      }

      setFinaliseResult(
        data as FinaliseResult
      );

      setResult((current) =>
        current
          ? {
              ...current,

              session: {
                ...current.session,
                status:
                  "COMPLETED",
              },
            }
          : current
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Odin could not finalise this stocktake."
      );
    } finally {
      setFinalising(false);
    }
  }

  async function applyStocktake() {
    if (!result) {
      return;
    }

    const confirmed =
      window.confirm(
        `Apply stocktake ${result.session.reference} to Odin?\n\nThis WILL change Odin System Stock to the physical stocktake totals and update the quantities held at each warehouse location.\n\nThe original frozen stock figures will remain in the stocktake audit record.\n\nXero will NOT be changed.`
      );

    if (!confirmed) {
      return;
    }

    setApplying(true);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/warehouse/stocktake/apply",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              sessionId:
                result.session.id,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Odin could not apply this stocktake."
        );
      }

      setApplyResult(
  data as ApplyResult
);

const appliedData =
  data as ApplyResult;

setResult((current) => {
  if (!current) {
    return current;
  }

  const newStockByProduct =
    new Map(
      appliedData.adjustments.map(
        (adjustment) => [
          adjustment.productId,
          adjustment.newStock,
        ]
      )
    );

  return {
    ...current,

    session: {
      ...current.session,
      status: "APPLIED",
    },

    reconciliation:
      current.reconciliation.map(
        (row) => {
          const newStock =
            newStockByProduct.get(
              row.productId
            );

          if (
            newStock === undefined
          ) {
            return row;
          }

          return {
            ...row,
            liveSystemStock:
              newStock,
            liveStockChanged:
              row.systemStock !==
              null &&
              newStock !==
                row.systemStock,
          };
        }
      ),
  };
});
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Odin could not apply this stocktake."
      );
    } finally {
      setApplying(false);
    }
  }

  const canFinalise =
    Boolean(result) &&
    result?.session.status ===
      "OPEN" &&
    result.summary.totalIssues ===
      0 &&
    result.summary.productsCounted >
      0;

  const canApply =
    Boolean(result) &&
    result?.session.status ===
      "COMPLETED";

  return (
    <section
      style={{
        marginTop: 24,
        padding: 20,
        border:
          "1px solid #e5e7eb",
        borderRadius: 16,
        background: "#ffffff",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 20,
        }}
      >
        Stocktake Reconciliation
      </h2>

      <p
        style={{
          margin: "6px 0 0",
          color: "#6b7280",
          maxWidth: 760,
        }}
      >
        Upload the completed blind
        stocktake workbook. Odin will
        compare the physical counts
        against the frozen stock
        snapshot taken when the
        stocktake started.
      </p>

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          marginTop: 18,
        }}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(event) => {
            const selected =
              event.target
                .files?.[0] ??
              null;

            setFile(selected);
            setResult(null);
            setFinaliseResult(
              null
            );
            setApplyResult(null);
            setError(null);
          }}
        />

        <button
          type="button"
          onClick={
            previewStocktake
          }
          disabled={
            loading || !file
          }
          style={{
            padding:
              "10px 16px",
            borderRadius: 10,
            border: 0,
            background:
              loading || !file
                ? "#9ca3af"
                : "#111827",
            color: "#ffffff",
            fontWeight: 700,
            cursor:
              loading || !file
                ? "not-allowed"
                : "pointer",
          }}
        >
          {loading
            ? "Reviewing..."
            : "Review Stocktake"}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 10,
            background: "#fef2f2",
            color: "#991b1b",
            border:
              "1px solid #fecaca",
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <>
          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 12,
              background: "#f9fafb",
              border:
                "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong>
                  Stocktake{" "}
                  {
                    result.session
                      .reference
                  }
                </strong>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    color: "#6b7280",
                  }}
                >
                  Started{" "}
                  {new Date(
                    result.session
                      .startedAt
                  ).toLocaleString(
                    "en-GB"
                  )}
                </div>
              </div>

              <div
                style={{
                  fontWeight: 800,
                  padding:
                    "6px 10px",
                  borderRadius: 999,
                  background:
                    result.session
                      .status ===
                    "APPLIED"
                      ? "#dcfce7"
                      : result.session
                            .status ===
                          "COMPLETED"
                        ? "#dbeafe"
                        : "#fef3c7",
                }}
              >
                {
                  result.session
                    .status
                }
              </div>
            </div>

            <p
              style={{
                margin:
                  "12px 0 0",
                color: "#4b5563",
                fontSize: 14,
              }}
            >
              This workbook has
              been reviewed against
              the original frozen
              snapshot. Stock will
              only change when you
              explicitly apply the
              completed stocktake.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 10,
              marginTop: 16,
            }}
          >
            {[
              [
                "Counted",
                result.summary
                  .productsCounted,
              ],
              [
                "Exact",
                result.summary
                  .exactMatches,
              ],
              [
                "Shortages",
                result.summary
                  .shortages,
              ],
              [
                "Overages",
                result.summary
                  .overages,
              ],
              [
                "Uncounted",
                result.summary
                  .uncountedRows,
              ],
              [
                "Issues",
                result.summary
                  .totalIssues,
              ],
              [
                "Live Stock Changed",
                result.summary
                  .liveStockChanged,
              ],
              [
                "No System Qty",
                result.summary
                  .withoutSystemStock,
              ],
            ].map(
              ([label, value]) => (
                <div
                  key={String(
                    label
                  )}
                  style={{
                    padding: 12,
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: 10,
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
                      marginTop: 4,
                      fontSize: 20,
                      fontWeight: 800,
                    }}
                  >
                    {value}
                  </div>
                </div>
              )
            )}
          </div>

          {result.summary
            .totalIssues > 0 && (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 10,
                background:
                  "#fff7ed",
                border:
                  "1px solid #fed7aa",
                color: "#9a3412",
              }}
            >
              This stocktake has
              unresolved issues and
              cannot be finalised
              until they are
              corrected.
            </div>
          )}

          {result.summary
            .liveStockChanged >
            0 && (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 10,
                background:
                  "#eff6ff",
                border:
                  "1px solid #bfdbfe",
                color: "#1e40af",
              }}
            >
              Live System Stock has
              changed since this
              stocktake began. The
              variance still uses
              the original frozen
              snapshot.
            </div>
          )}

          <div
            style={{
              overflowX: "auto",
              marginTop: 18,
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
                <tr>
                  {[
                    "Product",
                    "Description",
                    "Locations Counted",
                    "Frozen System",
                    "Live System",
                    "Physical",
                    "Variance",
                  ].map(
                    (heading) => (
                      <th
                        key={
                          heading
                        }
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "10px 8px",
                          borderBottom:
                            "1px solid #d1d5db",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {
                          heading
                        }
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {result.reconciliation.map(
                  (row) => (
                    <tr
                      key={
                        row.productId
                      }
                    >
                      <td
                        style={{
                          padding:
                            "10px 8px",
                          borderBottom:
                            "1px solid #f3f4f6",
                          fontWeight: 700,
                        }}
                      >
                        {
                          row.productCode
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "10px 8px",
                          borderBottom:
                            "1px solid #f3f4f6",
                        }}
                      >
                        {
                          row.description
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "10px 8px",
                          borderBottom:
                            "1px solid #f3f4f6",
                        }}
                      >
                        {row.locations
                          .map(
                            (
                              location
                            ) =>
                              `${
                                location.location
                              } = ${formatQuantity(
                                location.physicalCount
                              )}`
                          )
                          .join(", ")}
                      </td>

                      <td
                        style={{
                          padding:
                            "10px 8px",
                          borderBottom:
                            "1px solid #f3f4f6",
                        }}
                      >
                        {formatQuantity(
                          row.systemStock
                        )}
                      </td>

                      <td
                        style={{
                          padding:
                            "10px 8px",
                          borderBottom:
                            "1px solid #f3f4f6",
                        }}
                      >
                        {formatQuantity(
                          row.liveSystemStock
                        )}
                      </td>

                      <td
                        style={{
                          padding:
                            "10px 8px",
                          borderBottom:
                            "1px solid #f3f4f6",
                          fontWeight: 700,
                        }}
                      >
                        {formatQuantity(
                          row.physicalTotal
                        )}
                      </td>

                      <td
                        style={{
                          padding:
                            "10px 8px",
                          borderBottom:
                            "1px solid #f3f4f6",
                          fontWeight: 800,
                        }}
                      >
                        {formatVariance(
                          row.variance
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <IssueSection
            title="Not Counted"
            rows={
              result.issues
                .uncountedRows
            }
          />

          <IssueSection
            title="Unknown Products"
            rows={
              result.issues
                .unmatchedProducts
            }
          />

          <IssueSection
            title="Unknown Locations"
            rows={
              result.issues
                .unknownLocations
            }
          />

          <IssueSection
            title="Invalid Counts"
            rows={
              result.issues
                .invalidRows
            }
          />

          <IssueSection
            title="Duplicate Counts"
            rows={
              result.issues
                .duplicateRows
            }
          />

          <IssueSection
            title="Unexpected Product Locations"
            rows={
              result.issues
                .unexpectedRows
            }
          />

          <IssueSection
            title="Missing Stocktake Rows"
            rows={
              result.issues
                .missingRows
            }
          />

          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop:
                "1px solid #e5e7eb",
            }}
          >
            {canFinalise && (
              <div>
                <button
                  type="button"
                  onClick={
                    finaliseStocktake
                  }
                  disabled={
                    finalising
                  }
                  style={{
                    padding:
                      "11px 18px",
                    borderRadius: 10,
                    border: 0,
                    background:
                      finalising
                        ? "#9ca3af"
                        : "#2563eb",
                    color:
                      "#ffffff",
                    fontWeight: 800,
                    cursor:
                      finalising
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {finalising
                    ? "Finalising..."
                    : "Finalise Stocktake"}
                </button>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    color:
                      "#6b7280",
                  }}
                >
                  Saves and locks
                  the physical
                  counts. Odin stock
                  is not changed
                  yet.
                </div>
              </div>
            )}

            {finaliseResult && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 14,
                  borderRadius: 10,
                  background:
                    "#eff6ff",
                  border:
                    "1px solid #bfdbfe",
                  color: "#1e40af",
                }}
              >
                Stocktake{" "}
                <strong>
                  {
                    finaliseResult
                      .session
                      .reference
                  }
                </strong>{" "}
                has been finalised.
                The physical counts
                are now locked.
              </div>
            )}

            {canApply &&
              !applyResult && (
                <div>
                  <button
                    type="button"
                    onClick={
                      applyStocktake
                    }
                    disabled={
                      applying
                    }
                    style={{
                      padding:
                        "11px 18px",
                      borderRadius: 10,
                      border: 0,
                      background:
                        applying
                          ? "#9ca3af"
                          : "#15803d",
                      color:
                        "#ffffff",
                      fontWeight: 800,
                      cursor:
                        applying
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {applying
                      ? "Applying..."
                      : "Apply Count to Odin Stock"}
                  </button>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      color:
                        "#6b7280",
                    }}
                  >
                    This changes
                    Odin System Stock
                    and each warehouse
                    location quantity
                    to the physical
                    counts. Xero is
                    not changed.
                  </div>
                </div>
              )}

            {applyResult && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background:
                    "#f0fdf4",
                  border:
                    "1px solid #bbf7d0",
                  color: "#166534",
                }}
              >
                <strong>
                  Stocktake applied
                  successfully.
                </strong>

                <div
                  style={{
                    marginTop: 6,
                  }}
                >
                  {
                    applyResult
                      .summary
                      .productsUpdated
                  }{" "}
                  product
                  {applyResult
                    .summary
                    .productsUpdated ===
                  1
                    ? ""
                    : "s"}{" "}
                  updated across{" "}
                  {
                    applyResult
                      .summary
                      .locationsUpdated
                  }{" "}
                  warehouse location
                  {applyResult
                    .summary
                    .locationsUpdated ===
                  1
                    ? ""
                    : "s"}.
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                  }}
                >
                  The original frozen
                  figures remain in
                  the stocktake audit
                  record. Xero has
                  not been changed.
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}