"use client";

import {
  DragEvent,
  useRef,
  useState,
} from "react";
import * as XLSX from "xlsx";

type PreviewRow = {
  purchaseOrderNumber?: string | number;
  orderDate?: string;
  supplierAccountCode?: string;
  productCode?: string;
  description?: string;
  unitOfSale?: string;
  quantity?: string | number;
  discountAmount?: string | number;
  netValue?: string | number;
  vatValue?: string | number;
  grossValue?: string | number;
};

export default function PurchaseOrderImportUploader() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  function normalise(value: unknown) {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isSupportedFile(file: File) {
    const name = file.name.toLowerCase();

    return (
      name.endsWith(".xlsx") ||
      name.endsWith(".xls") ||
      name.endsWith(".csv")
    );
  }

  async function handleFile(file: File) {
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
      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: false,
      });

      const firstSheetName =
        workbook.SheetNames[0];

      if (!firstSheetName) {
        setError(
          "No worksheet was found in this file."
        );
        return;
      }

      const worksheet =
        workbook.Sheets[firstSheetName];

      const rawRows =
        XLSX.utils.sheet_to_json<unknown[]>(
          worksheet,
          {
            header: 1,
            defval: "",
            raw: true,
          }
        );

      if (rawRows.length < 2) {
        setError(
          "The purchase order file does not contain enough data."
        );
        return;
      }

      const headerRowIndex =
        rawRows.findIndex((row) => {
          const values = row.map(
            (value) =>
              normalise(value).replace(
                /[^a-z0-9]/g,
                ""
              )
          );

          return values.some(
            (value) =>
              value ===
                "purchaseordernumber" ||
              value ===
                "purchaseorderno" ||
              value ===
                "purchaseorderitemproductaccountreference"
          );
        });

      if (headerRowIndex === -1) {
        setError(
          "OdinIQ could not find the Sage purchase order column headings in this file."
        );
        return;
      }

      const headers =
        rawRows[headerRowIndex].map(
          (value) =>
            String(value ?? "").trim()
        );

      const dataRows =
        rawRows.slice(headerRowIndex + 1);

      function findHeaderIndex(
        possibleNames: string[]
      ) {
        return headers.findIndex(
          (header) =>
            possibleNames.some(
              (name) =>
                normalise(header) ===
                normalise(name)
            )
        );
      }

      const poNumberIndex =
        findHeaderIndex([
          "PurchaseOrder.Number",
          "Purchase Order Number",
          "Purchase Order No",
          "PO Number",
        ]);

      const orderDateIndex =
        findHeaderIndex([
          "PurchaseOrder.Date",
          "Purchase Order Date",
          "Order Date",
          "Date",
        ]);

      const supplierIndex =
        findHeaderIndex([
          "PurchaseOrder.AccountReference",
          "Supplier Account",
          "Supplier A/C",
          "A/C",
        ]);

      const productCodeIndex =
        findHeaderIndex([
          "PurchaseOrderItem.ProductAccountReference",
          "Product Code",
          "Stock Code",
        ]);

      const descriptionIndex =
        findHeaderIndex([
          "PurchaseOrderItem.Description",
          "Description",
        ]);

      const unitOfSaleIndex =
        findHeaderIndex([
          "PurchaseOrderItem.UnitOfSale",
          "Unit Of Sale",
          "Unit",
        ]);

      const quantityIndex =
        findHeaderIndex([
          "PurchaseOrderItem.Quantity",
          "Quantity",
          "Qty",
        ]);

      const discountIndex =
        findHeaderIndex([
          "PurchaseOrderItem.DiscountAmount",
          "Discount Amount",
          "Discount",
        ]);

      const netIndex =
        findHeaderIndex([
          "PurchaseOrderItem.AmountNet",
          "Net Amount",
          "Net Value",
          "Total Net",
        ]);

      const vatIndex =
        findHeaderIndex([
          "PurchaseOrderItem.AmountVAT",
          "VAT Amount",
          "VAT Value",
          "Total VAT",
        ]);

      const grossIndex =
        findHeaderIndex([
          "PurchaseOrderItem.AmountGross",
          "Gross Amount",
          "Gross Value",
          "Total Gross",
        ]);

      if (poNumberIndex === -1) {
        setError(
          "OdinIQ could not identify the Purchase Order Number column."
        );
        return;
      }

      if (productCodeIndex === -1) {
        setError(
          "OdinIQ could not identify the Product Code column."
        );
        return;
      }

      if (quantityIndex === -1) {
        setError(
          "OdinIQ could not identify the Quantity column."
        );
        return;
      }

      const parsedRows: PreviewRow[] = [];

      for (const row of dataRows) {
        const purchaseOrderNumber =
          String(
            row[poNumberIndex] ?? ""
          ).trim();

        if (!purchaseOrderNumber) {
          continue;
        }

        parsedRows.push({
          purchaseOrderNumber,

          orderDate:
            orderDateIndex >= 0
              ? (() => {
                  const value =
                    row[orderDateIndex];

                  if (
                    typeof value === "number"
                  ) {
                    const parsed =
                      XLSX.SSF.parse_date_code(
                        value
                      );

                    if (parsed) {
                      const year =
                        String(
                          parsed.y
                        ).padStart(
                          4,
                          "0"
                        );

                      const month =
                        String(
                          parsed.m
                        ).padStart(
                          2,
                          "0"
                        );

                      const day =
                        String(
                          parsed.d
                        ).padStart(
                          2,
                          "0"
                        );

                      return `${year}-${month}-${day}`;
                    }
                  }

                  return String(
                    value ?? ""
                  ).trim();
                })()
              : "",

          supplierAccountCode:
            supplierIndex >= 0
              ? String(
                  row[supplierIndex] ?? ""
                ).trim()
              : "",

          productCode:
            productCodeIndex >= 0
              ? String(
                  row[productCodeIndex] ?? ""
                ).trim()
              : "",

          description:
            descriptionIndex >= 0
              ? String(
                  row[descriptionIndex] ?? ""
                ).trim()
              : "",

          unitOfSale:
            unitOfSaleIndex >= 0
              ? String(
                  row[unitOfSaleIndex] ?? ""
                ).trim()
              : "",

          quantity:
            quantityIndex >= 0
              ? String(
                  row[quantityIndex] ?? ""
                ).trim()
              : "",

          discountAmount:
            discountIndex >= 0
              ? String(
                  row[discountIndex] ?? ""
                ).trim()
              : "",

          netValue:
            netIndex >= 0
              ? String(
                  row[netIndex] ?? ""
                ).trim()
              : "",

          vatValue:
            vatIndex >= 0
              ? String(
                  row[vatIndex] ?? ""
                ).trim()
              : "",

          grossValue:
            grossIndex >= 0
              ? String(
                  row[grossIndex] ?? ""
                ).trim()
              : "",
        });
      }

      if (parsedRows.length === 0) {
        setError(
          "OdinIQ could not find any purchase order lines in this file."
        );
        return;
      }

      setFileName(file.name);
      setRows(parsedRows);
    } catch (err) {
      console.error(
        "Purchase order file read failed:",
        err
      );

      setError(
        "OdinIQ could not read this purchase order file."
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
    event.dataTransfer.dropEffect = "copy";
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

  async function importPurchaseOrders() {
    if (rows.length === 0) {
      return;
    }

    setImporting(true);
    setImportMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/purchase-order-import",
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
            "OdinIQ could not import this purchase order file."
        );
      }

      setImportMessage(
        `${Number(
          result.purchaseOrderCount ?? 0
        ).toLocaleString(
          "en-GB"
        )} purchase orders and ${Number(
          result.purchaseOrderLineCount ?? 0
        ).toLocaleString(
          "en-GB"
        )} product lines imported successfully.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "OdinIQ could not import this purchase order file."
      );
    } finally {
      setImporting(false);
    }
  }

  const uniquePurchaseOrders =
    new Set(
      rows.map((row) =>
        String(
          row.purchaseOrderNumber ?? ""
        ).trim()
      )
    ).size;

  return (
    <div>
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
          isDragging
            ? "border-amber-500 bg-amber-50"
            : "border-slate-300 bg-slate-50"
        }`}
      >
        <p className="font-semibold text-slate-900">
          Sage purchase order export
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Drag and drop your Sage Purchase
          Orders By Product Excel file here,
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

            event.currentTarget.value = "";
          }}
        />

        <button
          type="button"
          onClick={openFilePicker}
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
            Purchase order preview
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            OdinIQ found{" "}
            {uniquePurchaseOrders.toLocaleString(
              "en-GB"
            )}{" "}
            purchase orders containing{" "}
            {rows.length.toLocaleString(
              "en-GB"
            )}{" "}
            product lines. Showing the first{" "}
            {Math.min(
              rows.length,
              20
            ).toLocaleString(
              "en-GB"
            )}{" "}
            lines below. Nothing has been
            imported yet.
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    PO
                  </th>
                  <th className="px-4 py-3 text-left">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-left">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-right">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right">
                    Net
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {rows
                  .slice(0, 20)
                  .map((row, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        {row.purchaseOrderNumber}
                      </td>
                      <td className="px-4 py-3">
                        {row.orderDate}
                      </td>
                      <td className="px-4 py-3">
                        {row.supplierAccountCode}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {row.productCode}
                      </td>
                      <td className="px-4 py-3">
                        {row.description}
                      </td>
                      <td className="px-4 py-3">
                        {row.unitOfSale}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {String(
                          row.quantity ?? ""
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {String(
                          row.netValue ?? ""
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={
                importPurchaseOrders
              }
              disabled={
                importing ||
                rows.length === 0
              }
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing
                ? "Importing..."
                : `Import ${uniquePurchaseOrders.toLocaleString(
                    "en-GB"
                  )} Purchase Orders`}
            </button>

            {importMessage && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                {importMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
