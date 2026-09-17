"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type WarehousePhotoUploadProps = {
  salesOrderNumber: string;
  disabled?: boolean;
};

export default function WarehousePhotoUpload({
  salesOrderNumber,
  disabled = false,
}: WarehousePhotoUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handleUpload() {
    if (!file) {
      setIsError(true);
      setMessage("Please choose or take a photo first.");
      return;
    }

    try {
      setUploading(true);
      setMessage("");
      setIsError(false);

      const formData = new FormData();

      formData.append("file", file);
      formData.append("note", note);

      const response = await fetch(
        `/api/sales-orders/${encodeURIComponent(
          salesOrderNumber
        )}/warehouse-photos`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Photo upload failed."
        );
      }

      setFile(null);
      setNote("");
      setMessage("Warehouse photo uploaded successfully.");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Photo upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-xl font-bold text-slate-950">
          Warehouse Photo Evidence
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Take a photo or select one from the device. Odin will
          record it against this Sales Order and its current
          warehouse stage.
        </p>
      </div>

      <div className="mt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          disabled={disabled || uploading}
          onChange={(event) => {
            const selectedFile =
              event.target.files?.[0] ?? null;

            setFile(selectedFile);
            setMessage("");
            setIsError(false);
          }}
          className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-700 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-slate-600 disabled:opacity-50"
        />
      </div>

      {file && (
        <div className="mt-3 rounded-lg bg-slate-800 p-3 text-sm text-slate-300">
          <span className="font-medium text-white">
            Selected:
          </span>{" "}
          {file.name}
        </div>
      )}

      <div className="mt-4">
        <label
          htmlFor="warehouse-photo-note"
         className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Photo note
        </label>

        <textarea
          id="warehouse-photo-note"
          value={note}
          disabled={disabled || uploading}
          onChange={(event) =>
            setNote(event.target.value)
          }
          placeholder="Optional — e.g. pallet wrapped and ready for collection"
          rows={3}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-500 disabled:bg-slate-100 disabled:opacity-50"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleUpload}
          disabled={disabled || uploading || !file}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {uploading
            ? "Uploading..."
            : "Upload Photo"}
        </button>

        {message && (
          <p
            className={`text-sm ${
              isError
                ? "text-red-400"
                : "text-emerald-400"
            }`}
          >
            {message}
          </p>
        )}
      </div>

      {disabled && (
        <p className="mt-3 text-sm text-slate-500">
          Photo uploads are disabled because this Sales Order is
          cancelled.
        </p>
      )}
    </div>
  );
}