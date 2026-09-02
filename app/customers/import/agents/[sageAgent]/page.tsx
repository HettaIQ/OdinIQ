import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/requireAuth";
import {
  getCustomerImportAllocation,
  getCustomerImportSession,
} from "@/lib/customerImportSession";

import AgentAllocationClient from "./AgentAllocationClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    sageAgent: string;
  }>;
};

type CustomerImportRow = Record<string, unknown>;

function getValue(row: CustomerImportRow, possibleKeys: string[]) {
  for (const key of possibleKeys) {
    const matchingKey = Object.keys(row).find(
      (rowKey) => rowKey.trim().toLowerCase() === key.trim().toLowerCase()
    );

    if (matchingKey) {
      return String(row[matchingKey] ?? "").trim();
    }
  }

  return "";
}

function getTradeContact(row: CustomerImportRow) {
  return getValue(row, [
    "Trade Contact",
    "TradeContact",
    "Trade Contact Name",
    "Contact",
    "Sales Rep",
    "Sales Representative",
    "Rep",
    "Agent",
  ]);
}

function getAccountReference(row: CustomerImportRow) {
  return getValue(row, [
    "A/C",
    "A/C Ref",
    "A/C Reference",
    "Account Ref",
    "Account Reference",
    "Account",
    "Customer Ref",
    "Customer Reference",
  ]);
}

function getCustomerName(row: CustomerImportRow) {
  return getValue(row, [
    "Name",
    "Customer Name",
    "Company Name",
    "Account Name",
  ]);
}

function getPostcode(row: CustomerImportRow) {
  return getValue(row, ["Postcode", "Post Code"]);
}

function getTelephone(row: CustomerImportRow) {
  return getValue(row, [
    "Telephone",
    "Phone",
    "Telephone Number",
    "Phone Number",
  ]);
}

function getEmail(row: CustomerImportRow) {
  return getValue(row, ["Email", "Email Address", "E-mail"]);
}

export default async function SageAgentAllocationPage({
  params,
}: PageProps) {
  const user = await requireAuth();
  const membership = user.memberships[0];

  if (!membership) {
    throw new Error("No active company membership found.");
  }

  const { sageAgent } = await params;
  const agentName = decodeURIComponent(sageAgent);

  const canManage =
    membership.role?.name === "Company Admin" ||
    membership.role?.name === "Accounts";

  const session = getCustomerImportSession(membership.companyId);

  const agentRows =
    session?.rows.filter((row) => {
      const tradeContact = getTradeContact(row);

      return tradeContact.toLowerCase() === agentName.trim().toLowerCase();
    }) ?? [];

  const customers = agentRows
    .map((row) => {
      const accountCode = getAccountReference(row);
      const allocation = accountCode
        ? getCustomerImportAllocation(membership.companyId, accountCode)
        : null;

      return {
        accountCode,
        customerName: getCustomerName(row),
        postcode: getPostcode(row),
        telephone: getTelephone(row),
        email: getEmail(row),
        sageAgent: getTradeContact(row),
        odinAgentName: allocation?.agentName ?? null,
        odinMembershipId: allocation?.membershipId ?? null,
        odinEffectiveFrom: allocation?.effectiveFrom ?? null,
      };
    })
    .filter((customer) => customer.accountCode);

  const agentMemberships = await prisma.companyMembership.findMany({
    where: {
      companyId: membership.companyId,
      active: true,
      user: {
        active: true,
      },
    },
    include: {
      user: true,
      role: true,
    },
    orderBy: {
      user: {
        name: "asc",
      },
    },
  });

  const agents = agentMemberships.map((agentMembership) => ({
    membershipId: agentMembership.id,
    name: agentMembership.user.name,
    roleName: agentMembership.role?.name ?? null,
  }));

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <Link
        href="/customers/import"
        className="text-sm font-semibold text-amber-600 hover:text-amber-700"
      >
        ← Back to customer import
      </Link>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          Agent Allocation
        </p>

        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">{agentName}</h1>

            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Review the customer accounts associated with this Sage Trade
              Contact and allocate them to the correct OdinIQ sales agent.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Customer accounts
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-950">
              {customers.length}
            </p>
          </div>
        </div>
      </div>

      {!canManage && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You can view these allocations, but only Company Admin and Accounts
          can change customer ownership.
        </div>
      )}

      {!session && (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="font-semibold text-red-800">
            Customer import session not found
          </p>

          <p className="mt-1 text-sm text-red-700">
            Return to Customer Import and upload the Sage customer file again.
          </p>
        </div>
      )}

      {session && customers.length === 0 && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="font-semibold text-slate-900">
            No customer accounts found
          </p>

          <p className="mt-1 text-sm text-slate-500">
            OdinIQ could not find any imported Sage rows where the Trade Contact
            matches {agentName}.
          </p>
        </div>
      )}

      {session && customers.length > 0 && (
        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Sage Trade Contact
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              {agentName}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {customers.length} customer account
              {customers.length === 1 ? "" : "s"} currently associated with
              this Sage agent.
            </p>
          </div>

          <AgentAllocationClient
            customers={customers}
            agents={agents}
            canManage={canManage}
          />
        </section>
      )}
    </main>
  );
}