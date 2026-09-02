"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AuditResult = {
  salesOrderNumber: string;
  orderDate?: string | null;
  customerAccountCode?: string | null;
  customerName?: string | null;
  orderValue?: number | null;
  gdnFound: boolean;
  gdnNumbers: string[];
  invoiceFound: boolean;
  invoiceNumbers: string[];

  investigationStatus?: string | null;
  investigationNote?: string | null;
  investigatedBy?: string | null;
  investigatedAt?: string | null;

  status:
    | "NOT_DESPATCHED"
    | "DESPATCHED_NOT_INVOICED"
    | "INVOICED"
    | "CANCELLED";
};

type AuditResponse = {
  success: boolean;
  totalOrders: number;
  latestSalesOrderImport?: string | null;
  latestGdnImport?: string | null;
  latestInvoiceImport?: string | null;
  results: AuditResult[];
};

type AuditFilter =
  | "ALL"
  | "DESPATCHED_NOT_INVOICED"
  | "NOT_DESPATCHED"
  | "UNREVIEWED"
  | "INVOICED"
  | "CANCELLED";

export default function DespatchAuditPage() {
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<AuditFilter>("ALL");

  useEffect(() => {
    async function loadAudit() {
      try {
        const response = await fetch("/api/despatch-audit");

        if (!response.ok) {
          setError(true);
          return;
        }

        const data = await response.json();
        setAudit(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadAudit();
  }, []);

  function formatMoney(value: number) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  function statusLabel(status: AuditResult["status"]) {
    if (status === "NOT_DESPATCHED") {
      return "NOT DESPATCHED";
    }

    if (status === "DESPATCHED_NOT_INVOICED") {
      return "DESPATCHED / NOT INVOICED";
    }

    if (status === "CANCELLED") {
      return "CANCELLED";
    }

    return "INVOICED";
  }

  function statusClass(status: AuditResult["status"]) {
    if (status === "INVOICED") {
      return "text-green-700";
    }

    if (status === "DESPATCHED_NOT_INVOICED") {
      return "text-amber-600";
    }

    if (status === "CANCELLED") {
      return "text-slate-500";
    }

    return "text-red-600";
  }

  const sortedResults = audit
    ? [...audit.results].sort((a, b) => {
        const priority = {
          DESPATCHED_NOT_INVOICED: 0,
          NOT_DESPATCHED: 1,
          INVOICED: 2,
          CANCELLED: 3,
        };

        return priority[a.status] - priority[b.status];
      })
    : [];

  const displayedResults =
    filter === "ALL"
      ? sortedResults
      : filter === "UNREVIEWED"
      ? sortedResults.filter(
          (row) =>
            row.status === "NOT_DESPATCHED" &&
            !row.investigationStatus
        )
      : sortedResults.filter((row) => row.status === filter);

  const despatchedNotInvoiced = sortedResults.filter(
    (row) => row.status === "DESPATCHED_NOT_INVOICED"
  );

  const cancelled = sortedResults.filter(
    (row) => row.status === "CANCELLED"
  );

  const cancelledValue = cancelled.reduce(
    (sum, row) => sum + (row.orderValue ?? 0),
    0
  );

  const notDespatched = sortedResults.filter(
    (row) => row.status === "NOT_DESPATCHED"
  );

  const invoiced = sortedResults.filter(
    (row) => row.status === "INVOICED"
  );

  const despatchedNotInvoicedValue = despatchedNotInvoiced.reduce(
    (sum, row) => sum + Number(row.orderValue ?? 0),
    0
  );

  const notDespatchedValue = notDespatched.reduce(
    (sum, row) => sum + Number(row.orderValue ?? 0),
    0
  );

  const reviewedNotDespatched = notDespatched.filter(
    (row) => Boolean(row.investigationStatus)
  );

  const unreviewedNotDespatched =
    notDespatched.length - reviewedNotDespatched.length;

  function formatRefreshDate(value?: string | null) {
    if (!value) {
      return "Not imported";
    }

    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function freshnessClass(value?: string | null) {
    if (!value) {
      return "border-slate-200 bg-slate-50 text-slate-700";
    }

    const imported = new Date(value);
    const now = new Date();

    const importedDay = new Date(
      imported.getFullYear(),
      imported.getMonth(),
      imported.getDate()
    );

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const ageInDays =
      (today.getTime() - importedDay.getTime()) /
      (1000 * 60 * 60 * 24);

    if (ageInDays <= 0) {
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    }

    if (ageInDays <= 1) {
      return "border-amber-200 bg-amber-50 text-amber-800";
    }

    return "border-red-200 bg-red-50 text-red-800";
  }

  function isStale(value?: string | null) {
    if (!value) {
      return true;
    }

    const imported = new Date(value);
    const now = new Date();

    const importedDay = new Date(
      imported.getFullYear(),
      imported.getMonth(),
      imported.getDate()
    );

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const ageInDays =
      (today.getTime() - importedDay.getTime()) /
      (1000 * 60 * 60 * 24);

    return ageInDays >= 2;
  }

  const staleSources = audit
    ? [
        isStale(audit.latestSalesOrderImport)
          ? "Sales Orders"
          : null,
        isStale(audit.latestGdnImport)
          ? "GDN data"
          : null,
        isStale(audit.latestInvoiceImport)
          ? "Invoice data"
          : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Despatch & Invoice Audit
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          OdinIQ checks Sales Orders against Goods Despatch Notes and Sales
          Invoices to identify missing transactions.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Audit results
          </h2>

          {audit && (
            <span className="text-sm text-gray-500">
              {audit.totalOrders} order
              {audit.totalOrders === 1 ? "" : "s"} checked
            </span>
          )}
        </div>

        {staleSources.length > 0 && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
            <p className="font-semibold">
              Audit data may be incomplete
            </p>

            <p className="mt-1 text-sm">
              Refresh the following Sage data before relying on these audit
              results: {staleSources.join(", ")}.
            </p>
          </div>
        )}

        {audit && (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div
              className={`rounded-lg border px-4 py-3 ${freshnessClass(
                audit.latestSalesOrderImport
              )}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sales Orders refreshed
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatRefreshDate(audit.latestSalesOrderImport)}
              </p>
            </div>

            <div
              className={`rounded-lg border px-4 py-3 ${freshnessClass(
                audit.latestGdnImport
              )}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                GDN data refreshed
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatRefreshDate(audit.latestGdnImport)}
              </p>
            </div>

            <div
              className={`rounded-lg border px-4 py-3 ${freshnessClass(
                audit.latestInvoiceImport
              )}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Invoice data refreshed
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatRefreshDate(audit.latestInvoiceImport)}
              </p>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Import Centre
              </p>

              <div className="mt-2 flex flex-wrap gap-3">
                <Link
                  href="/sales-order-import"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Import Sales Orders
                </Link>

                <Link
                  href="/gdn-import"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Import GDNs
                </Link>

                <Link
                  href="/sales-invoice-import"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Import Invoices
                </Link>
              </div>
            </div>
          </div>
        )}

        {audit && (
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <button
              type="button"
              onClick={() =>
                setFilter(
                  filter === "DESPATCHED_NOT_INVOICED"
                    ? "ALL"
                    : "DESPATCHED_NOT_INVOICED"
                )
              }
              className={`rounded-xl border p-5 text-left transition hover:shadow-md ${
                filter === "DESPATCHED_NOT_INVOICED"
                  ? "border-amber-500 bg-amber-100 ring-2 ring-amber-300"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Despatched / Not Invoiced
              </p>

              <p className="mt-2 text-3xl font-bold text-amber-700">
                {despatchedNotInvoiced.length}
              </p>

              <p className="mt-1 text-sm font-semibold text-amber-700">
                {formatMoney(despatchedNotInvoicedValue)} at risk
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setFilter(
                  filter === "NOT_DESPATCHED"
                    ? "ALL"
                    : "NOT_DESPATCHED"
                )
              }
              className={`rounded-xl border p-5 text-left transition hover:shadow-md ${
                filter === "NOT_DESPATCHED"
                  ? "border-red-500 bg-red-100 ring-2 ring-red-300"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                Not Despatched
              </p>

              <p className="mt-2 text-3xl font-bold text-red-700">
                {notDespatched.length}
              </p>

              <p className="mt-1 text-sm font-semibold text-red-700">
                {formatMoney(notDespatchedValue)} open
              </p>

              <div className="mt-1 flex items-center gap-2 text-sm text-red-700">
                <span>
                  {reviewedNotDespatched.length} reviewed ·
                </span>

                <span
                  onClick={(event) => {
                    event.stopPropagation();
                    setFilter("UNREVIEWED");
                  }}
                  className="cursor-pointer font-semibold underline underline-offset-2 hover:text-red-900"
                >
                  {unreviewedNotDespatched} to review
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setFilter(
                  filter === "INVOICED"
                    ? "ALL"
                    : "INVOICED"
                )
              }
              className={`rounded-xl border p-5 text-left transition hover:shadow-md ${
                filter === "INVOICED"
                  ? "border-emerald-500 bg-emerald-100 ring-2 ring-emerald-300"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Invoiced
              </p>

              <p className="mt-2 text-3xl font-bold text-emerald-700">
                {invoiced.length}
              </p>

              <p className="mt-1 text-sm font-semibold text-emerald-700">
                Completed
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setFilter(
                  filter === "CANCELLED"
                    ? "ALL"
                    : "CANCELLED"
                )
              }
              className={`rounded-xl border p-5 text-left transition hover:shadow-md ${
                filter === "CANCELLED"
                  ? "border-slate-500 bg-slate-100 ring-2 ring-slate-300"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Cancelled
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-700">
                {cancelled.length}
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-600">
                {formatMoney(cancelledValue)} original order value
              </p>
            </button>
          </div>
        )}

        {loading && (
          <p className="mt-4 text-sm text-gray-500">
            OdinIQ is auditing Sales Orders...
          </p>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600">
            OdinIQ could not run the despatch audit.
          </p>
        )}

        {!loading && !error && audit && (
          <div className="mt-4 overflow-hidden rounded-lg border">
            <div className="grid grid-cols-7 gap-4 bg-gray-50 px-4 py-3 text-sm font-semibold">
              <div>Sales Order</div>
              <div>Customer</div>
              <div>Value</div>
              <div>GDN</div>
              <div>Invoice</div>
              <div>Investigation</div>
              <div>Status</div>
            </div>

            {displayedResults.map((row) => (
              <div
                key={row.salesOrderNumber}
                className="grid grid-cols-7 gap-4 border-t px-4 py-4 text-sm"
              >
                <div className="font-medium">
                  <Link
                    href={`/sales-orders/${row.salesOrderNumber}`}
                    className="text-slate-900 underline-offset-4 hover:text-amber-600 hover:underline"
                  >
                    {row.salesOrderNumber}
                  </Link>
                </div>

                <div>
                  <div>{row.customerName ?? "-"}</div>

                  {row.customerAccountCode && (
                    <div className="mt-1 text-xs font-semibold text-slate-500">
                      {row.customerAccountCode}
                    </div>
                  )}
                </div>

                <div>
                  £{Number(row.orderValue ?? 0).toFixed(2)}
                </div>

                <div>
                  {row.gdnFound
                    ? row.gdnNumbers.join(", ")
                    : "Missing"}
                </div>

                <div>
                  {row.invoiceFound
                    ? row.invoiceNumbers.join(", ")
                    : "Missing"}
                </div>

                <div>
                  {row.investigationStatus === "AWAITING_STOCK" && (
                    <span className="font-semibold text-amber-700">
                      Awaiting stock
                    </span>
                  )}

                  {row.investigationStatus === "AWAITING_CUSTOMER" && (
                    <span className="font-semibold text-amber-700">
                      Awaiting customer
                    </span>
                  )}

                  {row.investigationStatus === "FUTURE_DELIVERY" && (
                    <span className="font-semibold text-blue-700">
                      Future delivery
                    </span>
                  )}

                  {row.investigationStatus === "NEEDS_DESPATCH" && (
                    <span className="font-semibold text-red-700">
                      Needs despatch
                    </span>
                  )}

                  {row.investigationStatus === "CANCELLED" && (
                    <span className="font-semibold text-slate-500">
                      Cancelled
                    </span>
                  )}

                  {row.investigationStatus === "OTHER" && (
                    <span className="font-semibold text-slate-700">
                      Other
                    </span>
                  )}

                  {!row.investigationStatus &&
                    row.status === "NOT_DESPATCHED" && (
                      <Link
                        href={`/sales-orders/${row.salesOrderNumber}`}
                        className="font-semibold text-red-600 hover:text-red-800 hover:underline"
                      >
                        Review now →
                      </Link>
                    )}

                  {!row.investigationStatus &&
                    row.status === "DESPATCHED_NOT_INVOICED" && (
                      <span className="text-slate-400">
                        Not reviewed
                      </span>
                    )}

                  {!row.investigationStatus &&
                    row.status === "INVOICED" && (
                      <span className="text-slate-400">
                        —
                      </span>
                    )}
                </div>

                <div
                  className={`font-semibold ${statusClass(
                    row.status
                  )}`}
                >
                  {statusLabel(row.status)}
                </div>
              </div>
            ))}

            {displayedResults.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No Sales Orders match this filter.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}