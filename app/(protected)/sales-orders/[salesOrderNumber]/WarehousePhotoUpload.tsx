"use client";

import { useEffect, useRef, useState } from "react";
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

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  function selectFile(selectedFile: File | null) {
    setFile(selectedFile);
    setMessage("");
    setIsError(false);
  }

  function clearPhoto() {
    setFile(null);

    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }

    if (galleryInputRef.current) {
      galleryInputRef.current.value = "";
    }
  }

  async function handleUpload() {
    if (!file) {
      setIsError(true);
      setMessage("Please take or choose a photo first.");
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

      clearPhoto();
      setNote("");
      setMessage("Warehouse photo uploaded successfully.");

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
    <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
      <div>
        <h3 className="text-xl font-bold text-slate-950">
          Warehouse Photo Evidence
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Take a photo of the pallet, parcel or order, or choose
          an existing photo from the device. Odin will record it
          against this Sales Order and its current warehouse stage.
        </p>
      </div>

      {/* Camera input */}
      <input
        id="warehouse-camera-input"
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled || uploading}
        onChange={(event) => {
  const selectedFile = event.target.files?.[0] ?? null;

  alert(
    selectedFile
      ? `Camera photo received: ${selectedFile.name} (${selectedFile.size} bytes)`
      : "Camera returned no photo"
  );

  selectFile(selectedFile);
}}
        className="sr-only"
      />

      {/* Gallery input */}
      <input
        id="warehouse-gallery-input"
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        disabled={disabled || uploading}
        onChange={(event) => {
  const selectedFile = event.target.files?.[0] ?? null;

  alert(
    selectedFile
      ? `Gallery photo received: ${selectedFile.name} (${selectedFile.size} bytes)`
      : "Gallery returned no photo"
  );

  selectFile(selectedFile);
}}
        className="sr-only"
      />

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label
          htmlFor="warehouse-camera-input"
          className={`flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-4 text-base font-semibold text-white transition ${
            disabled || uploading
              ? "pointer-events-none cursor-not-allowed opacity-40"
              : "cursor-pointer hover:bg-slate-800"
          }`}
        >
          <span aria-hidden="true">📷</span>
          Take Photo
        </label>

        <label
          htmlFor="warehouse-gallery-input"
          className={`flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-4 text-base font-semibold text-slate-700 transition ${
            disabled || uploading
              ? "pointer-events-none cursor-not-allowed opacity-40"
              : "cursor-pointer hover:bg-slate-50"
          }`}
        >
          Choose Existing Photo
        </label>
      </div>

      {file && previewUrl && (
        <div className="mt-5 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50">
          <img
            src={previewUrl}
            alt="Warehouse photo preview"
            className="max-h-80 w-full object-contain bg-slate-100"
          />

          <div className="p-4">
            <p className="font-semibold text-emerald-800">
              ✓ Photo ready to upload
            </p>

            <p className="mt-1 break-all text-sm text-emerald-700">
              {file.name}
            </p>

            <button
              type="button"
              onClick={clearPhoto}
              disabled={uploading}
              className="mt-3 text-sm font-semibold text-slate-600 underline hover:text-slate-900 disabled:opacity-40"
            >
              Remove photo
            </button>
          </div>
        </div>
      )}

      <div className="mt-5">
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
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional - e.g. pallet wrapped and ready for collection"
          rows={3}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-500 disabled:bg-slate-100 disabled:opacity-50"
        />
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={handleUpload}
          disabled={disabled || uploading || !file}
          className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {uploading ? "Uploading..." : "Upload Photo"}
        </button>

        {message && (
          <p
            className={`mt-3 text-sm font-medium ${
              isError
                ? "text-red-600"
                : "text-emerald-600"
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