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

function normalizeInvoiceType(
  value: string | null | undefined
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function isCreditNote(invoice: {
  invoiceType: string | null;
}) {
  const type = normalizeInvoiceType(
    invoice.invoiceType
  );

  return (
    type === "CRD" ||
    type === "CREDIT" ||
    type.includes("CREDIT NOTE")
  );
}

function isCancelledInvoice(invoice: {
  customerOrderNumber: string | null;
}) {
  return (
    String(invoice.customerOrderNumber ?? "")
      .trim()
      .toLowerCase() === "cancelled"
  );
}

function isSalesInvoice(invoice: {
  invoiceType: string | null;
  customerOrderNumber: string | null;
}) {
  if (isCancelledInvoice(invoice)) {
    return false;
  }

  if (isCreditNote(invoice)) {
    return false;
  }

  const type = normalizeInvoiceType(
    invoice.invoiceType
  );

  return (
    !type ||
    type === "INV" ||
    type === "INVOICE" ||
    type.includes("INVOICE")
  );
}

function commercialNetValue(invoice: {
  invoiceType: string | null;
  customerOrderNumber: string | null;
  netValue: number | null;
}) {
  if (isCancelledInvoice(invoice)) {
    return 0;
  }

  const value = Number(
    invoice.netValue ?? 0
  );

  if (isCreditNote(invoice)) {
    return -Math.abs(value);
  }

  if (isSalesInvoice(invoice)) {
    return value;
  }

  return 0;
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

      const signedValue =
  commercialNetValue(invoice);
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

const flatCount = rows.filter(
  (row) => row.trend === "FLAT"
).length;

const activeCount = rows.filter(
  (row) => row.currentYearSales > 0
).length;

const biggestGrowth = [...rows]
  .filter((row) => row.movementValue > 0)
  .sort(
    (a, b) =>
      b.movementValue - a.movementValue
  )
  .slice(0, 5);

const biggestDeclines = [...rows]
  .filter((row) => row.movementValue < 0)
  .sort(
    (a, b) =>
      a.movementValue - b.movementValue
  )
  .slice(0, 5);

const totalGrowthContribution =
  biggestGrowth.reduce(
    (sum, row) =>
      sum + row.movementValue,
    0
  );

const totalDeclineContribution =
  biggestDeclines.reduce(
    (sum, row) =>
      sum + row.movementValue,
    0
  );
const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const buyingGroupAccountCodes = new Set(
  customers.flatMap((customer) => [
    customer.accountCode,
    ...customer.aliases.map(
      (alias) => alias.accountCode
    ),
  ])
);

const buyingGroupCustomerNames = new Set(
  customers.map((customer) =>
    normalizeCustomerName(customer.name)
  )
);

const monthlyPerformance = monthNames.map(
  (month, monthIndex) => {
    let current = 0;
    let previous = 0;

    const isPastMonth =
      monthIndex < now.getUTCMonth();

    const isCurrentMonth =
      monthIndex === now.getUTCMonth();

    const isFutureMonth =
      monthIndex > now.getUTCMonth();

    const previousYearSameDay = new Date(
      Date.UTC(
        previousYear,
        monthIndex,
        now.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );

    for (const invoice of invoices) {
      if (!invoice.invoiceDate) {
        continue;
      }

      const matchesBuyingGroup =
        Boolean(
          invoice.customerAccountCode &&
            buyingGroupAccountCodes.has(
              invoice.customerAccountCode
            )
        ) ||
        (!invoice.customerAccountCode &&
          buyingGroupCustomerNames.has(
            normalizeCustomerName(
              invoice.customerName
            )
          ));

      if (!matchesBuyingGroup) {
        continue;
      }

      const invoiceDate = new Date(
        invoice.invoiceDate
      );

      if (
        invoiceDate.getUTCMonth() !==
        monthIndex
      ) {
        continue;
      }

      const value =
        commercialNetValue(invoice);

      // Current year:
      // past months = full month
      // current month = month to date
      // future months = no sales yet
      if (
        invoiceDate.getUTCFullYear() ===
          currentYear &&
        invoiceDate <= now
      ) {
        current += value;
      }

      // Previous year:
      // past months = full month
      // current month = same point last year
      // future months = full historical month
      if (
        invoiceDate.getUTCFullYear() ===
        previousYear
      ) {
        if (
          isPastMonth ||
          isFutureMonth
        ) {
          previous += value;
        } else if (
          isCurrentMonth &&
          invoiceDate <=
            previousYearSameDay
        ) {
          previous += value;
        }
      }
    }

    const difference =
      current - previous;

    const percentage =
      previous !== 0
        ? (difference / previous) * 100
        : current > 0
        ? 100
        : 0;

    return {
      month,
      current,
      previous,
      difference,
      percentage,
    };
  }
);
  
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

const customersRequiringAttention = rows
  .filter((row) => {
    // Customer bought last year but has no sales this year
    if (
      row.currentYearSales === 0 &&
      row.previousYearSales > 0
    ) {
      return true;
    }

    // Customer is at least 10% down year on year
    if (
      row.previousYearSales > 0 &&
      row.movementPercent <= -10
    ) {
      return true;
    }

    return false;
  })
  .sort((a, b) => a.movementValue - b.movementValue);

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
  label="Declining"
  value={String(decliningCount)}
/>

<SummaryCard
  label="No Sales"
  value={String(noSalesCount)}
/>
      </div>
<section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
      Odin Group Intelligence
    </p>

    <h2 className="mt-1 text-xl font-bold text-slate-950">
      What is driving {buyingGroup}?
    </h2>

    <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
      {buyingGroup} is currently{" "}
      <span
        className={
          totalMovementPercent >= 0
            ? "font-semibold text-emerald-700"
            : "font-semibold text-red-700"
        }
      >
        {totalMovementPercent >= 0 ? "up" : "down"}{" "}
        {Math.abs(totalMovementPercent).toFixed(1)}%
      </span>{" "}
      year to date, with sales of{" "}
      <span className="font-semibold text-slate-950">
        {money(totalCurrentYear)}
      </span>{" "}
      compared with{" "}
      <span className="font-semibold text-slate-950">
        {money(totalPreviousYear)}
      </span>{" "}
      for the same period last year.
      {" "}
      {activeCount} of {rows.length} members have sales this year.
      {" "}
      {growingCount} are growing, {decliningCount} are declining,
      {" "}
      {flatCount} are broadly flat and {noSalesCount} have no sales.
    </p>
  </div>

  <div className="mt-6 grid gap-6 lg:grid-cols-2">
    <div>
      <h3 className="text-sm font-bold text-emerald-700">
        Biggest Growth Contributors
      </h3>

      <div className="mt-3 space-y-2">
        {biggestGrowth.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3"
          >
            <span className="font-semibold text-slate-900">
              {row.name}
            </span>

            <span className="font-bold text-emerald-700">
              +{money(row.movementValue)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Top five growth contributors:{" "}
        <span className="font-semibold text-emerald-700">
          +{money(totalGrowthContribution)}
        </span>
      </p>
    </div>

    <div>
      <h3 className="text-sm font-bold text-red-700">
        Biggest Sales Declines
      </h3>

      <div className="mt-3 space-y-2">
        {biggestDeclines.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3"
          >
            <span className="font-semibold text-slate-900">
              {row.name}
            </span>

            <span className="font-bold text-red-700">
              {money(row.movementValue)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Top five sales declines:{" "}
        <span className="font-semibold text-red-700">
          {money(totalDeclineContribution)}
        </span>
      </p>
    </div>
  </div>
</section>

<section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
  <div className="border-b border-slate-200 px-6 py-5">
    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
      Monthly Performance
    </p>

    <h2 className="mt-1 text-xl font-bold text-slate-950">
      {currentYear} vs {previousYear}
    </h2>

    <p className="mt-1 text-sm text-slate-500">
      Monthly net sales for {buyingGroup}, comparing the same periods year on year.
    </p>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-6 py-3">
            Month
          </th>

          <th className="px-6 py-3 text-right">
            {currentYear}
          </th>

          <th className="px-6 py-3 text-right">
            {previousYear}
          </th>

          <th className="px-6 py-3 text-right">
            £ Difference
          </th>

          <th className="px-6 py-3 text-right">
            Change
          </th>
        </tr>
      </thead>

      <tbody>
     
{monthlyPerformance.map((month, monthIndex) => {
  const isFutureMonth =
    monthIndex > now.getUTCMonth();

  return (
    <tr
      key={month.month}
      className="border-t border-slate-100"
    >
      <td className="px-6 py-4 font-semibold text-slate-950">
        {month.month}
      </td>

      <td className="px-6 py-4 text-right font-semibold">
        {money(month.current)}
      </td>

      <td className="px-6 py-4 text-right">
        {money(month.previous)}
      </td>

      <td
        className={`px-6 py-4 text-right font-semibold ${
          isFutureMonth
            ? "text-slate-400"
            : month.difference > 0
            ? "text-emerald-700"
            : month.difference < 0
            ? "text-red-700"
            : "text-slate-500"
        }`}
      >
        {isFutureMonth
          ? "—"
          : `${month.difference > 0 ? "+" : ""}${money(
              month.difference
            )}`}
      </td>

      <td
        className={`px-6 py-4 text-right font-semibold ${
          isFutureMonth
            ? "text-amber-600"
            : month.percentage > 0
            ? "text-emerald-700"
            : month.percentage < 0
            ? "text-red-700"
            : "text-slate-500"
        }`}
      >
        {isFutureMonth
          ? "UPCOMING"
          : `${month.percentage > 0 ? "+" : ""}${month.percentage.toFixed(
              1
            )}%`}
      </td>
    </tr>
  );
})}

      </tbody>
    </table>
  </div>
</section>

<section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
  <div className="border-b border-slate-200 px-5 py-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
      Odin Sales Intelligence
    </p>

    <h2 className="mt-1 text-lg font-bold text-slate-950">
      Customers Requiring Attention
    </h2>

    <p className="mt-1 text-sm text-slate-500">
      Customers currently down at least 10% against the same period last year,
      ranked by the largest sales shortfall.
    </p>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-5 py-3">Customer</th>
          <th className="px-5 py-3">This Year YTD</th>
          <th className="px-5 py-3">Last Year YTD</th>
          <th className="px-5 py-3">Change</th>
          <th className="px-5 py-3">Sales Gap</th>
          <th className="px-5 py-3">Last Invoice</th>
          <th className="px-5 py-3">Status</th>
        </tr>
      </thead>

      <tbody>
        {customersRequiringAttention.map((customer) => {
          const salesGap =
            customer.currentYearSales -
            customer.previousYearSales;

          return (
            <tr
              key={customer.id}
              className="border-t border-slate-100"
            >
              <td className="px-5 py-4 font-semibold text-slate-950">
                <Link
                  href={`/commercial/customers/${customer.id}?products=decline#product-performance`}
                  className="hover:text-amber-600 hover:underline"
                >
                  {customer.name}
                </Link>
              </td>

              <td className="px-5 py-4">
                {money(customer.currentYearSales)}
              </td>

              <td className="px-5 py-4">
                {money(customer.previousYearSales)}
              </td>

              <td className="px-5 py-4 font-semibold text-red-700">
                {customer.movementPercent.toFixed(1)}%
              </td>

              <td className="px-5 py-4 font-semibold text-red-700">
                {money(salesGap)}
              </td>
              <td className="px-5 py-4">
  {customer.lastInvoiceDate
    ? customer.lastInvoiceDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "No invoices"}
</td>

<td className="px-5 py-4">
  {customer.currentYearSales === 0 &&
  customer.previousYearSales > 0 ? (
    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      STOPPED BUYING
    </span>
  ) : (
    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
      DECLINING
    </span>
  )}
</td>

            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</section>

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


