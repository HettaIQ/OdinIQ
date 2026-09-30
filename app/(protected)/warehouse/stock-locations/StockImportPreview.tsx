"use client";

import { useState } from "react";

type PreviewRow = {
  rowNumber: number;
  itemCode: string;
  itemName: string;
  closingBalance: number | null;
  matched: boolean;
  productId: number | null;
  odinDescription: string | null;
  previousStock: number | null;
};

type PreviewResult = {
  success: boolean;
  fileName: string;
  sheetName: string;
  summary: {
    spreadsheetRows: number;
    matched: number;
    changing: number;
    unchanged: number;
    unmatched: number;
    invalid: number;
  };
  rows: PreviewRow[];
};

type ImportResult = {
  success: boolean;
  summary: {
    updated: number;
    unchanged: number;
    unmatched: number;
    invalid: number;
  };
  importedAt: string;
};

export default function StockImportPreview() {
  const [file, setFile] =
    useState<File | null>(null);

  const [result, setResult] =
    useState<PreviewResult | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [importing, setImporting] =
    useState(false);

  const [importResult, setImportResult] =
    useState<ImportResult | null>(null);

  async function previewImport() {
    if (!file) {
      setError(
        "Please select your Xero stock file."
      );
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/warehouse/stock-import/preview",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ??
            "Odin could not read the stock file."
        );
        return;
      }

      setResult(data);
    } catch {
      setError(
        "Odin could not read the stock file."
      );
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!file || !result) {
      return;
    }

    const confirmed = window.confirm(
      `Import stock quantities for ${result.summary.matched} matched products?\n\n` +
        `${result.summary.changing} stock quantities will change.\n` +
        `${result.summary.unmatched} unmatched items will NOT be imported.`
    );

    if (!confirmed) {
      return;
    }

    setImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/warehouse/stock-import/confirm",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ??
            "Odin could not import the stock file."
        );
        return;
      }

      setImportResult(data);

      await previewImport();
    } catch {
      setError(
        "Odin could not import the stock file."
      );
    } finally {
      setImporting(false);
    }
  }

  const unmatchedRows =
    result?.rows.filter(
      (row) => !row.matched
    ) ?? [];

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
            Stock Import
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-950">
            Upload Xero Stock
          </h2>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Upload the Xero Inventory Item
            Summary. Odin will match Item Code
            to Product Code and read the
            Closing Balance as the current
            stock quantity.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => {
              setFile(
                event.target.files?.[0] ??
                  null
              );
              setResult(null);
              setImportResult(null);
              setError(null);
            }}
            className="block max-w-sm rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          />

          <button
            type="button"
            onClick={previewImport}
            disabled={!file || loading || importing}
            className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading
              ? "Checking..."
              : "Preview Import"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {importResult && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
          <p className="font-bold text-emerald-900">
            Stock import completed successfully
          </p>

          <p className="mt-1 text-sm text-emerald-800">
            {importResult.summary.updated} products
            updated,{" "}
            {importResult.summary.unchanged} unchanged,{" "}
            {importResult.summary.unmatched} unmatched
            and{" "}
            {importResult.summary.invalid} invalid.
          </p>
        </div>
      )}

      {result && (
        <div className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Spreadsheet Rows
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                {result.summary.spreadsheetRows}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Matched
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-800">
                {result.summary.matched}
              </p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                Changing
              </p>
              <p className="mt-2 text-2xl font-bold text-blue-800">
                {result.summary.changing}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                Unchanged
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {result.summary.unchanged}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                Unmatched
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-800">
                {result.summary.unmatched}
              </p>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                Invalid
              </p>
              <p className="mt-2 text-2xl font-bold text-red-800">
                {result.summary.invalid}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-bold text-slate-900">
              {result.fileName}
            </span>{" "}
            was read successfully. No stock
            quantities have been changed.
          </div>

          {result.summary.changing > 0 && (
            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-blue-950">
                  Ready to import
                </p>

                <p className="mt-1 text-sm text-blue-800">
                  {result.summary.changing} matched
                  stock quantities will be updated.
                  The {result.summary.unmatched}{" "}
                  unmatched items will not be changed.
                </p>
              </div>

              <button
                type="button"
                onClick={confirmImport}
                disabled={importing || loading}
                className="shrink-0 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {importing
                  ? "Importing..."
                  : "Confirm Stock Import"}
              </button>
            </div>
          )}

          {result.summary.changing === 0 &&
            result.summary.matched > 0 && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="font-bold text-emerald-900">
                  Stock is already up to date
                </p>

                <p className="mt-1 text-sm text-emerald-800">
                  All {result.summary.matched} matched
                  products already have the same stock
                  quantities in Odin.
                </p>
              </div>
            )}

          {unmatchedRows.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-xl border border-amber-200">
              <div className="bg-amber-50 px-4 py-3">
                <p className="font-bold text-amber-900">
                  Products not matched in Odin
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  These Xero item codes were not
                  found in OdinIQ and will not be
                  imported.
                </p>
              </div>

              <div className="max-h-72 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <th className="px-4 py-3">
                        Item Code
                      </th>
                      <th className="px-4 py-3">
                        Item Name
                      </th>
                      <th className="px-4 py-3 text-right">
                        Closing Balance
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {unmatchedRows.map(
                      (row) => (
                        <tr
                          key={`${row.rowNumber}-${row.itemCode}`}
                          className="border-b border-slate-100 last:border-b-0"
                        >
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {row.itemCode}
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {row.itemName}
                          </td>

                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {row.closingBalance ??
                              "Invalid"}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}