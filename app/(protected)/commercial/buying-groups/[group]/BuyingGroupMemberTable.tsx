"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Trend =
  | "GROWING"
  | "DECLINING"
  | "FLAT"
  | "NO SALES";

export type BuyingGroupMemberRow = {
  id: number;
  name: string;
  accountCode: string;
  currentYearSales: number;
  previousYearSales: number;
  movementValue: number;
  movementPercent: number;
  lastInvoiceDate: string | null;
  trend: Trend;
};

type BuyingGroupMemberTableProps = {
  rows: BuyingGroupMemberRow[];
  currentYear: number;
  previousYear: number;
};

function money(value: number) {
  return value.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });
}

export default function BuyingGroupMemberTable({
  rows,
  currentYear,
  previousYear,
}: BuyingGroupMemberTableProps) {
  const [selectedStatus, setSelectedStatus] =
    useState("all");

  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const normalisedSearch = search
      .trim()
      .toLowerCase();

    return rows.filter((row) => {
      const matchesStatus =
        selectedStatus === "all" ||
        row.trend
          .toLowerCase()
          .replace(" ", "-") === selectedStatus;

      const matchesSearch =
        !normalisedSearch ||
        row.name
          .toLowerCase()
          .includes(normalisedSearch) ||
        row.accountCode
          .toLowerCase()
          .includes(normalisedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [rows, selectedStatus, search]);

  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-bold text-slate-950">
              Member Performance
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Ranked by biggest sales decline first.
            </p>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search customer or account..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500 sm:w-64"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["all", "All"],
            ["declining", "Declining"],
            ["growing", "Growing"],
            ["flat", "Flat"],
            ["no-sales", "No Sales"],
          ].map(([value, label]) => {
            const active =
              selectedStatus === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setSelectedStatus(value)
                }
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  active
                    ? "bg-amber-500 text-black"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-5 py-3 text-left">
                Customer
              </th>
              <th className="px-5 py-3 text-left">
                Account
              </th>
              <th className="px-5 py-3 text-right">
                {currentYear} YTD
              </th>
              <th className="px-5 py-3 text-right">
                {previousYear} YTD
              </th>
              <th className="px-5 py-3 text-right">
                Change
              </th>
              <th className="px-5 py-3 text-right">
                £ Difference
              </th>
              <th className="px-5 py-3 text-left">
                Last Invoice
              </th>
              <th className="px-5 py-3 text-left">
                Trend
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredRows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-100"
              >
                <td className="px-5 py-4 font-semibold">
                  <Link
                    href={`/commercial/customers/${row.id}`}
                    className="hover:text-amber-600 hover:underline"
                  >
                    {row.name}
                  </Link>
                </td>

                <td className="px-5 py-4">
                  {row.accountCode}
                </td>

                <td className="px-5 py-4 text-right font-semibold">
                  {money(row.currentYearSales)}
                </td>

                <td className="px-5 py-4 text-right">
                  {money(row.previousYearSales)}
                </td>

                <td
                  className={`px-5 py-4 text-right font-semibold ${
                    row.movementPercent > 0
                      ? "text-emerald-700"
                      : row.movementPercent < 0
                      ? "text-red-600"
                      : "text-slate-500"
                  }`}
                >
                  {row.movementPercent >= 0
                    ? "+"
                    : ""}
                  {row.movementPercent.toFixed(1)}%
                </td>

                <td
                  className={`px-5 py-4 text-right font-semibold ${
                    row.movementValue > 0
                      ? "text-emerald-700"
                      : row.movementValue < 0
                      ? "text-red-600"
                      : "text-slate-500"
                  }`}
                >
                  {row.movementValue >= 0
                    ? "+"
                    : ""}
                  {money(row.movementValue)}
                </td>

                <td className="px-5 py-4">
                  {row.lastInvoiceDate
                    ? new Date(
                        row.lastInvoiceDate
                      ).toLocaleDateString(
                        "en-GB",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )
                    : "No invoices"}
                </td>

                <td className="px-5 py-4">
                  <TrendBadge
                    trend={row.trend}
                  />
                </td>
              </tr>
            ))}

            {filteredRows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  No members match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrendBadge({
  trend,
}: {
  trend: Trend;
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