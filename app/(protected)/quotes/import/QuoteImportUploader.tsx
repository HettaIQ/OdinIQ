"use client";

import { useState } from "react";
import * as XLSX from "xlsx";


type PreviewRow = Record<string, unknown>;

export default function QuoteImportUploader() {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setError("");
    setHeaders([]);
    setRows([]);
    setFileName(file.name);

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

      const data = XLSX.utils.sheet_to_json<PreviewRow>(worksheet, {
        defval: "",
        raw: false,
      });

      if (data.length === 0) {
        setError("The file does not contain any quotation rows.");
        return;
      }

      const detectedHeaders = Object.keys(data[0]);

      setHeaders(detectedHeaders);
      setRows(data.slice(0, 10));
    } catch (err) {
      console.error(err);
      setError("OdinIQ could not read this file.");
    }
  }

  return (
    <div>
      <div className="rounded-xl border-2 border-dashed border-slate-300 p-10 text-center">
        <p className="font-semibold text-slate-900">
          Sage quotation file
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Select a CSV or Excel quotation export.
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
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              File detected
            </p>

            <h3 className="mt-1 text-lg font-bold text-slate-950">
              Sage data preview
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Showing the first {rows.length} rows. Nothing has been imported yet.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {headers.map((header) => (
                    <th
                      key={header}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {headers.map((header) => (
                      <td
                        key={header}
                        className="whitespace-nowrap px-4 py-3 text-slate-700"
                      >
                        {String(row[header] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}