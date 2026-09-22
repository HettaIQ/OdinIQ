import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

type InvoiceDetailPageProps = {
  params: Promise<{
    customerId: string;
    invoiceNumber: string;
  }>;
};

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const {
    membership,
    companyId,
  } = await requireCompanyContext();

  if (!membership) {
    throw new Error("No active company membership found.");
  }

  const isAgent =
    membership.role?.name === "Agent" ||
    membership.role?.name === "Sales Agent";

  const { customerId, invoiceNumber } = await params;
  const id = Number(customerId);

  if (!Number.isInteger(id)) {
    notFound();
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id,
      companyId,
      ...(isAgent
        ? {
            assignedMembershipId: membership.id,
          }
        : {}),
    },
  });

  if (!customer) {
    notFound();
  }

  const invoice = await prisma.salesInvoice.findFirst({
    where: {
      companyId,
      invoiceNumber,
      customerAccountCode: customer.accountCode,
    },
    include: {
      lines: true,

      creditedInvoice: {
        select: {
          id: true,
          invoiceNumber: true,
          customerAccountCode: true,
        },
      },

      creditNotes: {
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          grossValue: true,
          customerAccountCode: true,
        },
        orderBy: {
          invoiceDate: "asc",
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  const goodsDespatchNotes = invoice.salesOrderNumber
    ? await prisma.goodsDespatchNote.findMany({
        where: {
          companyId,
          salesOrderNumber: invoice.salesOrderNumber,
        },
        include: {
          lines: true,
        },
        orderBy: {
          gdnDate: "asc",
        },
      })
    : [];

  function formatMoney(value: number | null | undefined) {
    return Number(value ?? 0).toLocaleString("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatDate(value: Date | null | undefined) {
    if (!value) {
      return "—";
    }

    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
    }).format(value);
  }

  const type = String(invoice.invoiceType ?? "")
    .trim()
    .toUpperCase();

  const isCredit =
    type === "CRD" ||
    type === "CREDIT" ||
    type.includes("CREDIT NOTE");

  /*
   * Prefer the proper database relationship.
   *
   * creditedInvoiceNumber remains useful if the
   * original invoice has not yet been imported.
   */
  const creditedInvoiceNumber =
    invoice.creditedInvoice?.invoiceNumber ??
    invoice.creditedInvoiceNumber ??
    null;

  return (
    <main className="space-y-6">
      <div>
        <Link
          href={`/commercial/customers/${customer.id}`}
          className="text-sm font-semibold text-amber-600 hover:text-amber-700"
        >
          ← Back to {customer.name}
        </Link>

        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-amber-600">
          Sales Intelligence
        </p>

        <div className="mt-1 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">
              {isCredit ? "Credit" : "Invoice"} {invoice.invoiceNumber}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {customer.name} · Sage account {customer.accountCode}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              isCredit
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {isCredit ? "CREDIT" : "INVOICE"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Invoice Date
          </p>

          <p className="mt-2 text-lg font-bold text-slate-950">
            {formatDate(invoice.invoiceDate)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Net
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {formatMoney(invoice.netValue)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            VAT
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {formatMoney(invoice.vatValue)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Gross
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {formatMoney(invoice.grossValue)}
          </p>
        </div>
      </div>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          {isCredit ? "Credit details" : "Invoice details"}
        </h2>

        <div className="mt-5 grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-slate-500">
              {isCredit ? "Credit number" : "Invoice number"}
            </p>

            <p className="mt-1 font-semibold text-slate-950">
              {invoice.invoiceNumber}
            </p>
          </div>

          <div>
            <p className="text-slate-500">Sales order</p>

            {invoice.salesOrderNumber ? (
              <Link
                href={`/sales-orders/${invoice.salesOrderNumber}`}
                className="mt-1 inline-block font-semibold text-slate-950 hover:text-amber-600 hover:underline"
              >
                {invoice.salesOrderNumber}
              </Link>
            ) : (
              <p className="mt-1 font-semibold text-slate-950">
                —
              </p>
            )}
          </div>

          <div>
            <p className="text-slate-500">Invoice type</p>

            <p className="mt-1 font-semibold text-slate-950">
              {invoice.invoiceType || "Inv"}
            </p>
          </div>

          {isCredit && (
            <div>
              <p className="text-slate-500">Credits invoice</p>

              {creditedInvoiceNumber ? (
                <Link
                  href={`/commercial/customers/${customer.id}/invoices/${creditedInvoiceNumber}`}
                  className="mt-1 inline-flex items-center gap-1 font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                >
                  {creditedInvoiceNumber}
                  <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <p className="mt-1 font-semibold text-slate-950">
                  —
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {!isCredit && invoice.creditNotes.length > 0 && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                Credit activity
              </p>

              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                {invoice.creditNotes.length === 1
                  ? "This invoice has been credited"
                  : "This invoice has multiple credits"}
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                {invoice.creditNotes.length === 1
                  ? "A Sage credit note is linked to this invoice."
                  : `${invoice.creditNotes.length} Sage credit notes are linked to this invoice.`}
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-red-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Credit
                  </th>

                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Date
                  </th>

                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    Gross
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {invoice.creditNotes.map((credit) => (
                  <tr key={credit.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/commercial/customers/${customer.id}/invoices/${credit.invoiceNumber}`}
                        className="font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                      >
                        {credit.invoiceNumber}
                      </Link>
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(credit.invoiceDate)}
                    </td>

                    <td className="px-4 py-3 text-right font-semibold text-red-700">
                      {formatMoney(credit.grossValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-950">
            {isCredit
              ? "Products Credited"
              : "Products Despatched Against This Invoice"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {isCredit
              ? "Product detail taken directly from the Sage credit note."
              : `Product detail taken from Goods Despatch Notes linked to Sales Order ${
                  invoice.salesOrderNumber ?? "—"
                }.`}
          </p>
        </div>

        {isCredit ? (
          invoice.lines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-600">
                      Stock Code
                    </th>

                    <th className="px-6 py-3 text-left font-semibold text-slate-600">
                      Description
                    </th>

                    <th className="px-6 py-3 text-right font-semibold text-slate-600">
                      Quantity
                    </th>

                    <th className="px-6 py-3 text-right font-semibold text-slate-600">
                      Net
                    </th>

                    <th className="px-6 py-3 text-right font-semibold text-slate-600">
                      VAT
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {invoice.lines.map((line) => {
                    const memoMatch =
                      line.stockCode?.trim().toUpperCase() === "M"
                        ? line.description?.match(
                            /Credit Against Inv\s+(\d+)/i
                          )
                        : null;

                    const memoInvoiceNumber =
                      memoMatch?.[1] ?? null;

                    return (
                      <tr key={line.id}>
                        <td className="px-6 py-4 font-medium text-slate-950">
                          {line.stockCode ?? "—"}
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          {memoInvoiceNumber ? (
                            <>
                              Credit Against Inv{" "}
                              <Link
                                href={`/commercial/customers/${customer.id}/invoices/${memoInvoiceNumber}`}
                                className="font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                              >
                                {memoInvoiceNumber}
                              </Link>
                            </>
                          ) : (
                            line.description ?? "—"
                          )}
                        </td>

                        <td className="px-6 py-4 text-right text-slate-700">
                          {Number(line.quantity ?? 0)}
                        </td>

                        <td className="px-6 py-4 text-right font-medium text-slate-950">
                          {formatMoney(line.netValue)}
                        </td>

                        <td className="px-6 py-4 text-right text-slate-700">
                          {formatMoney(line.vatValue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-6 text-sm text-slate-500">
              No product lines were imported for this credit note.
            </div>
          )
        ) : goodsDespatchNotes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">
                    GDN
                  </th>

                  <th className="px-6 py-3 text-left font-semibold text-slate-600">
                    Date
                  </th>

                  <th className="px-6 py-3 text-left font-semibold text-slate-600">
                    Stock Code
                  </th>

                  <th className="px-6 py-3 text-left font-semibold text-slate-600">
                    Description
                  </th>

                  <th className="px-6 py-3 text-right font-semibold text-slate-600">
                    Despatched
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {goodsDespatchNotes.flatMap((gdn) =>
                  gdn.lines.map((line) => (
                    <tr key={`${gdn.id}-${line.id}`}>
                      <td className="px-6 py-4 font-medium text-slate-950">
                        {gdn.gdnNumber}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {formatDate(gdn.gdnDate)}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {line.stockCode ?? line.partNumber ?? "—"}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {line.description ?? "—"}
                      </td>

                      <td className="px-6 py-4 text-right font-medium text-slate-950">
                        {Number(line.quantityDespatched ?? 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-6 text-sm text-slate-500">
            No Goods Despatch Notes were found for this invoice.
          </div>
        )}
      </section>
    </main>
  );
}


