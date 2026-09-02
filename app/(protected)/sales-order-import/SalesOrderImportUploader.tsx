"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

type PreviewRow = {
  salesOrderNumber: string;
  orderDate: string;
  customerAccountCode: string;
  customerName: string;
  orderValue: string | number;
  status: string;
};

export default function SalesOrderImportUploader() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  function normalise(value: unknown) {
    return String(value ?? "")
      .replace(/:/g, "")
      .trim()
      .toLowerCase();
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

      const headerRowIndex = rawRows.findIndex(
  (row) =>
    row.some((value) => normalise(value) === "no.") &&
    row.some((value) => normalise(value) === "type") &&
    row.some((value) => normalise(value) === "date") &&
    row.some((value) => normalise(value) === "name") &&
    row.some((value) => normalise(value) === "amount £")
);

      if (headerRowIndex === -1) {
        setError(
          "OdinIQ could not find the Sage Sales Order column headings in this file."
        );
        return;
      }

      const headerRow = rawRows[headerRowIndex];

      const findColumn = (labels: string[]) => {
        return headerRow.findIndex((value) =>
          labels.some((label) => normalise(value) === normalise(label))
        );
      };

      const salesOrderNumberIndex = findColumn([
        "order no",
        "order number",
        "sales order no",
        "sales order number",
        "no.",
        "no",
      ]);

      const orderDateIndex = findColumn([
        "date",
        "order date",
      ]);

      const customerAccountCodeIndex = findColumn([
        "account ref",
        "account reference",
        "customer account",
        "account code",
      ]);

      const customerNameIndex = findColumn([
        "name",
        "customer name",
      ]);

      const orderValueIndex = findColumn([
        "amount £",
        "amount",
        "order value",
        "net value",
        "total",
      ]);

      const statusIndex = findColumn([
        "status",
        "order status",
        "complete",
      ]);

      if (salesOrderNumberIndex === -1) {
        setError(
          "OdinIQ could not identify the Sales Order number column."
        );
        return;
      }

      const parsedRows: PreviewRow[] = [];
      const typeIndex = findColumn(["type"]);

      for (
        let rowIndex = headerRowIndex + 1;
        rowIndex < rawRows.length;
        rowIndex++
      ) {
        const row = rawRows[rowIndex];

        const salesOrderNumber = String(
          row[salesOrderNumberIndex] ?? ""
        ).trim();

        if (!salesOrderNumber) {
          continue;
        }
const recordType =
  typeIndex >= 0
    ? String(row[typeIndex] ?? "").trim()
    : "";

if (recordType.toUpperCase() !== "ORD") {
  continue;
}
        parsedRows.push({
          salesOrderNumber,
          orderDate:
            orderDateIndex >= 0
              ? String(row[orderDateIndex] ?? "").trim()
              : "",
          customerAccountCode:
            customerAccountCodeIndex >= 0
              ? String(row[customerAccountCodeIndex] ?? "").trim()
              : "",
          customerName:
            customerNameIndex >= 0
              ? String(row[customerNameIndex] ?? "").trim()
              : "",
          orderValue:
  orderValueIndex >= 0
    ? String(row[orderValueIndex] ?? "").trim()
    : "",
          status:
            statusIndex >= 0
              ? String(row[statusIndex] ?? "").trim()
              : "",
        });
      }

      if (parsedRows.length === 0) {
        setError("The file does not contain any Sales Orders.");
        return;
      }

      setFileName(file.name);
      setRows(parsedRows);
    } catch (err) {
      console.error("Sales Order file read failed:", err);
      setError("OdinIQ could not read this Sales Order file.");
    }
  }

  async function importSalesOrders() {
    if (rows.length === 0) {
      return;
    }

    setImporting(true);
    setImportMessage("");
    setError("");
const importBatchAt = new Date().toISOString();
    try {
     let imported = 0;

const batchSize = 500;

for (let index = 0; index < rows.length; index += batchSize) {
  const batch = rows.slice(index, index + batchSize);

  const response = await fetch("/api/sales-order-import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rows: batch,
      importBatchAt,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ||
        `Sales Order batch import failed at row ${index + 1}.`
    );
  }

  imported += Number(result.imported ?? batch.length);

  setImportMessage(
    `Imported ${imported.toLocaleString("en-GB")} of ${rows.length.toLocaleString("en-GB")} Sales Orders...`
  );
}

      setImportMessage(
        `${imported} Sales Order${imported === 1 ? "" : "s"} imported successfully.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "OdinIQ could not import the Sales Orders."
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <p className="font-semibold text-slate-900">
          Sage Sales Order export
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Select the Sales Order report exported from Sage to Excel.
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
            Sales Order preview
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {rows.length} Sales Orders detected. Nothing has been imported yet.
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sales Order
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Account
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((row) => (
                  <tr key={row.salesOrderNumber}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {row.salesOrderNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {row.orderDate || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {row.customerAccountCode || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {row.customerName || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {String(row.orderValue || "-")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {row.status || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={importSalesOrders}
              disabled={importing || rows.length === 0}
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import Sales Orders"}
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