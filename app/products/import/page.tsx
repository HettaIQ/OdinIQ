"use client";

import Link from "next/link";
import { useState } from "react";

type ImportedProduct = Record<string, unknown>;

type AnalysisResult = {
  message?: string;
  fileName?: string;
  sheetName?: string;
  detectedHeaderRow?: number;
  merchantDiscountCount?: number;
  merchantDiscounts?: Array<{
    merchant: string;
    discount: string;
  }>;
  productCount?: number;
  headers?: string[];
  products?: ImportedProduct[];
  preview?: ImportedProduct[];
};

type SaveResult = {
  success: boolean;
  message: string;
  summary?: {
    received: number;
    created: number;
    updated: number;
    skipped: number;
    totalProducts: number;
  };
  errors?: Array<{
    row: number;
    productCode?: string;
    reason: string;
  }>;
};

export default function ProductImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    setResult(null);
    setSaveResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as AnalysisResult;

      if (!response.ok) {
        setResult({
          message: data.message || "The file could not be analysed.",
        });
        return;
      }

      setResult(data);
    } catch (error) {
      console.error("File analysis failed:", error);

      setResult({
        message: "The file could not be analysed.",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveImport() {
    if (!result?.products?.length) {
      setSaveResult({
        success: false,
        message: "No analysed products are available to import.",
      });
      return;
    }

    setSaving(true);
    setSaveResult(null);

    try {
      const response = await fetch("/api/products/save-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          products: result.products,
        }),
      });

      const data = (await response.json()) as SaveResult;
      setSaveResult(data);
    } catch (error) {
      console.error("Import save failed:", error);

      setSaveResult({
        success: false,
        message: "The products could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  }

  function displayValue(
    row: ImportedProduct,
    possibleHeaders: string[]
  ): string {
    for (const header of possibleHeaders) {
      const value = row[header];

      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value);
      }
    }

    return "—";
  }

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
          width: "100%",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <Link
          href="/imports"
          style={{
            color: "#d4af37",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          ← Back to Commercial Import Centre
        </Link>

        <div style={{ marginTop: "34px" }}>
          <p
            style={{
              color: "#d4af37",
              fontSize: "13px",
              fontWeight: "bold",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              marginBottom: "10px",
            }}
          >
            Products & Pricing
          </p>

          <h1
            style={{
              fontSize: "44px",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            OdinIQ Product Import
          </h1>

          <p
            style={{
              color: "#a5a5a5",
              fontSize: "17px",
              lineHeight: 1.6,
              maxWidth: "760px",
              marginTop: "16px",
            }}
          >
            Upload an Excel or CSV price file. OdinIQ will detect the
            product columns, analyse the contents and prepare the products
            for import.
          </p>
        </div>

        <section
          style={{
            marginTop: "30px",
            padding: "26px",
            background: "#151515",
            border: "1px solid #2b2b2b",
            borderRadius: "14px",
          }}
        >
          <label
            htmlFor="product-file"
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "12px",
            }}
          >
            Select product file
          </label>

          <input
            id="product-file"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setResult(null);
              setSaveResult(null);
            }}
          />

          {file && (
            <p
              style={{
                color: "#a5a5a5",
                marginTop: "14px",
                marginBottom: 0,
              }}
            >
              Selected: {file.name}
            </p>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            style={{
              marginTop: "22px",
              padding: "13px 24px",
              background: !file || uploading ? "#695d2b" : "#d4af37",
              color: "#111111",
              border: "none",
              borderRadius: "8px",
              cursor: !file || uploading ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "15px",
            }}
          >
            {uploading ? "Analysing file..." : "Analyse with OdinIQ"}
          </button>
        </section>

        {result?.message && !result.fileName && (
          <div
            style={{
              marginTop: "24px",
              padding: "18px",
              borderRadius: "10px",
              background: "#2a1515",
              border: "1px solid #6f2a2a",
              color: "#ff8f8f",
            }}
          >
            {result.message}
          </div>
        )}

        {result?.fileName && (
          <section
            style={{
              marginTop: "30px",
              background: "#141414",
              padding: "28px",
              borderRadius: "14px",
              border: "1px solid #2b2b2b",
            }}
          >
            <p
              style={{
                color: "#d4af37",
                fontSize: "13px",
                fontWeight: "bold",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                marginBottom: "10px",
              }}
            >
              Commercial File Analysis
            </p>

            <h2 style={{ marginTop: 0, marginBottom: "8px" }}>
              {result.fileName}
            </h2>

            <p style={{ color: "#999999", marginTop: 0 }}>
              OdinIQ has analysed the file and identified its commercial
              product data.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "14px",
                marginTop: "26px",
              }}
            >
              <AnalysisCard
                label="Detected Type"
                value="Product Price List"
              />

              <AnalysisCard
                label="Products Found"
                value={String(result.productCount ?? 0)}
              />

              <AnalysisCard
                label="Merchant Discounts"
                value={String(result.merchantDiscountCount ?? 0)}
              />

              <AnalysisCard
                label="Worksheet"
                value={result.sheetName ?? "Unknown"}
              />
            </div>

            {!!result.preview?.length && (
              <div style={{ marginTop: "28px" }}>
                <h3 style={{ marginBottom: "14px" }}>Product preview</h3>

                <div
                  style={{
                    overflowX: "auto",
                    border: "1px solid #292929",
                    borderRadius: "10px",
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
                      <tr style={{ background: "#0b0b0f" }}>
                        <th style={tableHeadingStyle}>Product Code</th>
                        <th style={tableHeadingStyle}>Description</th>
                        <th style={tableHeadingStyle}>Supplier</th>
                        <th style={tableHeadingStyle}>Cost Price</th>
                        <th style={tableHeadingStyle}>List Price</th>
                      </tr>
                    </thead>

                    <tbody>
                      {result.preview.slice(0, 8).map((row, index) => (
                        <tr key={index}>
                          <td style={tableCellStyle}>
                            {displayValue(row, [
                              "Product Code",
                              "Product code",
                              "productCode",
                              "Code",
                            ])}
                          </td>

                          <td style={tableCellStyle}>
                            {displayValue(row, [
                              "Description",
                              "description",
                              "Product Description",
                            ])}
                          </td>

                          <td style={tableCellStyle}>
                            {displayValue(row, ["Supplier", "supplier"])}
                          </td>

                          <td style={tableCellStyle}>
                            {displayValue(row, [
                              "Cost to us",
                              "Cost Price",
                              "costPrice",
                            ])}
                          </td>

                          <td style={tableCellStyle}>
                            {displayValue(row, [
                              "New August Price",
                              "New Price",
                              "List Price",
                              "listPrice",
                            ])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: "24px",
                background: "#211e12",
                border: "1px solid #5b4e17",
                padding: "20px",
                borderRadius: "10px",
              }}
            >
              <h3 style={{ marginTop: 0, color: "#d4af37" }}>
                Odin Recommendation
              </h3>

              <p style={{ marginBottom: 0, lineHeight: 1.6 }}>
                This appears to be a product price list. Continue to create
                new products and update any existing products that use the
                same product code.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveImport}
              disabled={saving || !result.products?.length}
              style={{
                marginTop: "24px",
                padding: "13px 24px",
                background:
                  saving || !result.products?.length
                    ? "#695d2b"
                    : "#d4af37",
                color: "#111111",
                border: "none",
                borderRadius: "8px",
                cursor:
                  saving || !result.products?.length
                    ? "not-allowed"
                    : "pointer",
                fontWeight: "bold",
                fontSize: "15px",
              }}
            >
              {saving ? "Importing products..." : "Continue Import →"}
            </button>

            {saveResult && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "18px",
                  borderRadius: "10px",
                  background: saveResult.success ? "#142418" : "#2a1515",
                  border: saveResult.success
                    ? "1px solid #315f3a"
                    : "1px solid #6f2a2a",
                  color: saveResult.success ? "#6eeb83" : "#ff8f8f",
                }}
              >
                <strong>{saveResult.message}</strong>

                {saveResult.summary && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(130px, 1fr))",
                      gap: "12px",
                      marginTop: "16px",
                    }}
                  >
                    <SummaryItem
                      label="Received"
                      value={saveResult.summary.received}
                    />
                    <SummaryItem
                      label="Created"
                      value={saveResult.summary.created}
                    />
                    <SummaryItem
                      label="Updated"
                      value={saveResult.summary.updated}
                    />
                    <SummaryItem
                      label="Skipped"
                      value={saveResult.summary.skipped}
                    />
                    <SummaryItem
                      label="Total Products"
                      value={saveResult.summary.totalProducts}
                    />
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function AnalysisCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#0b0b0f",
        padding: "18px",
        borderRadius: "10px",
        border: "1px solid #292929",
      }}
    >
      <p style={{ color: "#999999", margin: 0 }}>{label}</p>
      <h3 style={{ marginBottom: 0 }}>{value}</h3>
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      style={{
        padding: "12px",
        background: "#0b0b0f",
        borderRadius: "8px",
      }}
    >
      <div style={{ color: "#999999", fontSize: "12px" }}>{label}</div>
      <div
        style={{
          color: "#ffffff",
          fontSize: "20px",
          fontWeight: "bold",
          marginTop: "5px",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const tableHeadingStyle = {
  padding: "13px",
  textAlign: "left" as const,
  borderBottom: "1px solid #292929",
  color: "#d4af37",
  fontSize: "13px",
};

const tableCellStyle = {
  padding: "13px",
  borderBottom: "1px solid #242424",
  color: "#dddddd",
  fontSize: "14px",
};