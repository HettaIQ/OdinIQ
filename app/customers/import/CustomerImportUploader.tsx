"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";


type PreviewRow = Record<string, unknown>;

export default function CustomerImportUploader() {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [allRows, setAllRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState("");
  const [comparison, setComparison] = useState<any>(null);
  const [creatingAgent, setCreatingAgent] = useState<string | null>(null);
const [agentMessage, setAgentMessage] = useState("");
const [committing, setCommitting] = useState(false);
const [commitMessage, setCommitMessage] = useState("");
const [matchingAgent, setMatchingAgent] = useState<string | null>(null);
const [selectedExistingAgent, setSelectedExistingAgent] = useState<Record<string, string>>({});
const [existingAgents, setExistingAgents] = useState<
  { membershipId: number; name: string }[]
>([]);

useEffect(() => {
  async function loadExistingAgents() {
    try {
      const response = await fetch(
        "/api/customers/import/agents/list",
        {
          method: "GET",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "OdinIQ could not load the existing agents."
        );
      }

      setExistingAgents(result.agents ?? []);
    } catch (err) {
      console.error("Load existing agents failed:", err);
    }
  }

  loadExistingAgents();
}, []);


  async function handleFile(file: File) {
    setError("");
    setHeaders([]);
setRows([]);
setAllRows([]);
setFileName(file.name);
setComparison(null);

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

const serializableData: PreviewRow[] = data.map((row) => {
  const plainRow: PreviewRow = {};

  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      plainRow[key] = value.toISOString();
    } else if (
      value === null ||
      value === undefined ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      plainRow[key] = value ?? "";
    } else {
      plainRow[key] = String(value);
    }
  }

  return plainRow;
});

      if (data.length === 0) {
        setError("The file does not contain any customer rows.");
        return;
      }

      const detectedHeaders = Object.keys(data[0]);

      setHeaders(detectedHeaders);
setRows(serializableData.slice(0, 10));
setAllRows(serializableData);

const response = await fetch("/api/customers/import/preview", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    rows: serializableData,
  }),
});

if (!response.ok) {
  throw new Error("Customer import preview failed.");
}

const result = await response.json();
setComparison(result);;
    } catch (err) {
      console.error(err);
      setError("OdinIQ could not read this customer file.");
    }
  }
async function createOdinAgent(agentName: string) {
  try {
    setCreatingAgent(agentName);
    setAgentMessage("");
    setError("");

    const response = await fetch(
      "/api/customers/import/agents/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentName,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error || "OdinIQ could not create this sales agent."
      );
    }
setExistingAgents((current) => {
  const alreadyExists = current.some(
    (agent) => agent.membershipId === result.membershipId
  );

  if (alreadyExists) {
    return current;
  }

  return [
    ...current,
    {
      membershipId: result.membershipId,
      name: result.name,
    },
  ].sort((a, b) => a.name.localeCompare(b.name));
});
    setAgentMessage(
      result.created
        ? `${result.name} has been created as an OdinIQ Sales Agent.`
        : `${result.name} is already an OdinIQ team member.`
    );

    if (allRows.length > 0) {
      const previewResponse = await fetch(
        "/api/customers/import/preview",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
          rows: allRows,  
          }),
        }
      );

      if (previewResponse.ok) {
        const previewResult = await previewResponse.json();
        setComparison(previewResult);
      }
    }
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "OdinIQ could not create this sales agent."
    );
  } finally {
    setCreatingAgent(null);
  }
}

async function matchExistingAgent(agentName: string) {
  try {
    const membershipId = Number(selectedExistingAgent[agentName]);

    if (!membershipId) {
      setError("Please select an existing OdinIQ sales agent.");
      return;
    }

    setMatchingAgent(agentName);
    setAgentMessage("");
    setError("");

    const response = await fetch(
      "/api/customers/import/agents/match",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sageAgentName: agentName,
          membershipId,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error || "OdinIQ could not match this Sage agent."
      );
    }

    const displayAgentName = String(result.agentName ?? "")
  .split("/")
  .map((name) => {
    const trimmed = name.trim();

    return trimmed
      ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
      : "";
  })
  .filter(Boolean);

const formattedAgentName =
  displayAgentName.length > 1
    ? `${displayAgentName.slice(0, -1).join(", ")} & ${
        displayAgentName[displayAgentName.length - 1]
      }`
    : displayAgentName[0] ?? "";

setAgentMessage(
  `${result.sageAgentName} has been matched to ${formattedAgentName}.`
);

    if (allRows.length > 0) {
      const previewResponse = await fetch(
        "/api/customers/import/preview",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rows: allRows,
          }),
        }
      );

      if (previewResponse.ok) {
        const previewResult = await previewResponse.json();
        setComparison(previewResult);
      }
    }
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "OdinIQ could not match this Sage agent."
    );
  } finally {
    setMatchingAgent(null);
  }
}


