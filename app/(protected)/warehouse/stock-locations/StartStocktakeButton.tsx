"use client";

import { useState } from "react";

export default function StartStocktakeButton() {
  const [starting, setStarting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function startStocktake() {
    const confirmed = window.confirm(
      "Start a new warehouse stocktake?\n\n" +
        "Odin will freeze the current system and location quantities for reconciliation. " +
        "The warehouse spreadsheet will remain blind and will not show expected quantities."
    );

    if (!confirmed) {
      return;
    }

    setStarting(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/warehouse/stocktake/start",
        {
          method: "POST",
        }
      );

      /*
       * Errors from the API are JSON.
       * Successful responses are the
       * generated Excel workbook.
       */
      if (!response.ok) {
        let message =
          "Odin could not start the stocktake.";

        try {
          const data =
            await response.json();

          if (data.error) {
            message = data.error;
          }

          if (
            response.status === 409 &&
            data.session?.reference
          ) {
            message =
              `${message} Open stocktake: ` +
              data.session.reference;
          }
        } catch {
          // Keep the default message.
        }

        setError(message);
        return;
      }

      const blob =
        await response.blob();

      const reference =
        response.headers.get(
          "X-OdinIQ-Stocktake-Reference"
        ) ?? "Stocktake";

      const disposition =
        response.headers.get(
          "Content-Disposition"
        );

      let fileName =
        `OdinIQ-Stocktake-${reference}.xlsx`;

      /*
       * Prefer the filename supplied by
       * the API if one is available.
       */
      const fileNameMatch =
        disposition?.match(
          /filename="?([^"]+)"?/i
        );

      if (fileNameMatch?.[1]) {
        fileName =
          fileNameMatch[1];
      }

      const url =
        window.URL.createObjectURL(
          blob
        );

      const anchor =
        document.createElement("a");

      anchor.href = url;
      anchor.download = fileName;

      document.body.appendChild(
        anchor
      );

      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(
        url
      );

      /*
       * The session now exists in the
       * database. Refresh the page so
       * future session/status UI can show
       * the latest information.
       */
      window.location.reload();
    } catch {
      setError(
        "Odin could not start the stocktake."
      );
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={startStocktake}
        disabled={starting}
        className="inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
      >
        {starting
          ? "Starting Stocktake..."
          : "Start Stocktake"}
      </button>

      {error && (
        <p className="mt-2 max-w-sm text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}