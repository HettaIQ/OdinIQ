import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function money(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function percentage(value: number | null) {
  if (value === null) return "—";

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(1)}%`;
}

export default async function PurchaseIntelligencePage() {
  const { companyId } = await requireCompanyContext();

  /*
   * Use the latest purchase-order date in OdinIQ rather
   * than today's date. This means the dashboard compares
   * equivalent periods based on the data actually imported.
   */
  const latestOrder = await prisma.purchaseOrder.findFirst({
    where: {
      companyId,
      orderDate: {
        not: null,
      },
    },
    orderBy: {
      orderDate: "desc",
    },
    select: {
      orderDate: true,
    },
  });

  const latestDate = latestOrder?.orderDate ?? new Date();

  const currentYear = latestDate.getUTCFullYear();
  const previousYear = currentYear - 1;

  const latestMonth = latestDate.getUTCMonth();
  const latestDay = latestDate.getUTCDate();

  /*
   * Pull the two comparison years.
   * We calculate spend from the PO lines because this gives
   * us the product-level intelligence needed later.
   */
  const lines = await prisma.purchaseOrderLine.findMany({
    where: {
      purchaseOrder: {
        companyId,
        orderDate: {
          gte: new Date(
            Date.UTC(previousYear, 0, 1)
          ),
          lte: new Date(
            Date.UTC(
              currentYear,
              latestMonth,
              latestDay,
              23,
              59,
              59
            )
          ),
        },
      },
    },
    select: {
      netValue: true,
      purchaseOrder: {
        select: {
          orderDate: true,
        },
      },
    },
  });

  const monthly = MONTHS.map((month, monthIndex) => {
    let previous = 0;
    let current = 0;

    for (const line of lines) {
      const date = line.purchaseOrder.orderDate;

      if (!date) continue;

      const year = date.getUTCFullYear();
      const lineMonth = date.getUTCMonth();
      const day = date.getUTCDate();

      if (lineMonth !== monthIndex) continue;

      /*
       * For the current partial month, compare the previous
       * year only up to the same day.
       *
       * Example:
       * 1-16 Sep 2026 vs 1-16 Sep 2025.
       */
      if (
        monthIndex === latestMonth &&
        year === previousYear &&
        day > latestDay
      ) {
        continue;
      }

      const value = line.netValue ?? 0;

      if (year === previousYear) {
        previous += value;
      }

      if (year === currentYear) {
        current += value;
      }
    }

    const difference = current - previous;

    const change =
      previous !== 0
        ? (difference / previous) * 100
        : current !== 0
          ? null
          : 0;

    return {
      month,
      monthIndex,
      previous,
      current,
      difference,
      change,
    };
  });

  /*
   * Only include months reached in the current year's data
   * in the YTD cards.
   */
  const ytdRows = monthly.filter(
    (row) => row.monthIndex <= latestMonth
  );

  const previousYtd = ytdRows.reduce(
    (total, row) => total + row.previous,
    0
  );

  const currentYtd = ytdRows.reduce(
    (total, row) => total + row.current,
    0
  );

  const ytdDifference = currentYtd - previousYtd;

  const ytdChange =
    previousYtd !== 0
      ? (ytdDifference / previousYtd) * 100
      : null;

  const purchaseOrderCount =
    await prisma.purchaseOrder.count({
      where: { companyId },
    });

  const purchaseLineCount =
    await prisma.purchaseOrderLine.count({
      where: {
        purchaseOrder: {
          companyId,
        },
      },
    });

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-slate-500">
          Commercial Intelligence
        </p>

        <h1 className="text-3xl font-bold tracking-tight">
          Purchase Intelligence
        </h1>

        <p className="mt-2 text-slate-600">
          Monthly purchase performance comparing {currentYear}
          {" "}with {previousYear}.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              Comparison period
            </p>

            <p className="text-sm text-slate-500">
              January to {MONTHS[latestMonth]} {latestDay}
            </p>
          </div>

          <div className="text-right text-sm text-slate-500">
            Latest purchase data
            <div className="font-semibold text-slate-900">
              {latestDay} {MONTHS[latestMonth]} {currentYear}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            {currentYear} YTD Spend
          </p>

          <p className="mt-2 text-3xl font-semibold">
            {money(currentYtd)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            {previousYear} Same Period
          </p>

          <p className="mt-2 text-3xl font-semibold">
            {money(previousYtd)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Spend Difference
          </p>

          <p className="mt-2 text-3xl font-semibold">
            {money(ytdDifference)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            YTD Change
          </p>

          <p className="mt-2 text-3xl font-semibold">
            {percentage(ytdChange)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold">
            Monthly Purchase Spend
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {currentYear} compared with the equivalent period
            in {previousYear}.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-5 py-3 font-semibold">
                  Month
                </th>

                <th className="px-5 py-3 text-right font-semibold">
                  {previousYear}
                </th>

                <th className="px-5 py-3 text-right font-semibold">
                  {currentYear}
                </th>

                <th className="px-5 py-3 text-right font-semibold">
                  Difference
                </th>

                <th className="px-5 py-3 text-right font-semibold">
                  Change
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {monthly.map((row) => {
                const futureMonth =
                  row.monthIndex > latestMonth;

                return (
                  <tr
                    key={row.month}
                    className={
                      futureMonth
                        ? "text-slate-400"
                        : ""
                    }
                  >
                    <td className="px-5 py-3 font-medium">
                      {row.month}
                      {row.monthIndex === latestMonth && (
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          to {latestDay}th
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {futureMonth
                        ? "—"
                        : money(row.previous)}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {futureMonth
                        ? "—"
                        : money(row.current)}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {futureMonth
                        ? "—"
                        : money(row.difference)}
                    </td>

                    <td className="px-5 py-3 text-right font-medium">
                      {futureMonth
                        ? "—"
                        : percentage(row.change)}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot className="border-t bg-slate-50 font-semibold">
              <tr>
                <td className="px-5 py-4">
                  YTD Total
                </td>

                <td className="px-5 py-4 text-right">
                  {money(previousYtd)}
                </td>

                <td className="px-5 py-4 text-right">
                  {money(currentYtd)}
                </td>

                <td className="px-5 py-4 text-right">
                  {money(ytdDifference)}
                </td>

                <td className="px-5 py-4 text-right">
                  {percentage(ytdChange)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Purchase Orders Imported
          </p>

          <p className="mt-2 text-2xl font-semibold">
            {purchaseOrderCount.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Purchase Lines Imported
          </p>

          <p className="mt-2 text-2xl font-semibold">
            {purchaseLineCount.toLocaleString()}
          </p>
        </div>
      </div>
    </main>
  );
}