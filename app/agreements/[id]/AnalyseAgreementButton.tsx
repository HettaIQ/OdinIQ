"use client";

import { useState } from "react";

type AnalyseAgreementButtonProps = {
  agreementId: number;
};

type AnalysisResult = {
  agreementId: number;
  documentId?: number;
  documentName?: string;
  discount: string | null;
  rebate: string | null;
  paymentTerms: string | null;
  renewalDate: string | null;
  noticePeriod: string | null;
};

export default function AnalyseAgreementButton({
  agreementId,
}: AnalyseAgreementButtonProps) {
  const [analysing, setAnalysing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  async function handleAnalyse() {
    setAnalysing(true);
    setError("");
    setSuccessMessage("");
    setAnalysis(null);

    try {
      const response = await fetch(
        `/api/agreements/${agreementId}/analyse`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed.");
      }

      setAnalysis(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The agreement could not be analysed."
      );
    } finally {
      setAnalysing(false);
    }
  }

  async function handleApplyTerms() {
    if (!analysis) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/api/agreements/${agreementId}/apply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            discount: analysis.discount,
            rebate: analysis.rebate,
            paymentTerms: analysis.paymentTerms,
            renewalDate: analysis.renewalDate,
            noticePeriod: analysis.noticePeriod,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "The commercial terms could not be saved."
        );
      }

      setSuccessMessage("Commercial terms saved successfully.");
      setAnalysis(null);

      window.location.reload();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The commercial terms could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

const analysisComplete = Boolean(
  analysis?.discount &&
    analysis?.rebate &&
    analysis?.paymentTerms &&
    analysis?.renewalDate &&
    analysis?.noticePeriod
);

  return (
    <div>
      <button
        type="button"
        onClick={handleAnalyse}
        disabled={analysing || saving}
        className="rounded-md bg-yellow-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {analysing ? "Analysing..." : "Analyse Agreement"}
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {successMessage && (
        <p className="mt-3 text-sm text-green-400">
          {successMessage}
        </p>
      )}

      {analysis && (
        <div className="mt-4 rounded-lg border border-yellow-500/40 bg-black/20 p-4">
          <h3 className="mb-3 text-sm font-semibold text-yellow-400">
            Odin found these commercial terms
          </h3>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <ResultCard
              label="Discount"
              value={analysis.discount}
            />

            <ResultCard
              label="Rebate"
              value={analysis.rebate}
            />

            <ResultCard
              label="Payment Terms"
              value={analysis.paymentTerms}
            />

            <ResultCard
              label="Renewal Date"
              value={analysis.renewalDate}
            />

            <ResultCard
              label="Notice Period"
              value={analysis.noticePeriod}
            />
          </div>

          {analysis && !analysisComplete && (
  <p className="mt-3 text-sm text-yellow-300">
    Some terms could not be found in the document. Review the agreement before saving.
  </p>
)}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleApplyTerms}
              disabled={saving || !analysisComplete}
              className="rounded-md bg-yellow-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Approve & Save"}
            </button>

            <button
              type="button"
              onClick={() => setAnalysis(null)}
              disabled={saving}
              className="rounded-md border border-zinc-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {



  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-950 p-3">
      <p className="text-xs text-zinc-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-white">
        {value ?? "Not found"}
      </p>
    </div>
  );
}