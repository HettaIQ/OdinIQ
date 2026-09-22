import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";
import BuyingGroupMemberTable from "./BuyingGroupMemberTable";

type PageProps = {
  params: Promise<{
    group: string;
  }>;
};

function cleanCustomerName(value: string) {
  return value
    .replace(/\*+/g, "")
    .trim();
}

function normalizeCustomerName(
  value: string | null | undefined
) {
  return String(value ?? "")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function money(value: number) {
  return value.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });
}

export default async function BuyingGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ group: string }>;
  searchParams: Promise<{
    status?: string;
    search?: string;
  }>;
}) {

const filters = await searchParams;

const selectedStatus = filters.status ?? "all";
const search = (filters.search ?? "").trim().toLowerCase();

  const { group } = await params;

  const buyingGroup = decodeURIComponent(group);

  const {
    companyId,
  } = await requireCompanyContext();

  const customers = await prisma.customer.findMany({
    where: {
      companyId,
      buyingGroup,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      accountCode: true,
      status: true,
      buyingGroup: true,
     aliases: {
  select: {
    accountCode: true,
  },
},
    },
  });

const invoices = await prisma.salesInvoice.findMany({
  where: {
    companyId,
  },
  orderBy: {
    invoiceDate: "desc",
  },
});

  if (customers.length === 0) {
    notFound();
  }

  const now = new Date();

  const currentYear = now.getFullYear();
  const previousYear = currentYear - 1;

  const startOfCurrentYear = new Date(
    Date.UTC(currentYear, 0, 1)
  );

  const startOfPreviousYear = new Date(
    Date.UTC(previousYear, 0, 1)
  );

  const comparisonEndLastYear = new Date(
    Date.UTC(
      previousYear,
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59
    )
  );

  const rows = customers.map((customer) => {
    let currentYearSales = 0;
    let previousYearSales = 0;
    let lastInvoiceDate: Date | null = null;

const aliasCodes = new Set(
  customer.aliases.map((alias) => alias.accountCode)
);

const customerInvoices = invoices.filter((invoice) => {
  if (
    invoice.customerAccountCode === customer.accountCode
  ) {
    return true;
  }

  if (
    invoice.customerAccountCode &&
    aliasCodes.has(invoice.customerAccountCode)
  ) {
    return true;
  }

  if (
    !invoice.customerAccountCode &&
    normalizeCustomerName(invoice.customerName) ===
      normalizeCustomerName(customer.name)
  ) {
    return true;
  }

  return false;
});

    for (const invoice of customerInvoices) {
      if (!invoice.invoiceDate) {
        continue;
      }

      const invoiceType = String(
        invoice.invoiceType ?? ""
      ).toUpperCase();

      const value = Number(invoice.netValue ?? 0);

      const signedValue =
        invoiceType.includes("CREDIT")
          ? -Math.abs(value)
          : value;

      if (
        invoice.invoiceDate >= startOfCurrentYear &&
        invoice.invoiceDate <= now
      ) {
        currentYearSales += signedValue;
      }

      if (
        invoice.invoiceDate >= startOfPreviousYear &&
        invoice.invoiceDate <= comparisonEndLastYear
      ) {
        previousYearSales += signedValue;
      }

      if (
        !lastInvoiceDate ||
        invoice.invoiceDate > lastInvoiceDate
      ) {
        lastInvoiceDate = invoice.invoiceDate;
      }
    }

    const movementValue =
      currentYearSales - previousYearSales;

    const movementPercent =
      previousYearSales !== 0
        ? (movementValue / previousYearSales) * 100
        : currentYearSales > 0
        ? 100
        : 0;

    let trend: "GROWING" | "DECLINING" | "FLAT" | "NO SALES";

    if (currentYearSales === 0) {
      trend = "NO SALES";
    } else if (movementPercent >= 10) {
      trend = "GROWING";
    } else if (movementPercent <= -10) {
      trend = "DECLINING";
    } else {
      trend = "FLAT";
    }

    return {
      id: customer.id,
      name: cleanCustomerName(customer.name),
      accountCode: customer.accountCode,
      status: customer.status,
      currentYearSales,
      previousYearSales,
      movementValue,
      movementPercent,
      lastInvoiceDate,
      trend,
    };
  });

  rows.sort(
    (a, b) =>
      a.movementValue - b.movementValue
  );

  const totalCurrentYear = rows.reduce(
    (sum, row) => sum + row.currentYearSales,
    0
  );

  const totalPreviousYear = rows.reduce(
    (sum, row) => sum + row.previousYearSales,
    0
  );

  const totalMovement =
    totalCurrentYear - totalPreviousYear;

  const totalMovementPercent =
    totalPreviousYear !== 0
      ? (totalMovement / totalPreviousYear) * 100
      : totalCurrentYear > 0
      ? 100
      : 0;

  const growingCount = rows.filter(
    (row) => row.trend === "GROWING"
  ).length;

  const decliningCount = rows.filter(
    (row) => row.trend === "DECLINING"
  ).length;

  const noSalesCount = rows.filter(
    (row) => row.trend === "NO SALES"
  ).length;

const filteredRows = rows.filter((row) => {
  const matchesStatus =
    selectedStatus === "all" ||
    row.trend.toLowerCase().replace(" ", "-") === selectedStatus;

  const matchesSearch =
    !search ||
    row.name.toLowerCase().includes(search) ||
    row.accountCode.toLowerCase().includes(search);

  return matchesStatus && matchesSearch;
});

const memberTableRows = rows.map((row) => ({
  id: row.id,
  name: row.name,
  accountCode: row.accountCode,
  currentYearSales: row.currentYearSales,
  previousYearSales: row.previousYearSales,
  movementValue: row.movementValue,
  movementPercent: row.movementPercent,
  lastInvoiceDate: row.lastInvoiceDate
    ? row.lastInvoiceDate.toISOString()
    : null,
  trend: row.trend,
}));

  return (
    <main className="p-8">
      <Link
        href="/commercial/customers"
        className="text-sm font-semibold text-amber-600 hover:underline"
      >
        ← Back to Customers
      </Link>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
          Buying Group Performance
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          {buyingGroup}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Performance of all customers currently allocated to this buying group.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          label="Members"
          value={String(rows.length)}
        />

        <SummaryCard
          label={`${currentYear} YTD`}
          value={money(totalCurrentYear)}
        />

        <SummaryCard
          label={`${previousYear} YTD`}
          value={money(totalPreviousYear)}
        />

        <SummaryCard
          label="Movement"
          value={`${totalMovementPercent >= 0 ? "+" : ""}${totalMovementPercent.toFixed(
            1
          )}%`}
        />

        <SummaryCard
          label="Growing"
          value={String(growingCount)}
        />

        <SummaryCard
          label="Declining / No Sales"
          value={String(
            decliningCount + noSalesCount
          )}
        />
      </div>

      <BuyingGroupMemberTable
  rows={memberTableRows}
  currentYear={currentYear}
  previousYear={previousYear}
/>
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function TrendBadge({
  trend,
}: {
  trend: "GROWING" | "DECLINING" | "FLAT" | "NO SALES";
}) {
  const className =
    trend === "GROWING"
      ? "bg-emerald-50 text-emerald-700"
      : trend === "DECLINING"
      ? "bg-red-50 text-red-700"
      : trend === "NO SALES"
      ? "bg-amber-50 text-amber-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {trend}
    </span>
  );
}


