"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

type InvoicePreviewRow = {
  invoiceNumber: string;
  invoiceType: string;
  invoiceDate: string;
  customerName: string;
  customerAccountCode: string;

  amount: string | number;
  netAmount: string | number;
  taxAmount: string | number;
  grossAmount: string | number;

  salesOrderNumber: string;
  customerOrderNumber: string;

  stockCode: string;
  description: string;
  quantity: string | number;
};

export default function InvoiceImportUploader() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<InvoicePreviewRow[]>([]);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  function normalise(value: unknown) {
    return String(value ?? "")
      .replace(/:/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function simplify(value: unknown) {
    return normalise(value).replace(/[^a-z0-9]/g, "");
  }

  async function handleFile(file: File) {
    setError("");
    setImportMessage("");
    setFileName("");
    setRows([]);

    try {
      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
      });

      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setError("No worksheet was found in this file.");
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];

      const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        defval: "",
        raw: false,
      });

      if (rawRows.length < 2) {
        setError("The invoice file does not contain enough data.");
        return;
      }

      /*
       * Sage exports are not consistent about where the actual headings
       * appear. Some start immediately, while reports can contain one or
       * more title rows first.
       */
      const headerRowIndex = rawRows.findIndex((row) => {
        const values = row.map((value) => simplify(value));

        const hasInvoiceNumber = values.some((value) =>
          [
            "no",
            "invoiceno",
            "invoicenumber",
          ].includes(value)
        );

        const hasInvoiceDate = values.some((value) =>
          [
            "date",
            "invoicedate",
          ].includes(value)
        );

        return hasInvoiceNumber && hasInvoiceDate;
      });

      if (headerRowIndex === -1) {
        setError(
          "OdinIQ could not find the Sage invoice column headings in this file."
        );
        return;
      }

      const headerRow = rawRows[headerRowIndex];

      const findColumn = (labels: string[]) =>
        headerRow.findIndex((value) => {
          const current = simplify(value);

          return labels.some(
            (label) => current === simplify(label)
          );
        });

      const invoiceNumberIndex = findColumn([
        "no",
        "no.",
        "invoice no",
        "invoice number",
        "invoice.number",
      ]);

      const invoiceTypeIndex = findColumn([
        "type",
        "invoice type",
        "invoice.type",
        "invoice.typeid",
        "type id",
      ]);

      const invoiceDateIndex = findColumn([
        "date",
        "invoice date",
        "invoice.date",
      ]);

      const customerNameIndex = findColumn([
        "name",
        "customer name",
        "invoice.accountname",
        "invoice.customername",
        "account name",
      ]);

      const customerAccountCodeIndex = findColumn([
        "account",
        "account code",
        "customer account",
        "customer account code",
        "a/c",
        "customer ref",
        "invoice.accountreference",
        "invoice account reference",
      ]);

      const salesOrderNumberIndex = findColumn([
        "sales order no",
        "sales order number",
        "invoice.salesordernumber",
      ]);

      const customerOrderNumberIndex = findColumn([
        "customer order no",
        "customer order number",
        "invoice.customerordernumber",
      ]);

      const stockCodeIndex = findColumn([
        "stock code",
        "product code",
        "invoiceitem.productaccountreference",
      ]);

      const descriptionIndex = findColumn([
        "description",
        "invoiceitem.description",
      ]);

      const quantityIndex = findColumn([
        "quantity",
        "invoiceitem.quantity",
      ]);

      const netAmountIndex = findColumn([
        "total net",
        "net",
        "net amount",
        "invoiceitem.amountnet",
      ]);

      const taxAmountIndex = findColumn([
        "tax amount",
        "vat",
        "vat amount",
        "total vat",
        "invoiceitem.amountvat",
        "invoiceitem.amounttax",
      ]);

      const grossAmountIndex = findColumn([
        "gross amount",
        "gross value",
        "invoiceitem.amountgross",
      ]);

      const amountIndex = findColumn([
        "amount £",
        "amount",
        "gross value",
      ]);

      /*
       * Invoice number is mandatory.
       *
       * Sales Order number is deliberately NOT mandatory because Sage
       * credit notes can legitimately have no Sales Order reference.
       */
      if (invoiceNumberIndex === -1) {
        setError(
          "OdinIQ could not identify the invoice or credit number column."
        );
        return;
      }

      const parsedRows: InvoicePreviewRow[] = [];

      for (
        let rowIndex = headerRowIndex + 1;
        rowIndex < rawRows.length;
        rowIndex++
      ) {
        const row = rawRows[rowIndex];

        const invoiceNumber = String(
          row[invoiceNumberIndex] ?? ""
        ).trim();

        if (!invoiceNumber) {
          continue;
        }

        parsedRows.push({
          invoiceNumber,

          invoiceType:
            invoiceTypeIndex >= 0
              ? String(row[invoiceTypeIndex] ?? "").trim()
              : "",

          invoiceDate:
            invoiceDateIndex >= 0
              ? String(row[invoiceDateIndex] ?? "").trim()
              : "",

          customerName:
            customerNameIndex >= 0
              ? String(row[customerNameIndex] ?? "").trim()
              : "",

          customerAccountCode:
            customerAccountCodeIndex >= 0
              ? String(
                  row[customerAccountCodeIndex] ?? ""
                ).trim()
              : "",

          amount:
            amountIndex >= 0
              ? String(row[amountIndex] ?? "").trim()
              : "",

          netAmount:
            netAmountIndex >= 0
              ? String(row[netAmountIndex] ?? "").trim()
              : "",

          taxAmount:
            taxAmountIndex >= 0
              ? String(row[taxAmountIndex] ?? "").trim()
              : "",

          grossAmount:
            grossAmountIndex >= 0
              ? String(row[grossAmountIndex] ?? "").trim()
              : "",

          salesOrderNumber:
            salesOrderNumberIndex >= 0
              ? String(
                  row[salesOrderNumberIndex] ?? ""
                ).trim()
              : "",

          customerOrderNumber:
            customerOrderNumberIndex >= 0
              ? String(
                  row[customerOrderNumberIndex] ?? ""
                ).trim()
              : "",

          stockCode:
            stockCodeIndex >= 0
              ? String(row[stockCodeIndex] ?? "").trim()
              : "",

          description:
            descriptionIndex >= 0
              ? String(
                  row[descriptionIndex] ?? ""
                ).trim()
              : "",

          quantity:
            quantityIndex >= 0
              ? String(row[quantityIndex] ?? "").trim()
              : "",
        });
      }

      if (parsedRows.length === 0) {
        setError(
          "The file does not contain any invoice or credit records."
        );
        return;
      }

      setFileName(file.name);
      setRows(parsedRows);
    } catch (err) {
      console.error("Invoice file read failed:", err);
      setError("OdinIQ could not read this invoice file.");
    }
  }

  async function importInvoices() {
    setImporting(true);
    setImportMessage("");
    setError("");

    try {
      const response = await fetch("/api/invoice-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "OdinIQ could not import the invoice data."
        );
      }

      setImportMessage(
        `${result.invoiceCount} invoice/credit records imported successfully.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "OdinIQ could not import the invoice data."
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <p className="font-semibold text-slate-900">
          Sage invoice export
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Select the Send to Excel file from Invoices and Credits.
        </p>

        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          className="mt-5 text-sm text-slate-600"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              handleFile(file);
            }
          }}
        />

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
            Invoice / credit preview
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Showing the first {Math.min(rows.length, 20)} of{" "}
            {rows.length} records. Nothing has been imported yet.
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Invoice
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Type
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Customer
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Account
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Stock Code
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Description
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Qty
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Net
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    VAT
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sales Order
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.slice(0, 20).map((row, index) => (
                  <tr
                    key={`${row.invoiceNumber}-${index}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      {row.invoiceNumber}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {row.invoiceType || "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {row.invoiceDate || "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {row.customerName || "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {row.customerAccountCode || "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {row.stockCode || "-"}
                    </td>

                    <td className="px-4 py-3">
                      {row.description || "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {String(row.quantity || "-")}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {String(row.netAmount || "-")}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {String(row.taxAmount || "-")}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {row.salesOrderNumber || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={importInvoices}
              disabled={importing || rows.length === 0}
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import Invoices"}
            </button>

            {importMessage && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                {importMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}