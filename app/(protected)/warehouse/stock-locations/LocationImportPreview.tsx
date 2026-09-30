"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type PreviewSummary = {
  spreadsheetRows: number;
  blankLocationRows: number;
  rowsWithLocations: number;
  readyRows: number;
  unmatchedProducts: number;
  invalidRows: number;
  uniqueLocations: number;
  productLocationAssignments: number;
};

type PreviewRow = {
  rowNumber: number;
  productId: number | null;
  productCode: string;
  description: string | null;
  rawLocation: string;
  locations: string[];
  status:
    | "READY"
    | "UNMATCHED_PRODUCT"
    | "INVALID_LOCATION";
};

type InvalidRow = {
  rowNumber: number;
  productCode: string;
  rawLocation: string;
  message: string;
};

type PreviewResult = {
  success: boolean;
  fileName: string;
  summary: PreviewSummary;
  rows: PreviewRow[];
  invalidRows: InvalidRow[];
  uniqueLocations: string[];
};

type ConfirmSummary = {
  blankLocationRows: number;
  productsWithLocations: number;
  uniqueLocations: number;
  productLocationAssignments: number;
  createdLocations: number;
  reactivatedLocations: number;
  createdAssignments: number;
  existingAssignments: number;
};

type ConfirmResult = {
  success: boolean;
  message: string;
  fileName: string;
  summary: ConfirmSummary;
};

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      style={{
        padding: 12,
        border:
          "1px solid #e5e7eb",
        borderRadius: 10,
        background: "#f9fafb",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
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
  );
}