async function commitCustomerImport() {
 const confirmed = window.confirm(
  `You are about to import ${comparison?.summary?.rowsDetected ?? 0} customers into OdinIQ.

This will create new customer records and update existing customer data.

Recognised sales agents will be allocated automatically. Unmatched Sage agents will remain unallocated.

Do you want to continue?`
);

if (!confirmed) {
  return;
}   
  try {
    setCommitting(true);
    setCommitMessage("");
    setError("");

    const response = await fetch(
      "/api/customers/import/commit",
      {
        method: "POST",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error || "OdinIQ could not import the customers."
      );
    }

    setCommitMessage(
      `Import complete: ${result.summary.created} created, ${result.summary.updated} updated, ${result.summary.skipped} skipped.`
    );
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "OdinIQ could not import the customers."
    );
  } finally {
    setCommitting(false);
  }
}
  return (
    <div>
      <div className="rounded-xl border-2 border-dashed border-slate-300 p-10 text-center">
        <p className="font-semibold text-slate-900">
          Sage customer export
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Select the Sage customer list in CSV or Excel format.
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
{comparison && (
  <div className="mt-8">
    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
      Import comparison
    </p>

    <h3 className="mt-1 text-lg font-bold text-slate-950">
      Customer changes detected
    </h3>

    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase text-slate-500">
          Rows detected
        </p>
        <p className="mt-1 text-2xl font-bold text-slate-950">
          {comparison.summary.rowsDetected}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase text-slate-500">
          New customers
        </p>
        <p className="mt-1 text-2xl font-bold text-slate-950">
          {comparison.summary.newCustomers}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase text-slate-500">
          Existing customers
        </p>
        <p className="mt-1 text-2xl font-bold text-slate-950">
          {comparison.summary.existingCustomers}
        </p>
      </div>

      <div className="rounded-xl border border-slate-900 bg-slate-950 p-4 text-white">
        <p className="text-xs font-semibold uppercase text-slate-300">
          Unmatched agents
        </p>
        <p className="mt-1 text-2xl font-bold">
          {comparison.summary.unmatchedAgents}
        </p>
      </div>
    </div>
    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
  <div className="flex items-center justify-between gap-6">
    <div>
      <p className="text-sm font-bold text-slate-950">
        Ready to import customers into OdinIQ
      </p>
      <p className="mt-1 text-xs text-slate-500">
        This will create new customers, update existing customer data and apply recognised sales agent allocations.
      </p>
    </div>

    <button
      type="button"
      onClick={commitCustomerImport}
      disabled={committing}
      className="shrink-0 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {committing ? "Importing..." : "Import Customers into OdinIQ"}
    </button>
  </div>

  {commitMessage && (
    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
      {commitMessage}
    </div>
  )}
</div>
{comparison.unmatchedAgentNames?.length > 0 && (
  <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
      Sage agents not yet matched
    </p>

    <h4 className="mt-1 text-base font-bold text-slate-950">
      Unique Trade Contact names
    </h4>

    <p className="mt-1 text-sm text-slate-500">
      These names exist in Sage but are not yet linked to an OdinIQ Sales Agent.
    </p>
{agentMessage && (
  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
    {agentMessage}
  </div>
)}
    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sage Trade Contact
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Customer accounts
            </th>
           <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
  Match Existing
</th>

<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
  OdinIQ
</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {comparison.unmatchedAgentNames.map(
            (agent: { name: string; customerCount: number }) => (
              <tr key={agent.name}>
                <td className="px-4 py-3 font-medium">
  <a
    href={`/customers/import/agents/${encodeURIComponent(agent.name)}`}
    className="text-slate-900 hover:text-amber-600 hover:underline"
  >
    {agent.name}
  </a>
</td>

<td className="px-4 py-3">
  <a
    href={`/customers/import/agents/${encodeURIComponent(agent.name)}`}
    className="font-semibold text-slate-700 hover:text-amber-600 hover:underline"
  >
    {agent.customerCount}
  </a>
</td>
<td className="px-4 py-3">
  <select
    value={selectedExistingAgent[agent.name] ?? ""}
    onChange={(event) =>
      setSelectedExistingAgent((current) => ({
        ...current,
        [agent.name]: event.target.value,
      }))
    }
    className="w-full min-w-[220px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
  >
    <option value="">Match existing agent</option>

    {existingAgents.map((existingAgent) => (
      <option
        key={existingAgent.membershipId}
        value={existingAgent.membershipId}
      >
        {existingAgent.name}
      </option>
    ))}
  </select>
  <button
  type="button"
  onClick={() => matchExistingAgent(agent.name)}
  disabled={
    matchingAgent === agent.name ||
    !selectedExistingAgent[agent.name]
  }
  className="mt-2 w-full rounded-lg border border-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
>
  {matchingAgent === agent.name
    ? "Matching..."
    : "Match"}
</button>
</td>
<td className="px-4 py-3 text-right">
  <button
    type="button"
    onClick={() => createOdinAgent(agent.name)}
    disabled={creatingAgent === agent.name}
    className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {creatingAgent === agent.name
      ? "Creating..."
      : "Create OdinIQ Agent"}
  </button>
</td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  </div>
)}
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">Credit limit changes</p>
        <p className="mt-1 text-xl font-bold">
          {comparison.summary.creditLimitChanges}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">Balance changes</p>
        <p className="mt-1 text-xl font-bold">
          {comparison.summary.balanceChanges}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">Discount changes</p>
        <p className="mt-1 text-xl font-bold">
          {comparison.summary.discountChanges}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">Buying group changes</p>
        <p className="mt-1 text-xl font-bold">
          {comparison.summary.buyingGroupChanges}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">Agent changes</p>
        <p className="mt-1 text-xl font-bold">
          {comparison.summary.agentChanges}
        </p>
      </div>
    </div>
  </div>
)}
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
              Sage customer preview
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