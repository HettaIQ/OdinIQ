"use client";

import { useState } from "react";

type InvoicePreview = {
  supplierName: string;
  supplierAccountCode: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  customerReference: string | null;
  deliveryNoteNumber: string | null;
  deliveryDate: string | null;
  supplierOrderNumber: string | null;
  supplierOrderDate: string | null;
  line: {
    lineNumber: number;
    productCode: string;
    itemDate: string;
    quantity: number | null;
    unitPrice: number | null;
    netValue: number | null;
    description: string | null;
  } | null;
  itemsTotal: number | null;
  vatRate: number | null;
  vatValue: number | null;
  totalNet: number | null;
  finalAmount: number | null;
  currency: string;
};

type BatchResult =
  | {
      success: true;
      fileName: string;
      invoice: InvoicePreview;
    }
  | {
      success: false;
      fileName: string;
      error: string;
    };

function formatMoney(value: number | null) {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

export default function SupplierBillImporter() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  function handleFiles(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    setFiles(
      Array.from(event.target.files ?? []),
    );

    setResults([]);
    setError("");
  }

  async function previewInvoices() {
    if (files.length === 0) {
      return;
    }

    setLoading(true);
    setResults([]);
    setError("");

    try {
      const formData = new FormData();

      for (const file of files) {
        formData.append("files", file);
      }

      const response = await fetch(
        "/api/supplier-bill-import",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = (await response.json()) as {
        results?: BatchResult[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error ??
            "The invoices could not be read.",
        );
      }

      setResults(data.results ?? []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The invoices could not be read.",
      );
    } finally {
      setLoading(false);
    }
  }

  const successful = results.filter(
    (
      result,
    ): result is Extract<
      BatchResult,
      { success: true }
    > => result.success,
  );

  const failed = results.filter(
    (
      result,
    ): result is Extract<
      BatchResult,
      { success: false }
    > => !result.success,
  );

  const totalQuantity = successful.reduce(
    (total, result) =>
      total +
      (result.invoice.line?.quantity ?? 0),
    0,
  );

  const totalNet = successful.reduce(
    (total, result) =>
      total +
      (result.invoice.totalNet ?? 0),
    0,
  );

  const totalVat = successful.reduce(
    (total, result) =>
      total +
      (result.invoice.vatValue ?? 0),
    0,
  );

  async function importInvoices() {
    if (successful.length === 0) {
      return;
    }

    setImporting(true);
    setImportMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/supplier-bill-import/save",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            invoices: successful.map(
              (result) => result.invoice,
            ),
          }),
        },
      );

      const data = (await response.json()) as {
        imported?: number;
        skipped?: number;
        failed?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error ??
            "The invoices could not be imported.",
        );
      }

      setImportMessage(
        `Imported ${data.imported ?? 0}, skipped ${
          data.skipped ?? 0
        }, failed ${data.failed ?? 0}.`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The invoices could not be imported.",
      );
    } finally {
      setImporting(false);
    }
  }
  const totalGross = successful.reduce(
    (total, result) =>
      total +
      (result.invoice.finalAmount ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Supplier Invoice PDFs
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Upload supplier invoice PDFs. Odin will extract
          the actual products purchased, quantities and costs
          before anything is imported.
        </p>

        <div className="mt-6">
          <label
            htmlFor="supplier-bill-files"
            className="block text-sm font-medium text-slate-700"
          >
            Select supplier invoices
          </label>

          <input
            id="supplier-bill-files"
            type="file"
            accept="application/pdf,.pdf"
            multiple
            onChange={handleFiles}
            className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {files.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Files selected
              </h3>

              <span className="text-sm text-slate-500">
                {files.length} file
                {files.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-3 divide-y rounded-lg border border-slate-200">
              {files.map((file) => (
                <div
                  key={`${file.name}-${file.size}`}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <span className="truncate text-sm text-slate-700">
                    {file.name}
                  </span>

                  <span className="whitespace-nowrap text-xs text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={previewInvoices}
              disabled={loading}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Reading Invoices..."
                : `Preview ${files.length} Invoice${
                    files.length === 1 ? "" : "s"
                  }`}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        <div className="mt-6 rounded-lg bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">
            Nothing will be imported automatically.
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Review the complete batch before saving
            anything to Purchase Intelligence.
          </p>
        </div>
      </div>

      {results.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Invoice Batch Preview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {successful.length} successfully read
                {failed.length > 0
                  ? `, ${failed.length} failed`
                  : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={importInvoices}
              disabled={
                importing ||
                successful.length === 0 ||
                failed.length > 0
              }
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing
                ? "Importing..."
                : `Import ${successful.length} Invoice${
                    successful.length === 1 ? "" : "s"
                  }`}
            </button>
          </div>

          {importMessage && (
            <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-medium text-green-800">
                {importMessage}
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase text-slate-500">
                Invoices
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {successful.length}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase text-slate-500">
                Total Quantity
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {totalQuantity.toLocaleString("en-GB")}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase text-slate-500">
                Net Spend
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {formatMoney(totalNet)}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase text-slate-500">
                Gross Spend
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {formatMoney(totalGross)}
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    Invoice
                  </th>
                  <th className="px-4 py-3">
                    Date
                  </th>
                  <th className="px-4 py-3">
                    Product
                  </th>
                  <th className="px-4 py-3">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right">
                    Unit Cost
                  </th>
                  <th className="px-4 py-3 text-right">
                    Net
                  </th>
                  <th className="px-4 py-3 text-right">
                    VAT
                  </th>
                  <th className="px-4 py-3 text-right">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {successful.map((result) => (
                  <tr key={result.fileName}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {result.invoice.invoiceNumber}
                    </td>

                    <td className="px-4 py-3">
                      {result.invoice.invoiceDate}
                    </td>

                    <td className="px-4 py-3">
                      {result.invoice.line?.productCode ??
                        "-"}
                    </td>

                    <td className="px-4 py-3">
                      {result.invoice.line?.description ??
                        "-"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {result.invoice.line?.quantity ??
                        "-"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatMoney(
                        result.invoice.line?.unitPrice ??
                          null,
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatMoney(
                        result.invoice.totalNet,
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatMoney(
                        result.invoice.vatValue,
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(
                        result.invoice.finalAmount,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-3"
                  >
                    Batch Total
                  </td>

                  <td className="px-4 py-3 text-right">
                    {totalQuantity.toLocaleString(
                      "en-GB",
                    )}
                  </td>

                  <td />

                  <td className="px-4 py-3 text-right">
                    {formatMoney(totalNet)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {formatMoney(totalVat)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {formatMoney(totalGross)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {failed.length > 0 && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                Invoices requiring attention
              </p>

              <div className="mt-2 space-y-1">
                {failed.map((result) => (
                  <p
                    key={result.fileName}
                    className="text-sm text-red-700"
                  >
                    {result.fileName}: {result.error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}