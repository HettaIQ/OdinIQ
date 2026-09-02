"use server";

import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";

type SageCustomerRow = Record<string, unknown>;

function clean(value: unknown) {
  return String(value ?? "").trim();
}
function field(row: SageCustomerRow, wantedHeader: string) {
  const wanted = wantedHeader
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

  const matchingKey = Object.keys(row).find((key) => {
    const normalisedKey = key
      .trim()
      .toUpperCase()
      .replace(/\s+/g, " ");

    return normalisedKey === wanted;
  });

  return matchingKey ? row[matchingKey] : "";
}
function numberValue(value: unknown) {
  const cleaned = clean(value)
    .replace(/£/g, "")
    .replace(/,/g, "");

  if (!cleaned) {
    return null;
  }

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

export async function previewCustomerImport(rows: SageCustomerRow[]) {
  const user = await requireAuth();
  const membership = user.memberships[0];

  if (!membership) {
    throw new Error("No active company membership found.");
  }

  if (
    membership.role?.name !== "Company Admin" &&
    membership.role?.name !== "Accounts"
  ) {
    throw new Error(
      "You do not have permission to import or update customer master data."
    );
  }

  const existingCustomers = await prisma.customer.findMany({
    where: {
      companyId: membership.companyId,
    },
    select: {
      id: true,
      accountCode: true,
      name: true,
      buyingGroup: true,
      creditLimit: true,
      currentBalance: true,
      discount: true,
      assignedMembershipId: true,
    },
  });

  const teamMembers = await prisma.companyMembership.findMany({
  where: {
    companyId: membership.companyId,
    active: true,
  },
  include: {
    user: true,
    role: true,
    agentAliases: true,
  },
});

  const existingByAccountCode = new Map(
    existingCustomers.map((customer) => [
      customer.accountCode.trim().toUpperCase(),
      customer,
    ])
  );

  const salesAgents = teamMembers.filter(
    (member) => member.role?.name === "Sales Agent"
  );

  let validRows = 0;
  let newCustomers = 0;
  let existingCustomersCount = 0;
  let unchanged = 0;

  let creditLimitChanges = 0;
  let balanceChanges = 0;
  let discountChanges = 0;
  let buyingGroupChanges = 0;
  let agentChanges = 0;

  let unmatchedAgents = 0;
  const unmatchedAgentNames = new Map<string, number>();

  const preview = rows.map((row, index) => {
    const accountCode = clean(field(row, "A/C")).toUpperCase();
const name = clean(field(row, "NAME"));
const tradeContact = clean(field(row, "TRADE CONTACT"));
const buyingGroup = clean(field(row, "ANALYSIS1"));

const creditLimit = numberValue(field(row, "CREDIT LIMIT"));
const currentBalance = numberValue(field(row, "BALANCE"));
const discount = numberValue(field(row, "DISCOUNT"));

    if (!accountCode || !name) {
      return {
        row: index + 2,
        accountCode,
        name,
        status: "INVALID",
        changes: ["Missing account code or customer name"],
      };
    }

    validRows++;

    const existing = existingByAccountCode.get(accountCode);

    const matchedAgent = tradeContact
  ? salesAgents.find((member) => {
      const sageAgent = tradeContact.trim().toLowerCase();

      const userName = member.user.name?.trim().toLowerCase();
      const agentCode = member.agentCode?.trim().toLowerCase();

      const aliasMatch = member.agentAliases.some(
        (agentAlias) => agentAlias.alias.trim().toLowerCase() === sageAgent
      );

      return (
        userName === sageAgent ||
        agentCode === sageAgent ||
        aliasMatch
      );
    })
  : null;

    if (tradeContact && !matchedAgent) {
  unmatchedAgents++;

  const key = tradeContact.trim();

  unmatchedAgentNames.set(
    key,
    (unmatchedAgentNames.get(key) ?? 0) + 1
  );
}

    if (!existing) {
      newCustomers++;

      return {
        row: index + 2,
        accountCode,
        name,
        status: "NEW",
        sageAgent: tradeContact || null,
        matchedAgent: matchedAgent?.user.name ?? null,
        buyingGroup: buyingGroup || null,
        changes: ["New customer"],
      };
    }

    existingCustomersCount++;

    const changes: string[] = [];

    if (
      creditLimit !== null &&
      (existing.creditLimit ?? 0) !== creditLimit
    ) {
      creditLimitChanges++;
      changes.push(
        `Credit limit: £${(existing.creditLimit ?? 0).toLocaleString(
          "en-GB"
        )} → £${creditLimit.toLocaleString("en-GB")}`
      );
    }

    if (
      currentBalance !== null &&
      (existing.currentBalance ?? 0) !== currentBalance
    ) {
      balanceChanges++;
      changes.push(
        `Balance: £${(existing.currentBalance ?? 0).toLocaleString(
          "en-GB"
        )} → £${currentBalance.toLocaleString("en-GB")}`
      );
    }

    if (
      discount !== null &&
      (existing.discount ?? 0) !== discount
    ) {
      discountChanges++;
      changes.push(
        `Discount: ${existing.discount ?? 0}% → ${discount}%`
      );
    }

    if ((existing.buyingGroup ?? "") !== buyingGroup) {
      buyingGroupChanges++;
      changes.push(
        `Buying group: ${existing.buyingGroup || "None"} → ${
          buyingGroup || "None"
        }`
      );
    }

    if (
      matchedAgent &&
      existing.assignedMembershipId !== matchedAgent.id
    ) {
      agentChanges++;
      changes.push(
        `Sales agent → ${matchedAgent.user.name ?? matchedAgent.user.email}`
      );
    }

    if (changes.length === 0) {
      unchanged++;
    }

    return {
      row: index + 2,
      accountCode,
      name,
      status: changes.length === 0 ? "UNCHANGED" : "UPDATE",
      sageAgent: tradeContact || null,
      matchedAgent: matchedAgent?.user.name ?? null,
      buyingGroup: buyingGroup || null,
      changes,
    };
  });

  return {
  summary: {
    rowsDetected: rows.length,
    validRows,
    newCustomers,
    existingCustomers: existingCustomersCount,
    unchanged,
    creditLimitChanges,
    balanceChanges,
    discountChanges,
    buyingGroupChanges,
    agentChanges,
    unmatchedAgents,
  },

  unmatchedAgentNames: Array.from(unmatchedAgentNames.entries())
    .map(([name, customerCount]) => ({
      name,
      customerCount,
    }))
    .sort((a, b) => b.customerCount - a.customerCount),

  preview,
};
}