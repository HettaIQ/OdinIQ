"use client";

import {
  useState,
} from "react";

type AgreementBuyingGroupEditorProps = {
  agreementId: number;
  initialBuyingGroup: string | null;
};

export default function AgreementBuyingGroupEditor({
  agreementId,
  initialBuyingGroup,
}: AgreementBuyingGroupEditorProps) {
  const [buyingGroup, setBuyingGroup] =
    useState(
      initialBuyingGroup ?? ""
    );

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          `/api/agreements/${agreementId}/buying-group`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              buyingGroup,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Buying group could not be saved."
        );
      }

      setSuccess(
        "Buying group saved successfully."
      );

      window.location.reload();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Buying group could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        marginTop: "18px",
        padding: "18px",
        background: "#0b0b0f",
        border:
          "1px solid #292929",
        borderRadius: "10px",
      }}
    >
      <p
        style={{
          marginTop: 0,
          marginBottom: "8px",
          color: "#d4af37",
          fontWeight: "bold",
        }}
      >
        Buying Group
      </p>

      <p
        style={{
          marginTop: 0,
          color: "#999999",
          fontSize: "13px",
        }}
      >
        Link this agreement to customers
        using the same Buying Group.
      </p>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginTop: "12px",
        }}
      >
        <input
          type="text"
          value={buyingGroup}
          onChange={(event) =>
            setBuyingGroup(
              event.target.value
            )
          }
          placeholder="e.g. UKPS - Rebate"
          style={{
            flex: "1 1 260px",
            minWidth: "220px",
            border:
              "1px solid #444444",
            borderRadius: "8px",
            background: "#111111",
            color: "#ffffff",
            padding:
              "10px 12px",
          }}
        />

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            border: 0,
            borderRadius: "8px",
            background: "#d4af37",
            color: "#000000",
            padding:
              "10px 18px",
            fontWeight: "bold",
            cursor: saving
              ? "not-allowed"
              : "pointer",
            opacity: saving
              ? 0.6
              : 1,
          }}
        >
          {saving
            ? "Saving..."
            : "Save Buying Group"}
        </button>
      </div>

      {error && (
        <p
          style={{
            color: "#ff6b6b",
            marginBottom: 0,
          }}
        >
          {error}
        </p>
      )}

      {success && (
        <p
          style={{
            color: "#6eeb83",
            marginBottom: 0,
          }}
        >
          {success}
        </p>
      )}
    </div>
  );
}