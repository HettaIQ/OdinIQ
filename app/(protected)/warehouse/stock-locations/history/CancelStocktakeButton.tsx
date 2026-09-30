"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CancelStocktakeButtonProps = {
  sessionId: number;
  reference: string;
};

export default function CancelStocktakeButton({
  sessionId,
  reference,
}: CancelStocktakeButtonProps) {
  const router = useRouter();

  const [cancelling, setCancelling] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function cancelStocktake() {
    const confirmed =
      window.confirm(
        `Cancel stocktake ${reference}?\n\n` +
          "The stocktake will remain in the audit history, " +
          "but it will no longer be available for reconciliation or application."
      );

    if (!confirmed) {
      return;
    }

    setCancelling(true);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/warehouse/stocktake/cancel",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              sessionId,
            }),
          }
        );

      const data =
        (await response.json()) as {
          success?: boolean;
          message?: string;
        };

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to cancel stocktake."
        );
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to cancel stocktake."
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 5,
      }}
    >
      <button
        type="button"
        onClick={cancelStocktake}
        disabled={cancelling}
        style={{
          padding: "7px 11px",
          borderRadius: 8,
          border:
            "1px solid #dc2626",
          background: cancelling
            ? "#fca5a5"
            : "#ffffff",
          color: "#b91c1c",
          fontWeight: 700,
          fontSize: 12,
          cursor: cancelling
            ? "not-allowed"
            : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {cancelling
          ? "Cancelling..."
          : "Cancel Stocktake"}
      </button>

      {error && (
        <span
          style={{
            color: "#b91c1c",
            fontSize: 11,
            maxWidth: 220,
            textAlign: "right",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}