export default function LocationImportPreview() {
  const router =
    useRouter();

  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    preview,
    setPreview,
  ] =
    useState<PreviewResult | null>(
      null
    );

  const [
    confirmed,
    setConfirmed,
  ] =
    useState<ConfirmResult | null>(
      null
    );

  const [
    previewing,
    setPreviewing,
  ] =
    useState(false);

  const [
    confirming,
    setConfirming,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  function chooseFile(
    selectedFile:
      File | null
  ) {
    setFile(
      selectedFile
    );

    setPreview(
      null
    );

    setConfirmed(
      null
    );

    setError(
      null
    );
  }

  async function previewImport() {
    if (!file) {
      setError(
        "Choose a spreadsheet first."
      );

      return;
    }

    setPreviewing(
      true
    );

    setPreview(
      null
    );

    setConfirmed(
      null
    );

    setError(
      null
    );

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/warehouse/stock-locations/import/preview",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        (await response.json()) as
          | PreviewResult
          | {
              success?: boolean;
              message?: string;
            };

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          "message" in
            data &&
            data.message
            ? data.message
            : "Unable to preview warehouse locations."
        );
      }

      setPreview(
        data as PreviewResult
      );
    } catch (error) {
      setError(
        error instanceof
          Error
          ? error.message
          : "Unable to preview warehouse locations."
      );
    } finally {
      setPreviewing(
        false
      );
    }
  }

  async function confirmImport() {
    if (
      !file ||
      !preview
    ) {
      return;
    }

    if (
      preview.summary
        .invalidRows >
        0 ||
      preview.summary
        .unmatchedProducts >
        0
    ) {
      setError(
        "Correct the invalid or unmatched populated rows before confirming the import."
      );

      return;
    }

    if (
      preview.summary
        .readyRows === 0
    ) {
      setError(
        "There are no populated warehouse locations to import."
      );

      return;
    }

    const ok =
      window.confirm(
        `Import warehouse locations from ${file.name}?\n\n` +
          `${preview.summary.readyRows} populated product rows\n` +
          `${preview.summary.uniqueLocations} unique warehouse locations\n` +
          `${preview.summary.productLocationAssignments} product/location assignments\n\n` +
          "Blank Location rows will be ignored and existing locations will NOT be deleted."
      );

    if (!ok) {
      return;
    }

    setConfirming(
      true
    );

    setConfirmed(
      null
    );

    setError(
      null
    );

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/warehouse/stock-locations/import/confirm",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        (await response.json()) as
          | ConfirmResult
          | {
              success?: boolean;
              message?: string;
            };

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          "message" in
            data &&
            data.message
            ? data.message
            : "Unable to import warehouse locations."
        );
      }

      setConfirmed(
        data as ConfirmResult
      );

      router.refresh();
    } catch (error) {
      setError(
        error instanceof
          Error
          ? error.message
          : "Unable to import warehouse locations."
      );
    } finally {
      setConfirming(
        false
      );
    }
  }

  return (
    <section
      style={{
        marginTop: 24,
        padding: 18,
        border:
          "1px solid #e5e7eb",
        borderRadius: 14,
        background: "#ffffff",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
          }}
        >
          Bulk Location Import
        </h2>

        <p
          style={{
            margin:
              "6px 0 0",
            color: "#6b7280",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Upload the warehouse
          location spreadsheet.
          Blank locations are
          ignored, so the warehouse
          mapping can be uploaded in
          batches.
        </p>

        <p
          style={{
            margin:
              "4px 0 0",
            color: "#6b7280",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Location ranges such as
          D1-D10 and combinations
          such as C8-C12 / C26-C30
          are expanded automatically.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginTop: 16,
        }}
      >
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(
            event
          ) =>
            chooseFile(
              event.target
                .files?.[0] ??
                null
            )
          }
        />

        <button
          type="button"
          onClick={
            previewImport
          }
          disabled={
            !file ||
            previewing ||
            confirming
          }
          style={{
            padding:
              "9px 13px",
            borderRadius: 8,
            border:
              "1px solid #111827",
            background:
              !file ||
              previewing ||
              confirming
                ? "#9ca3af"
                : "#111827",
            color: "#ffffff",
            fontWeight: 700,
            cursor:
              !file ||
              previewing ||
              confirming
                ? "not-allowed"
                : "pointer",
          }}
        >
          {previewing
            ? "Previewing..."
            : "Preview Locations"}
        </button>
      </div>

      {file && (
        <div
          style={{
            marginTop: 8,
            color: "#6b7280",
            fontSize: 12,
          }}
        >
          Selected:{" "}
          <strong>
            {file.name}
          </strong>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            border:
              "1px solid #fecaca",
            borderRadius: 10,
            background:
              "#fef2f2",
            color: "#991b1b",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {preview && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              marginTop: 18,
            }}
          >
            <SummaryCard
              label="Spreadsheet Rows"
              value={
                preview
                  .summary
                  .spreadsheetRows
              }
            />

            <SummaryCard
              label="Blank Locations"
              value={
                preview
                  .summary
                  .blankLocationRows
              }
            />

            <SummaryCard
              label="Rows Ready"
              value={
                preview
                  .summary
                  .readyRows
              }
            />

            <SummaryCard
              label="Unique Locations"
              value={
                preview
                  .summary
                  .uniqueLocations
              }
            />

            <SummaryCard
              label="Assignments"
              value={
                preview
                  .summary
                  .productLocationAssignments
              }
            />

            <SummaryCard
              label="Unmatched"
              value={
                preview
                  .summary
                  .unmatchedProducts
              }
            />

            <SummaryCard
              label="Invalid"
              value={
                preview
                  .summary
                  .invalidRows
              }
            />
          </div>

          <div
            style={{
              marginTop: 18,
              border:
                "1px solid #e5e7eb",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding:
                  "10px 12px",
                background:
                  "#f9fafb",
                borderBottom:
                  "1px solid #e5e7eb",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              Populated Location
              Rows
            </div>

            <div
              style={{
                maxHeight: 360,
                overflow: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse:
                    "collapse",
                  fontSize: 12,
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
                      "Row",
                      "Product",
                      "Description",
                      "Entered Location",
                      "Odin Expands To",
                      "Status",
                    ].map(
                      (
                        heading
                      ) => (
                        <th
                          key={
                            heading
                          }
                          style={{
                            padding:
                              "9px 10px",
                            textAlign:
                              "left",
                            borderBottom:
                              "1px solid #e5e7eb",
                            color:
                              "#6b7280",
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
                  {preview.rows.map(
                    (row) => (
                      <tr
                        key={`${row.rowNumber}-${row.productCode}`}
                      >
                        <td
                          style={{
                            padding:
                              "9px 10px",
                            borderBottom:
                              "1px solid #f3f4f6",
                          }}
                        >
                          {
                            row.rowNumber
                          }
                        </td>

                        <td
                          style={{
                            padding:
                              "9px 10px",
                            borderBottom:
                              "1px solid #f3f4f6",
                            fontWeight: 800,
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {
                            row.productCode
                          }
                        </td>

                        <td
                          style={{
                            padding:
                              "9px 10px",
                            borderBottom:
                              "1px solid #f3f4f6",
                          }}
                        >
                          {row.description ??
                            "—"}
                        </td>

                        <td
                          style={{
                            padding:
                              "9px 10px",
                            borderBottom:
                              "1px solid #f3f4f6",
                            fontWeight: 700,
                          }}
                        >
                          {
                            row.rawLocation
                          }
                        </td>

                        <td
                          style={{
                            padding:
                              "9px 10px",
                            borderBottom:
                              "1px solid #f3f4f6",
                          }}
                        >
                          {row.locations.join(
                            " / "
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              "9px 10px",
                            borderBottom:
                              "1px solid #f3f4f6",
                            fontWeight: 800,
                            color:
                              row.status ===
                              "READY"
                                ? "#166534"
                                : "#b91c1c",
                          }}
                        >
                          {
                            row.status
                          }
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
    marginTop: 16,
    padding: 12,
    border:
      "1px solid #e5e7eb",
    borderRadius: 10,
    background:
      "#f9fafb",
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent:
        "space-between",
      alignItems: "center",
      gap: 12,
    }}
  >
    <strong>
      Expanded Warehouse Locations
    </strong>

    <span
      style={{
        fontSize: 12,
        color: "#6b7280",
      }}
    >
      {
        preview
          .uniqueLocations
          .length
      }{" "}
      locations
    </span>
  </div>

  <div
    style={{
      marginTop: 10,
      maxHeight: 220,
      overflow: "auto",
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
    }}
  >
    {preview.uniqueLocations.map(
      (location) => (
        <span
          key={location}
          style={{
            padding:
              "5px 8px",
            border:
              "1px solid #d1d5db",
            borderRadius: 6,
            background:
              "#ffffff",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {location}
        </span>
      )
    )}
  </div>
</div>

{preview.summary
  .unmatchedProducts >
  0 && (
  <div
    style={{
      marginTop: 16,
      padding: 12,
      border:
        "1px solid #fecaca",
      borderRadius: 10,
      background:
        "#fef2f2",
    }}
  >
    <strong
      style={{
        color: "#991b1b",
      }}
    >
      Unmatched Products
    </strong>

    <div
      style={{
        marginTop: 6,
        fontSize: 12,
        color: "#991b1b",
        lineHeight: 1.6,
      }}
    >
      These product codes are
      in the spreadsheet but do
      not currently exist in
      Odin:
    </div>

    {preview.rows
      .filter(
        (row) =>
          row.status ===
          "UNMATCHED_PRODUCT"
      )
      .map((row) => (
        <div
          key={`unmatched-${row.rowNumber}-${row.productCode}`}
          style={{
            marginTop: 6,
            fontSize: 13,
            color: "#991b1b",
          }}
        >
          <strong>
            {row.productCode}
          </strong>{" "}
          — spreadsheet row{" "}
          {row.rowNumber}
          {row.rawLocation
            ? ` — ${row.rawLocation}`
            : ""}
        </div>
      ))}
  </div>
)}
          {preview
            .invalidRows
            .length >
            0 && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                border:
                  "1px solid #fecaca",
                borderRadius: 10,
                background:
                  "#fef2f2",
              }}
            >
              <strong>
                Invalid Rows
              </strong>

              {preview.invalidRows.map(
                (row) => (
                  <div
                    key={
                      row.rowNumber
                    }
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color:
                        "#991b1b",
                    }}
                  >
                    Row{" "}
                    {row.rowNumber}:{" "}
                    {row.productCode ||
                      "(no product code)"}{" "}
                    — {row.message}
                  </div>
                )
              )}
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              padding: 12,
              border:
                "1px solid #bfdbfe",
              borderRadius: 10,
              background:
                "#eff6ff",
              color: "#1e3a8a",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <strong>
              Safe incremental
              import:
            </strong>{" "}
            blank Location rows are
            ignored. Existing Odin
            locations and assignments
            are retained. This import
            only adds missing
            locations and missing
            product/location
            assignments.
          </div>

          <div
            style={{
              display: "flex",
              justifyContent:
                "flex-end",
              marginTop: 16,
            }}
          >
            <button
              type="button"
              onClick={
                confirmImport
              }
              disabled={
                confirming ||
                preview.summary
                  .readyRows ===
                  0 ||
                preview.summary
                  .invalidRows >
                  0 ||
                preview.summary
                  .unmatchedProducts >
                  0
              }
              style={{
                padding:
                  "10px 15px",
                borderRadius: 8,
                border: "none",
                background:
                  confirming ||
                  preview.summary
                    .readyRows ===
                    0 ||
                  preview.summary
                    .invalidRows >
                    0 ||
                  preview.summary
                    .unmatchedProducts >
                    0
                    ? "#9ca3af"
                    : "#166534",
                color:
                  "#ffffff",
                fontWeight: 800,
                cursor:
                  confirming ||
                  preview.summary
                    .readyRows ===
                    0 ||
                  preview.summary
                    .invalidRows >
                    0 ||
                  preview.summary
                    .unmatchedProducts >
                    0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {confirming
                ? "Importing..."
                : "Confirm Location Import"}
            </button>
          </div>
        </>
      )}

      {confirmed && (
        <div
          style={{
            marginTop: 18,
            padding: 14,
            border:
              "1px solid #bbf7d0",
            borderRadius: 10,
            background:
              "#f0fdf4",
            color: "#166534",
          }}
        >
          <div
            style={{
              fontWeight: 800,
            }}
          >
            Location import
            completed.
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {
              confirmed
                .summary
                .createdLocations
            }{" "}
            new warehouse
            locations created,{" "}
            {
              confirmed
                .summary
                .createdAssignments
            }{" "}
            new product/location
            assignments created and{" "}
            {
              confirmed
                .summary
                .existingAssignments
            }{" "}
            existing assignments
            retained.
          </div>
        </div>
      )}
    </section>
  );
}