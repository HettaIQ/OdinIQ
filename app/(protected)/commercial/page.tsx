import Link from "next/link";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

export default async function CommercialPage() {
  const {
    companyId,
  } = await requireCompanyContext();

  const latestSalesOrderBatch =
    await prisma.salesOrder.aggregate({
      where: {
        companyId,
      },
      _max: {
        importedAt: true,
      },
    });

  const latestImportedAt =
    latestSalesOrderBatch._max.importedAt;

  const salesOrders =
    latestImportedAt
      ? await prisma.salesOrder.findMany({
          where: {
            companyId,
            importedAt:
              latestImportedAt,
          },
        })
      : [];

  const gdns =
    await prisma.goodsDespatchNote.findMany({
      where: {
        companyId,
      },
    });

  const invoices =
    await prisma.salesInvoice.findMany({
      where: {
        companyId,
      },
    });

  const gdnSalesOrderNumbers =
    new Set(
      gdns
        .map(
          (gdn) =>
            gdn.salesOrderNumber
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
    );

  const invoiceSalesOrderNumbers =
    new Set(
      invoices
        .filter((invoice) => {
          const invoiceType =
            String(
              invoice.invoiceType ??
                ""
            )
              .trim()
              .toUpperCase();

          return (
            !invoiceType ||
            invoiceType === "INV"
          );
        })
        .map(
          (invoice) =>
            invoice.salesOrderNumber
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
    );

  const notDespatched =
    salesOrders.filter(
      (order) =>
        !gdnSalesOrderNumbers.has(
          order.salesOrderNumber
        )
    );

  const despatchedNotInvoiced =
    salesOrders.filter(
      (order) =>
        gdnSalesOrderNumbers.has(
          order.salesOrderNumber
        ) &&
        !invoiceSalesOrderNumbers.has(
          order.salesOrderNumber
        )
    );

  const invoiced =
    salesOrders.filter(
      (order) =>
        gdnSalesOrderNumbers.has(
          order.salesOrderNumber
        ) &&
        invoiceSalesOrderNumbers.has(
          order.salesOrderNumber
        )
    );

  const reviewedNotDespatched =
    notDespatched.filter(
      (order) =>
        Boolean(
          order.investigationStatus
        )
    );

  const unreviewedNotDespatched =
    notDespatched.length -
    reviewedNotDespatched.length;

  return (
    <main className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          Commercial Intelligence
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Commercial
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Monitor commercial performance, identify risks and manage the key
          controls that protect revenue and margin.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/despatch-audit"
          className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            Sales & Despatch
          </p>

          <h2 className="mt-2 text-xl font-bold text-slate-950">
            Despatch & Invoice Audit
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Despatched / Not Invoiced
              </p>

              <p className="mt-1 text-2xl font-bold text-amber-700">
                {
                  despatchedNotInvoiced.length
                }
              </p>
            </div>

            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                Not Despatched
              </p>

              <p className="mt-1 text-2xl font-bold text-red-700">
                {
                  notDespatched.length
                }
              </p>
            </div>

            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Invoiced
              </p>

              <p className="mt-1 text-2xl font-bold text-emerald-700">
                {
                  invoiced.length
                }
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Review Progress
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {
                  reviewedNotDespatched.length
                }{" "}
                reviewed ·{" "}
                {
                  unreviewedNotDespatched
                }{" "}
                to review
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-amber-600">
            Open audit →
          </p>
        </Link>

        <Link
          href="/commercial/customers"
          className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            Customer Intelligence
          </p>

          <h2 className="mt-2 text-xl font-bold text-slate-950">
            Customer Performance
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Review customer sales, account activity, buying groups and commercial
            performance from imported Sage history.
          </p>

          <p className="mt-4 text-sm font-semibold text-amber-600">
            Open customer performance →
          </p>
        </Link>

        <div className="rounded-xl border border-dashed bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Coming next
          </p>

          <h2 className="mt-2 text-xl font-bold text-slate-700">
            Margin & Pricing
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Pricing, discounts, rebates and effective commercial margin
            analysis.
          </p>
        </div>
      </div>
    </main>
  );
}