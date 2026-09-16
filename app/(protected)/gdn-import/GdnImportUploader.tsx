"use client";

import {
  DragEvent,
  useRef,
  useState,
} from "react";
import * as XLSX from "xlsx";

type PreviewRow = Record<
  string,
  unknown
>;

export default function GdnImportUploader() {
  const [fileName, setFileName] =
    useState("");
  const [headers, setHeaders] =
    useState<string[]>([]);
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

  function isSupportedFile(file: File) {
    const name =
      file.name.toLowerCase();

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
    setHeaders([]);
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
          cellDates: true,
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

      const normalise = (
        value: unknown
      ) =>
        String(value ?? "")
          .replace(/:/g, "")
          .trim()
          .toLowerCase();

      let data: PreviewRow[] = [];

      const rawHeaderRowIndex =
        rawRows.findIndex((row) =>
          row.some(
            (value) =>
              String(
                value ?? ""
              ).trim() ===
              "GDNItem.GDNNumber"
          )
        );

      if (
        rawHeaderRowIndex !== -1
      ) {
        data =
          XLSX.utils.sheet_to_json<
            PreviewRow
          >(worksheet, {
            defval: "",
            raw: false,
            range:
              rawHeaderRowIndex,
          });
      } else {
        const productHeaderRowIndex =
          rawRows.findIndex(
            (row) =>
              row.some(
                (value) =>
                  normalise(
                    value
                  ) ===
                  "stock code"
              ) &&
              row.some(
                (value) =>
                  normalise(
                    value
                  ) ===
                  "qty despatched"
              )
          );

        if (
          productHeaderRowIndex ===
          -1
        ) {
          setError(
            "OdinIQ could not find the Sage GDN column headings in this file."
          );
          return;
        }

        function findReportValue(
          labels: string[]
        ) {
          const wanted =
            labels.map((label) =>
              normalise(label)
            );

          for (const row of rawRows) {
            for (
              let index = 0;
              index < row.length;
              index++
            ) {
              if (
                wanted.includes(
                  normalise(
                    row[index]
                  )
                )
              ) {
                for (
                  let valueIndex =
                    index + 1;
                  valueIndex <
                  row.length;
                  valueIndex++
                ) {
                  const value =
                    String(
                      row[
                        valueIndex
                      ] ?? ""
                    ).trim();

                  if (value) {
                    return value;
                  }
                }
              }
            }
          }

          return "";
        }

        const productHeaders =
          rawRows[
            productHeaderRowIndex
          ];

        const stockCodeIndex =
          productHeaders.findIndex(
            (value) =>
              normalise(
                value
              ) === "stock code"
          );

        const partNumberIndex =
          productHeaders.findIndex(
            (value) =>
              normalise(
                value
              ) === "part no"
          );

        const descriptionIndex =
          productHeaders.findIndex(
            (value) =>
              normalise(
                value
              ) ===
              "description"
          );

        const quantityOrderedHeaderIndex =
          productHeaders.findIndex(
            (value) =>
              normalise(
                value
              ) ===
              "qty ordered"
          );

        const quantityDespatchedHeaderIndex =
          productHeaders.findIndex(
            (value) =>
              normalise(
                value
              ) ===
              "qty despatched"
          );

        const quantityOrderedIndex =
          quantityOrderedHeaderIndex >=
          0
            ? quantityOrderedHeaderIndex -
              1
            : -1;

        const quantityDespatchedIndex =
          quantityDespatchedHeaderIndex >=
          0
            ? quantityDespatchedHeaderIndex -
              1
            : -1;

        const gdnNumber =
          findReportValue([
            "GDN Number",
            "GDN No",
          ]);

        const gdnDate =
          findReportValue([
            "GDN Date",
          ]);

        const salesOrderNumber =
          findReportValue([
            "Order Number",
            "Order No",
          ]);

        const customerAccountCode =
          findReportValue([
            "Account Ref",
            "Account Reference",
          ]);

        const customerName =
          findReportValue([
            "Name",
          ]);

        let lineNumber = 0;

        for (
          let rowIndex =
            productHeaderRowIndex +
            1;
          rowIndex <
          rawRows.length;
          rowIndex++
        ) {
          const row =
            rawRows[rowIndex];

          const stockCode =
            String(
              row[
                stockCodeIndex
              ] ?? ""
            ).trim();

          if (!stockCode) {
            if (
              lineNumber > 0
            ) {
              break;
            }

            continue;
          }

          if (
            normalise(
              stockCode
            ).startsWith(
              "total"
            )
          ) {
            break;
          }

          lineNumber++;

          data.push({
            "GDNItem.GDNNumber":
              gdnNumber,

            "GDNItem.Date":
              gdnDate,

            "GDNItem.AccountReference":
              customerAccountCode,

            "CustomerRecord.AccountName":
              customerName,

            "GDNItem.SalesOrderNumber":
              salesOrderNumber,

            "GDNItem.ItemNumber":
              lineNumber,

            "GDNItem.QuantityOnOrder":
              quantityOrderedIndex >=
              0
                ? row[
                    quantityOrderedIndex
                  ] ?? ""
                : "",

            "GDNItem.ProductAccountReference":
              stockCode,

            "ProductRecord.PartNumber":
              partNumberIndex >= 0
                ? row[
                    partNumberIndex
                  ] ?? ""
                : "",

            "GDNItem.Description":
              descriptionIndex >= 0
                ? row[
                    descriptionIndex
                  ] ?? ""
                : "",

            "GDNItem.QuantityDespatched":
              quantityDespatchedIndex >=
              0
                ? row[
                    quantityDespatchedIndex
                  ] ?? ""
                : "",
          });
        }
      }

      if (data.length === 0) {
        setError(
          "The file does not contain any GDN rows."
        );
        return;
      }

      setFileName(file.name);
      setHeaders(
        Object.keys(data[0])
      );
      setRows(data);
    } catch (err) {
      console.error(
        "GDN file read failed:",
        err
      );

      setError(
        "OdinIQ could not read this GDN file."
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

  async function importTestGdn() {
    if (rows.length === 0) {
      return;
    }

    setImporting(true);
    setImportMessage("");
    setError("");

    try {
      const batchSize = 1000;

      let totalGdns = 0;
      let totalLines = 0;
      let processedLines = 0;

      const groupedGdns =
        new Map<
          string,
          PreviewRow[]
        >();

      for (const row of rows) {
        const gdnNumber =
          String(
            row[
              "GDNItem.GDNNumber"
            ] ?? ""
          ).trim();

        if (!gdnNumber) {
          continue;
        }

        const existing =
          groupedGdns.get(
            gdnNumber
          ) ?? [];

        existing.push(row);

        groupedGdns.set(
          gdnNumber,
          existing
        );
      }

      const batches:
        PreviewRow[][] = [];

      let currentBatch:
        PreviewRow[] = [];

      for (
        const gdnRows of
        groupedGdns.values()
      ) {
        if (
          currentBatch.length >
            0 &&
          currentBatch.length +
            gdnRows.length >
            batchSize
        ) {
          batches.push(
            currentBatch
          );

          currentBatch = [];
        }

        currentBatch.push(
          ...gdnRows
        );
      }

      if (
        currentBatch.length > 0
      ) {
        batches.push(
          currentBatch
        );
      }

      for (
        const batch of batches
      ) {
        const response =
          await fetch(
            "/api/gdn-import",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                rows: batch,
              }),
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.error ||
              `GDN import failed after ${processedLines.toLocaleString(
                "en-GB"
              )} lines.`
          );
        }

        totalGdns += Number(
          result.gdnCount ?? 0
        );

        totalLines += Number(
          result.lineCount ??
            batch.length
        );

        processedLines +=
          batch.length;

        setImportMessage(
          `Imported ${processedLines.toLocaleString(
            "en-GB"
          )} of ${rows.length.toLocaleString(
            "en-GB"
          )} GDN lines...`
        );
      }

      setImportMessage(
        `${totalGdns.toLocaleString(
          "en-GB"
        )} GDNs processed successfully with ${totalLines.toLocaleString(
          "en-GB"
        )} lines.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "OdinIQ could not import these GDNs."
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
        onDragOver={handleDragOver}
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
          Sage Goods Despatched
          export
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Drag and drop the Data to
          Excel file from the Goods
          Despatched Sales Order Report
          here, or choose it manually.
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
            GDN preview
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
            rows. Nothing has been
            imported yet.
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {headers.map(
                    (header) => (
                      <th
                        key={
                          header
                        }
                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {
                          header
                        }
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {rows
                  .slice(0, 20)
                  .map(
                    (
                      row,
                      rowIndex
                    ) => (
                      <tr
                        key={
                          rowIndex
                        }
                      >
                        {headers.map(
                          (
                            header
                          ) => (
                            <td
                              key={
                                header
                              }
                              className="whitespace-nowrap px-4 py-3 text-slate-700"
                            >
                              {String(
                                row[
                                  header
                                ] ??
                                  ""
                              )}
                            </td>
                          )
                        )}
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
                importTestGdn
              }
              disabled={
                importing ||
                rows.length === 0
              }
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing
                ? "Importing..."
                : "Import GDNs"}
            </button>

            {importMessage && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
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