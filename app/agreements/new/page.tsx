"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type AgreementForm = {
  customerName: string;
  agreementName: string;
  agreementType: string;
  status: string;
  startDate: string;
  endDate: string;
  renewalDate: string;
  noticePeriod: string;
  accountManager: string;
  buyingGroup: string;
  standardDiscount: string;
  rebatePercent: string;
  paymentTerms: string;
  creditLimit: string;
  marketingBudget: string;
  notes: string;
};

const initialForm: AgreementForm = {
  customerName: "",
  agreementName: "",
  agreementType: "",
  status: "Active",
  startDate: "",
  endDate: "",
  renewalDate: "",
  noticePeriod: "",
  accountManager: "",
  buyingGroup: "",
  standardDiscount: "",
  rebatePercent: "",
  paymentTerms: "",
  creditLimit: "",
  marketingBudget: "",
  notes: "",
};

export default function NewAgreementPage() {
  const router = useRouter();

  const [form, setForm] = useState<AgreementForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  function updateField(
    field: keyof AgreementForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setSuccess(false);

    try {
      const response = await fetch("/api/agreements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "The agreement could not be saved."
        );
        return;
      }

      setSuccess(true);
      setMessage(data.message);

      setTimeout(() => {
        router.push("/agreements");
        router.refresh();
      }, 800);
    } catch (error) {
      console.error("Agreement save failed:", error);
      setMessage("The agreement could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#ffffff",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <Link
          href="/agreements"
          style={{
            color: "#d4af37",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          ← Back to Commercial Agreements
        </Link>

        <p
          style={{
            color: "#d4af37",
            marginTop: "30px",
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: "1px",
            fontSize: "13px",
          }}
        >
          Commercial Intelligence
        </p>

        <h1
          style={{
            fontSize: "48px",
            margin: "10px 0",
          }}
        >
          Add Commercial Agreement
        </h1>

        <p
          style={{
            color: "#999999",
            fontSize: "18px",
            marginBottom: "30px",
          }}
        >
          Record the customer, contract dates, discounts, rebates,
          payment terms and marketing commitments.
        </p>

        <form onSubmit={handleSubmit}>
          <section style={panelStyle}>
            <h2 style={sectionHeadingStyle}>Agreement Details</h2>

            <div style={gridStyle}>
              <Field
                label="Customer Name"
                required
                value={form.customerName}
                onChange={(value) =>
                  updateField("customerName", value)
                }
              />

              <Field
                label="Agreement Name"
                required
                value={form.agreementName}
                onChange={(value) =>
                  updateField("agreementName", value)
                }
              />

              <Field
                label="Agreement Type"
                placeholder="e.g. National merchant agreement"
                value={form.agreementType}
                onChange={(value) =>
                  updateField("agreementType", value)
                }
              />

              <SelectField
                label="Status"
                value={form.status}
                options={[
                  "Active",
                  "Draft",
                  "Under Review",
                  "Expired",
                  "Terminated",
                ]}
                onChange={(value) => updateField("status", value)}
              />
            </div>
          </section>

          <section style={panelStyle}>
            <h2 style={sectionHeadingStyle}>Contract Dates</h2>

            <div style={gridStyle}>
              <Field
                label="Start Date"
                type="date"
                value={form.startDate}
                onChange={(value) =>
                  updateField("startDate", value)
                }
              />

              <Field
                label="End Date"
                type="date"
                value={form.endDate}
                onChange={(value) =>
                  updateField("endDate", value)
                }
              />

              <Field
                label="Renewal Date"
                type="date"
                value={form.renewalDate}
                onChange={(value) =>
                  updateField("renewalDate", value)
                }
              />

              <Field
                label="Notice Period"
                placeholder="e.g. 90 days"
                value={form.noticePeriod}
                onChange={(value) =>
                  updateField("noticePeriod", value)
                }
              />
            </div>
          </section>

          <section style={panelStyle}>
            <h2 style={sectionHeadingStyle}>Account Ownership</h2>

            <div style={gridStyle}>
              <Field
                label="Account Manager"
                value={form.accountManager}
                onChange={(value) =>
                  updateField("accountManager", value)
                }
              />

              <Field
                label="Buying Group"
                value={form.buyingGroup}
                onChange={(value) =>
                  updateField("buyingGroup", value)
                }
              />
            </div>
          </section>

          <section style={panelStyle}>
            <h2 style={sectionHeadingStyle}>Commercial Terms</h2>

            <div style={gridStyle}>
              <Field
                label="Standard Discount %"
                type="number"
                step="0.01"
                placeholder="e.g. 53"
                value={form.standardDiscount}
                onChange={(value) =>
                  updateField("standardDiscount", value)
                }
              />

              <Field
                label="Rebate %"
                type="number"
                step="0.01"
                placeholder="e.g. 12"
                value={form.rebatePercent}
                onChange={(value) =>
                  updateField("rebatePercent", value)
                }
              />

              <Field
                label="Payment Terms"
                placeholder="e.g. 60 days end of month"
                value={form.paymentTerms}
                onChange={(value) =>
                  updateField("paymentTerms", value)
                }
              />

              <Field
                label="Credit Limit"
                type="number"
                step="0.01"
                placeholder="e.g. 250000"
                value={form.creditLimit}
                onChange={(value) =>
                  updateField("creditLimit", value)
                }
              />

              <Field
                label="Marketing Budget"
                type="number"
                step="0.01"
                placeholder="e.g. 30000"
                value={form.marketingBudget}
                onChange={(value) =>
                  updateField("marketingBudget", value)
                }
              />
            </div>
          </section>

          <section style={panelStyle}>
            <h2 style={sectionHeadingStyle}>Notes</h2>

            <label style={labelStyle}>
              Commercial Notes
              <textarea
                value={form.notes}
                onChange={(event) =>
                  updateField("notes", event.target.value)
                }
                rows={6}
                placeholder="Add any important commercial terms, exclusions or commitments."
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  minHeight: "140px",
                }}
              />
            </label>
          </section>

          {message && (
            <div
              style={{
                marginTop: "20px",
                padding: "16px",
                borderRadius: "10px",
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

          <div
            style={{
              marginTop: "24px",
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
            }}
          >
            <Link
              href="/agreements"
              style={{
                padding: "13px 20px",
                border: "1px solid #333333",
                borderRadius: "9px",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "13px 22px",
                border: "none",
                borderRadius: "9px",
                background: saving ? "#695d2b" : "#d4af37",
                color: "#111111",
                fontWeight: "bold",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving Agreement..." : "Save Agreement"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <label style={labelStyle}>
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        step={step}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label style={labelStyle}>
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

const panelStyle = {
  marginTop: "20px",
  background: "#151515",
  border: "1px solid #2b2b2b",
  borderRadius: "16px",
  padding: "24px",
};

const sectionHeadingStyle = {
  marginTop: 0,
  marginBottom: "20px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "18px",
};

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
  padding: "12px",
  background: "#0b0b0f",
  color: "#ffffff",
  border: "1px solid #333333",
  borderRadius: "8px",
  fontFamily: "inherit",
};