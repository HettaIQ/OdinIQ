"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AgreementOption = {
  id: number;
  customerName: string;
  agreementName: string;
};

type DocumentMoverProps = {
  documentId: number;
  currentAgreementId: number;
  agreements: AgreementOption[];
};

export default function DocumentMover({
  documentId,
  currentAgreementId,
  agreements,
}: DocumentMoverProps) {
  const router = useRouter();

  const [selectedAgreementId, setSelectedAgreementId] =
    useState(String(currentAgreementId));

  const [moving, setMoving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleMove() {
    const newAgreementId = Number(selectedAgreementId);

    if (newAgreementId === currentAgreementId) {
      setSuccess(false);
      setMessage("This document is already attached to that agreement.");
      return;
    }

    setMoving(true);
    setMessage("");
    setSuccess(false);

    try {
      const response = await fetch(
        `/api/documents/${documentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agreementId: newAgreementId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setSuccess(false);
        setMessage(
          data.message || "The document could not be moved."
        );
        return;
      }

      setSuccess(true);
      setMessage(data.message);

      router.refresh();
    } catch (error) {
      console.error("Document move failed:", error);

      setSuccess(false);
      setMessage("The document could not be moved.");
    } finally {
      setMoving(false);
    }
  }

  return (
    <div style={{ marginTop: "12px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(200px, 1fr) auto",
          gap: "10px",
        }}
      >
        <select
          value={selectedAgreementId}
          onChange={(event) =>
            setSelectedAgreementId(event.target.value)
          }
          disabled={moving}
          style={{
            width: "100%",
            padding: "9px",
            background: "#151515",
            color: "#ffffff",
            border: "1px solid #333333",
            borderRadius: "8px",
          }}
        >
          {agreements.map((agreement) => (
            <option key={agreement.id} value={agreement.id}>
              {agreement.customerName} — {agreement.agreementName}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleMove}
          disabled={
            moving ||
            Number(selectedAgreementId) === currentAgreementId
          }
          style={{
            padding: "9px 14px",
            border: "none",
            borderRadius: "8px",
            background:
              moving ||
              Number(selectedAgreementId) === currentAgreementId
                ? "#695d2b"
                : "#d4af37",
            color: "#111111",
            fontWeight: "bold",
            cursor:
              moving ||
              Number(selectedAgreementId) === currentAgreementId
                ? "not-allowed"
                : "pointer",
          }}
        >
          {moving ? "Moving..." : "Move"}
        </button>
      </div>

      {message && (
        <p
          style={{
            marginTop: "8px",
            marginBottom: 0,
            fontSize: "13px",
            color: success ? "#6eeb83" : "#ff8f8f",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}