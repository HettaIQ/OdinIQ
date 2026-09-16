"use client";

import {
  DragEvent,
  useRef,
  useState,
} from "react";
import * as XLSX from "xlsx";

type PreviewRow = {
  invoiceNumber?: string | number;
  invoiceType?: string;
  invoiceDate?: string;
  customerAccountCode?: string;
  salesOrderNumber?: string | number;
  customerOrderNumber: string;
  customerName?: string;
  stockCode?: string;
  description?: string;
  quantity?: string | number;
  netAmount?: string | number;
  taxAmount?: string | number;
  grossAmount?: string | number;
};

export default function InvoiceImportUploader() {
  const [fileName, setFileName] =
    useState("");

  const [rows, setRows] =
    useState<PreviewRow[]>([]);

  const [error, setError] =
    useState("");

  const [importing, setImporting] =
    useState(false);

  const [
    importMessage,
    setImportMessage,
  ] = useState("");

  const [isDragging, setIsDragging] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  function normalise(
    value: unknown
  ) {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isSupportedFile(
    file: File
  ) {
    const name =
      file.name.toLowerCase();

    return (
      name.endsWith(".xlsx") ||
      name.endsWith(".xls") ||
      name.endsWith(".csv")
    );
  }

  async function handleFile(
    file: File
  ) {
    setError("");
    setImportMessage("");
    setFileName("");
    setRows([]);

    if (!isSupportedFile(file)) {
      setError(
        "Please select a Sage Excel or CSV file (.xlsx, .xls or .csv)."
      );

      return;
    }

    try {
      const buffer =
        await file.arrayBuffer();

      const workbook = XLSX.read(
        buffer,
        {
          type: "array",
          cellDates: false,
        }
      );

      const firstSheetName =
        workbook.SheetNames[0];

      if (!firstSheetName) {
        setError(
          "No worksheet was found in this file."
        );

        return;
      }

      const worksheet =
        workbook.Sheets[
          firstSheetName
        ];

      const rawRows =
        XLSX.utils.sheet_to_json<
          unknown[]
        >(worksheet, {
          header: 1,
          defval: "",
          raw: false,
        });

      if (rawRows.length < 2) {
        setError(
          "The invoice file does not contain enough data."
        );

        return;
      }

      const headerRowIndex =
        rawRows.findIndex(
          (row) => {
            const values =
              row.map(
                (value) =>
                  normalise(value)
              );

            return values.some(
              (value) => {
                const simplified =
                  value.replace(
                    /[^a-z0-9]/g,
                    ""
                  );

                return (
                  simplified ===
                    "invoicenumber" ||
                  simplified ===
                    "invoiceno" ||
                  simplified ===
                    "no" ||
                  (
                    simplified.includes(
                      "invoice"
                    ) &&
                    (
                      simplified.includes(
                        "number"
                      ) ||
                      simplified.includes(
                        "no"
                      )
                    )
                  )
                );
              }
            );
          }
        );

      if (
        headerRowIndex === -1
      ) {
        setError(
          "OdinIQ could not find the Sage invoice column headings in this file."
        );

        return;
      }

      const headers =
        rawRows[
          headerRowIndex
        ].map((value) =>
          String(
            value ?? ""
          ).trim()
        );

      const dataRows =
        rawRows.slice(
          headerRowIndex + 1
        );

      function findHeaderIndex(
        possibleNames: string[]
      ) {
        return headers.findIndex(
          (header) =>
            possibleNames.some(
              (name) =>
                normalise(
                  header
                ) ===
                normalise(name)
            )
        );
      }

      const accountIndex =
        findHeaderIndex([
          "Invoice.AccountReference",
          "Customer Ref",
          "A/C",
        ]);

      const customerIndex =
        findHeaderIndex([
          "Invoice.AccountName",
          "Customer Name",
          "Name",
        ]);

      const invoiceNumberIndex =
        findHeaderIndex([
          "Invoice.Number",
          "Invoice Number",
          "No.",
        ]);

      const invoiceTypeIndex =
        findHeaderIndex([
          "Invoice.Type",
          "Invoice Type",
          "Type",
        ]);

      const salesOrderNumberIndex =
        findHeaderIndex([
          "Invoice.OrderNumber",
          "Sales Order Number",
          "Order Number",
          "Sales Order No",
        ]);

      const customerOrderNumberIndex =
        findHeaderIndex([
          "Invoice.CustomerOrderNumber",
          "Customer Order Number",
          "Customer Order No",
          "Customer Order No.",
        ]);

      const invoiceDateIndex =
        findHeaderIndex([
          "Invoice.Date",
          "Invoice Date",
          "Date",
        ]);

      const stockCodeIndex =
        findHeaderIndex([
          "InvoiceItem.ProductAccountReference",
          "Stock Code",
        ]);

      const descriptionIndex =
        findHeaderIndex([
          "InvoiceItem.Description",
          "Description",
        ]);

      const quantityIndex =
        findHeaderIndex([
          "InvoiceItem.Quantity",
          "Quantity",
        ]);

      const netAmountIndex =
        findHeaderIndex([
          "InvoiceItem.AmountNet",
          "Net Amount",
          "Total Net",
        ]);

      const taxAmountIndex =
        findHeaderIndex([
          "InvoiceItem.AmountVAT",
          "Tax Amount",
          "Total VAT",
        ]);

      const grossAmountIndex =
        findHeaderIndex([
          "Amount £",
          "Gross Amount",
        ]);

      if (
        invoiceNumberIndex === -1
      ) {
        setError(
          "OdinIQ could not identify the Invoice Number column."
        );

        return;
      }

      const parsedRows:
        PreviewRow[] = [];

      for (
        const row of dataRows
      ) {
        const invoiceNumber =
          String(
            row[
              invoiceNumberIndex
            ] ?? ""
          ).trim();

        if (!invoiceNumber) {
          continue;
        }

        const salesOrderNumber =
          salesOrderNumberIndex >=
          0
            ? String(
                row[
                  salesOrderNumberIndex
                ] ?? ""
              ).trim()
            : "";

        const customerOrderNumber =
          customerOrderNumberIndex >=
          0
            ? String(
                row[
                  customerOrderNumberIndex
                ] ?? ""
              ).trim()
            : "";

        parsedRows.push({
          invoiceNumber,

          salesOrderNumber,

          customerOrderNumber,

          invoiceDate:
            invoiceDateIndex >= 0
              ? String(
                  row[
                    invoiceDateIndex
                  ] ?? ""
                ).trim()
              : "",

          invoiceType:
            invoiceTypeIndex >= 0
              ? String(
                  row[
                    invoiceTypeIndex
                  ] ?? ""
                ).trim()
              : "",

          customerAccountCode:
            accountIndex >= 0
              ? String(
                  row[
                    accountIndex
                  ] ?? ""
                ).trim()
              : "",

          customerName:
            customerIndex >= 0
              ? String(
                  row[
                    customerIndex
                  ] ?? ""
                ).trim()
              : "",

          stockCode:
            stockCodeIndex >= 0
              ? String(
                  row[
                    stockCodeIndex
                  ] ?? ""
                ).trim()
              : "",

          description:
            descriptionIndex >= 0
              ? String(
                  row[
                    descriptionIndex
                  ] ?? ""
                ).trim()
              : "",

          quantity:
            quantityIndex >= 0
              ? String(
                  row[
                    quantityIndex
                  ] ?? ""
                ).trim()
              : "",

          netAmount:
            netAmountIndex >= 0
              ? String(
                  row[
                    netAmountIndex
                  ] ?? ""
                ).trim()
              : "",

          taxAmount:
            taxAmountIndex >= 0
              ? String(
                  row[
                    taxAmountIndex
                  ] ?? ""
                ).trim()
              : "",

          grossAmount:
            grossAmountIndex >= 0
              ? String(
                  row[
                    grossAmountIndex
                  ] ?? ""
                ).trim()
              : "",
        });
      }

      if (
        parsedRows.length === 0
      ) {
        setError(
          "OdinIQ could not find any invoice lines in this file."
        );

        return;
      }

      setFileName(file.name);
      setRows(parsedRows);
    } catch (err) {
      console.error(
        "Invoice file read failed:",
        err
      );

      setError(
        "OdinIQ could not read this invoice file."
      );
    }
  }

  function handleDragEnter(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(true);
  }

  function handleDragOver(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    event.dataTransfer.dropEffect =
      "copy";

    setIsDragging(true);
  }

  function handleDragLeave(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (
      event.currentTarget.contains(
        event.relatedTarget as Node
      )
    ) {
      return;
    }

    setIsDragging(false);
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);

    const file =
      event.dataTransfer.files?.[0];

    if (file) {
      void handleFile(file);
    }
  }

  function openFilePicker() {
    if (importing) {
      return;
    }

    fileInputRef.current?.click();
  }

  async function importInvoice() {
    if (rows.length === 0) {
      return;
    }

    setImporting(true);
    setImportMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/invoice-import",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              rows,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "OdinIQ could not import this invoice."
        );
      }

      setImportMessage(
        `${Number(
          result.invoiceCount ?? 0
        ).toLocaleString(
          "en-GB"
        )} invoice/credit records imported successfully.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "OdinIQ could not import this invoice."
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <div
        onDragEnter={
          handleDragEnter
        }
        onDragOver={
          handleDragOver
        }
        onDragLeave={
          handleDragLeave
        }
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
          isDragging
            ? "border-amber-500 bg-amber-50"
            : "border-slate-300 bg-slate-50"
        }`}
      >
        <p className="font-semibold text-slate-900">
          Sage invoice export
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Drag and drop your Sage
          invoice/credit Excel file here,
          or choose it manually.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(event) => {
            const file =
              event.target.files?.[0];

            if (file) {
              void handleFile(file);
            }

            event.currentTarget.value =
              "";
          }}
        />

        <button
          type="button"
          onClick={
            openFilePicker
          }
          disabled={importing}
          className="mt-5 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Choose Excel File
        </button>

        <p className="mt-3 text-xs text-slate-400">
          .xlsx, .xls or .csv
        </p>

        {fileName && (
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Loaded: {fileName}
          </p>
        )}
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            File detected
          </p>

          <h3 className="mt-1 text-lg font-bold text-slate-950">
            Invoice preview
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Showing the first{" "}
            {Math.min(
              rows.length,
              20
            ).toLocaleString(
              "en-GB"
            )}{" "}
            of{" "}
            {rows.length.toLocaleString(
              "en-GB"
            )}{" "}
            invoice lines. Nothing has
            been imported yet.
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    Invoice
                  </th>

                  <th className="px-4 py-3 text-left">
                    Date
                  </th>

                  <th className="px-4 py-3 text-left">
                    Type
                  </th>

                  <th className="px-4 py-3 text-left">
                    Account
                  </th>

                  <th className="px-4 py-3 text-left">
                    Customer
                  </th>

                  <th className="px-4 py-3 text-left">
                    Stock Code
                  </th>

                  <th className="px-4 py-3 text-left">
                    Description
                  </th>

                  <th className="px-4 py-3 text-left">
                    Qty
                  </th>

                  <th className="px-4 py-3 text-left">
                    Net
                  </th>

                  <th className="px-4 py-3 text-left">
                    Tax
                  </th>

                  <th className="px-4 py-3 text-left">
                    Gross
                  </th>

                  <th className="px-4 py-3 text-left">
                    Sales Order
                  </th>

                  <th className="px-4 py-3 text-left">
                    Customer Order No
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {rows
                  .slice(0, 20)
                  .map(
                    (
                      row,
                      index
                    ) => (
                      <tr
                        key={
                          index
                        }
                      >
                        <td className="px-4 py-3">
                          {
                            row.invoiceNumber
                          }
                        </td>

                        <td className="px-4 py-3">
                          {
                            row.invoiceDate
                          }
                        </td>

                        <td className="px-4 py-3">
                          {
                            row.invoiceType
                          }
                        </td>

                        <td className="px-4 py-3">
                          {
                            row.customerAccountCode
                          }
                        </td>

                        <td className="px-4 py-3">
                          {
                            row.customerName
                          }
                        </td>

                        <td className="px-4 py-3">
                          {
                            row.stockCode
                          }
                        </td>

                        <td className="px-4 py-3">
                          {
                            row.description
                          }
                        </td>

                        <td className="px-4 py-3">
                          {String(
                            row.quantity ??
                              ""
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {String(
                            row.netAmount ??
                              ""
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {String(
                            row.taxAmount ??
                              ""
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {String(
                            row.grossAmount ??
                              ""
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {String(
                            row.salesOrderNumber ??
                              ""
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {
                            row.customerOrderNumber
                          }
                        </td>
                      </tr>
                    )
                  )}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={
                importInvoice
              }
              disabled={
                importing ||
                rows.length === 0
              }
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing
                ? "Importing..."
                : `Import ${rows.length.toLocaleString(
                    "en-GB"
                  )} Invoices & Credits`}
            </button>

            {importMessage && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                {
                  importMessage
                }
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}