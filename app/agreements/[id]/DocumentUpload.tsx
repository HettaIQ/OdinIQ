"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DocumentUploadProps = {
  agreementId: number;
};

export default function DocumentUpload({
  agreementId,
}: DocumentUploadProps) {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("Trading Agreement");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleUpload() {
    if (!file) {
      setSuccess(false);
      setMessage("Choose a document first.");
      return;
    }

    setUploading(true);
    setMessage("");
    setSuccess(false);

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("category", category);
      formData.append("uploadedBy", "Jamie Gardner");

      const response = await fetch(
        `/api/agreements/${agreementId}/documents`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "The document could not be uploaded."
        );
        return;
      }

      setSuccess(true);
      setMessage(data.message);
      setFile(null);

      const input = document.getElementById(
        "agreement-document-file"
      ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }

      router.refresh();
    } catch (error) {
      console.error("Document upload failed:", error);
      setMessage("The document could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      style={{
        marginTop: "20px",
        padding: "20px",
        background: "#0b0b0f",
        border: "1px solid #292929",
        borderRadius: "12px",
      }}
    >
      <h3 style={{ marginTop: 0 }}>Upload Document</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(220px, 1fr) minmax(220px, 1fr) auto",
          gap: "12px",
          alignItems: "end",
        }}
      >
        <label style={labelStyle}>
          Document
          <input
            id="agreement-document-file"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"
            onChange={(event) =>
              setFile(event.target.files?.[0] ?? null)
            }
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Category
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value)
            }
            style={inputStyle}
          >
            <option>Trading Agreement</option>
            <option>Signed Contract</option>
            <option>Pricing Schedule</option>
            <option>Rebate Schedule</option>
            <option>Marketing Agreement</option>
            <option>Terms and Conditions</option>
            <option>Meeting Notes</option>
            <option>Other</option>
          </select>
        </label>

        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          style={{
            minHeight: "43px",
            padding: "12px 20px",
            border: "none",
            borderRadius: "8px",
            background: uploading ? "#695d2b" : "#d4af37",
            color: "#111111",
            fontWeight: "bold",
            cursor: uploading ? "not-allowed" : "pointer",
          }}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      <p
        style={{
          color: "#777777",
          fontSize: "13px",
          marginBottom: 0,
        }}
      >
        PDF, Word, Excel, CSV and image files up to 20 MB.
      </p>

      {message && (
        <div
          style={{
            marginTop: "14px",
            padding: "12px",
            borderRadius: "8px",
            background: success ? "#142418" : "#2a1515",
            border: success
              ? "1px solid #315f3a"
              : "1px solid #6f2a2a",
            color: success ? "#6eeb83" : "#ff8f8f",
            fontWeight: "bold",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
  color: "#d7d7d7",
  fontWeight: "bold",
  fontSize: "14px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "11px",
  background: "#151515",
  color: "#ffffff",
  border: "1px solid #333333",
  borderRadius: "8px",
};