"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CustomerRow = {
  accountCode: string;
  customerName: string;
  postcode: string;
  telephone: string;
  email: string;
  sageAgent: string;
  odinAgentName?: string | null;
  odinMembershipId?: number | null;
  odinEffectiveFrom?: string | null;
};

type AgentOption = {
  membershipId: number;
  name: string;
  roleName: string | null;
};

type Props = {
  customers: CustomerRow[];
  agents: AgentOption[];
  canManage: boolean;
};

export default function AgentAllocationClient({
  customers,
  agents,
  canManage,
}: Props) {
   const router = useRouter(); 
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [membershipId, setMembershipId] = useState("");
const [effectiveFrom, setEffectiveFrom] = useState("");
const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const allSelected =
    customers.length > 0 && selectedAccounts.length === customers.length;

  const selectedSet = useMemo(
    () => new Set(selectedAccounts),
    [selectedAccounts]
  );
const unallocatedCustomers = customers.filter(
  (customer) => !customer.odinAgentName
);

const allocatedCustomers = customers.filter(
  (customer) => customer.odinAgentName
);

const orderedCustomers = [
  ...unallocatedCustomers,
  ...allocatedCustomers,
];

  function toggleAccount(accountCode: string) {
    setSelectedAccounts((current) =>
      current.includes(accountCode)
        ? current.filter((code) => code !== accountCode)
        : [...current, accountCode]
    );
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedAccounts([]);
      return;
    }

    setSelectedAccounts(customers.map((customer) => customer.accountCode));
  }

  async function allocateAccounts() {
    setMessage("");
    setError("");

    if (!membershipId) {
      setError("Please select an OdinIQ sales agent.");
      return;
    }
    if (!effectiveFrom) {
  setError("Please select the date this allocation became effective.");
  return;
}

    if (selectedAccounts.length === 0) {
      setError("Please select at least one customer account.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/customers/import/agents/allocate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
  membershipId: Number(membershipId),
  effectiveFrom,
  accountCodes: selectedAccounts,
}),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "OdinIQ could not save the allocation."
        );
      }

      setMessage(
        `${result.allocatedCount} customer account${
          result.allocatedCount === 1 ? "" : "s"
        } allocated to ${result.agent.name}.`
      );

      setSelectedAccounts([]);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "OdinIQ could not save the allocation."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {canManage && (
      <div className="flex flex-wrap items-end gap-4">
  <div className="min-w-[260px] flex-1">
    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
      Allocate selected accounts to
    </label>

    <select
      value={membershipId}
      onChange={(event) => setMembershipId(event.target.value)}
      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
    >
      <option value="">Select OdinIQ agent</option>

      {agents.map((agent) => (
        <option
          key={agent.membershipId}
          value={agent.membershipId}
        >
          {agent.name}
          {agent.roleName ? ` — ${agent.roleName}` : ""}
        </option>
      ))}
    </select>
  </div>

  <div className="min-w-[200px]">
    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
      Effective from
    </label>

    <input
      type="date"
      value={effectiveFrom}
      onChange={(event) => setEffectiveFrom(event.target.value)}
      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
    />
  </div>

  <div>
    <button
      type="button"
      onClick={allocateAccounts}
      disabled={saving}
      className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {saving
        ? "Allocating..."
        : `Allocate ${selectedAccounts.length} selected`}
    </button>
  </div>
</div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {canManage && (
                <th className="w-12 px-5 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all customer accounts"
                  />
                </th>
              )}

              <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Account Ref
              </th>

              <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Customer
              </th>

              <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Postcode
              </th>

              <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Telephone
              </th>

              <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </th>

              <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sage Agent
              </th>

              <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                OdinIQ Owner
              </th>
              <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
  Effective From
</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {orderedCustomers.map((customer, index) => {
  const isAllocated = Boolean(customer.odinAgentName);

  const showNeedsAllocationHeader =
    !isAllocated && index === 0;

  const previousCustomer =
    index > 0 ? orderedCustomers[index - 1] : null;

  const showAllocatedHeader =
    isAllocated &&
    (!previousCustomer || !previousCustomer.odinAgentName);

  return (
    <Fragment key={customer.accountCode}>
      {showNeedsAllocationHeader && (
        <tr className="bg-amber-50">
          <td
            colSpan={canManage ? 9 : 8}
            className="px-5 py-3"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-amber-800">
                Needs Allocation
              </span>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-700">
                {unallocatedCustomers.length} remaining
              </span>
            </div>
          </td>
        </tr>
      )}
<tr className="hover:bg-slate-50">
  {canManage && (
    <td className="px-5 py-4">
      <input
        type="checkbox"
        checked={selectedSet.has(customer.accountCode)}
        onChange={() => toggleAccount(customer.accountCode)}
        aria-label={`Select ${customer.customerName}`}
      />
    </td>
  )}

  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">
    {customer.accountCode || "—"}
  </td>

  <td className="min-w-[260px] px-5 py-4 font-medium text-slate-900">
    {customer.customerName || "—"}
  </td>

  <td className="whitespace-nowrap px-5 py-4 text-slate-600">
    {customer.postcode || "—"}
  </td>

  <td className="whitespace-nowrap px-5 py-4 text-slate-600">
    {customer.telephone || "—"}
  </td>

  <td className="whitespace-nowrap px-5 py-4 text-slate-600">
    {customer.email || "—"}
  </td>

  <td className="whitespace-nowrap px-5 py-4">
    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
      {customer.sageAgent || "—"}
    </span>
  </td>

  <td className="whitespace-nowrap px-5 py-4">
    {customer.odinAgentName ? (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
        {customer.odinAgentName}
      </span>
    ) : (
      <span className="text-xs font-medium text-slate-400">
        Not allocated
      </span>
    )}
  </td>

  <td className="whitespace-nowrap px-5 py-4 text-slate-600">
    {customer.odinEffectiveFrom
      ? new Date(
          `${customer.odinEffectiveFrom}T00:00:00`
        ).toLocaleDateString("en-GB")
      : "—"}
  </td>
</tr>
      {showAllocatedHeader && (
        <tr className="bg-slate-100">
          <td
            colSpan={canManage ? 9 : 8}
            className="px-5 py-3"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-slate-800">
                Allocated
              </span>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                {allocatedCustomers.length} completed
              </span>
            </div>
          </td>
                </tr>
      )}
    </Fragment>
  );
})}
          </tbody>
        </table>
      </div>
    </div>
  );
}