import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{
    salesOrderNumber: string;
  }>;
};

async function updateInvestigation(formData: FormData) {
  "use server";

  const user = await requireAuth();
  const membership = user.memberships[0];

  if (!membership) {
    throw new Error("No active company membership found.");
  }

  const salesOrderNumber = String(
    formData.get("salesOrderNumber") ?? ""
  ).trim();

  const investigationStatus = String(
    formData.get("investigationStatus") ?? ""
  ).trim();

  const investigationNote = String(
    formData.get("investigationNote") ?? ""
  ).trim();

  if (!salesOrderNumber) {
    throw new Error("Sales Order number is required.");
  }

  await prisma.salesOrder.update({
    where: {
      companyId_salesOrderNumber: {
        companyId: membership.companyId,
        salesOrderNumber,
      },
    },
    data: {
      investigationStatus: investigationStatus || null,
      investigationNote: investigationNote || null,
      investigatedBy: user.name,
      investigatedAt: new Date(),
    },
  });

  revalidatePath(`/sales-orders/${salesOrderNumber}`);
  revalidatePath("/despatch-audit");
}

export default async function SalesOrderDetailPage({
  params,
}: PageProps) {
  const user = await requireAuth();
  const membership = user.memberships[0];

  if (!membership) {
    throw new Error("No active company membership found.");
  }

  const { salesOrderNumber } = await params;

  const salesOrder = await prisma.salesOrder.findFirst({
    where: {
      companyId: membership.companyId,
      salesOrderNumber,
    },
  });

  if (!salesOrder) {
    notFound();
  }

  const gdns = await prisma.goodsDespatchNote.findMany({
    where: {
      companyId: membership.companyId,
      salesOrderNumber,
    },
    include: {
      lines: true,
    },
    orderBy: {
      gdnDate: "asc",
    },
  });

  const invoices = await prisma.salesInvoice.findMany({
    where: {
      companyId: membership.companyId,
      salesOrderNumber,
    },
    orderBy: {
      invoiceDate: "asc",
    },
  });

  let resolvedCustomerAccountCode =
    salesOrder.customerAccountCode;

  if (!resolvedCustomerAccountCode) {
    resolvedCustomerAccountCode =
      gdns.find((gdn) => gdn.customerAccountCode)
        ?.customerAccountCode ?? null;
  }

  if (!resolvedCustomerAccountCode) {
    resolvedCustomerAccountCode =
      invoices.find((invoice) => invoice.customerAccountCode)
        ?.customerAccountCode ?? null;
  }

  if (
    !resolvedCustomerAccountCode &&
    salesOrder.customerName
  ) {
    const matchingCustomer = await prisma.customer.findFirst({
      where: {
        companyId: membership.companyId,
        name: salesOrder.customerName,
      },
      select: {
        accountCode: true,
      },
    });

    resolvedCustomerAccountCode =
      matchingCustomer?.accountCode ?? null;
  }

  const actualInvoices = invoices.filter((invoice) => {
    const invoiceType = String(
      invoice.invoiceType ?? ""
    )
      .trim()
      .toUpperCase();

    return !invoiceType || invoiceType === "INV";
  });

  const cancelledInvoices = invoices.filter((invoice) => {
    return (
      invoice.salesOrderNumber ===
        salesOrder.salesOrderNumber &&
      String(invoice.customerOrderNumber ?? "")
        .trim()
        .toLowerCase() === "cancelled"
    );
  });

  let status:
    | "NOT_DESPATCHED"
    | "DESPATCHED_NOT_INVOICED"
    | "INVOICED"
    | "CANCELLED";

  if (cancelledInvoices.length > 0) {
    status = "CANCELLED";
  } else if (gdns.length === 0) {
    status = "NOT_DESPATCHED";
  } else if (actualInvoices.length === 0) {
    status = "DESPATCHED_NOT_INVOICED";
  } else {
    status = "INVOICED";
  }

  function formatDate(value: Date | null) {
    if (!value) {
      return "-";
    }

    return new Intl.DateTimeFormat("en-GB").format(value);
  }

  function statusLabel() {
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

  function statusClass() {
    if (status === "INVOICED") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (status === "DESPATCHED_NOT_INVOICED") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (status === "CANCELLED") {
      return "border-slate-300 bg-slate-50 text-slate-700";
    }

    return "border-red-200 bg-red-50 text-red-700";
  }

  function statusBannerClass() {
    if (status === "NOT_DESPATCHED") {
      return "border-red-200 bg-red-50";
    }

    if (status === "DESPATCHED_NOT_INVOICED") {
      return "border-amber-200 bg-amber-50";
    }

    if (status === "CANCELLED") {
      return "border-slate-300 bg-slate-50";
    }

    return "border-emerald-200 bg-emerald-50";
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href="/despatch-audit"
        className="text-sm font-semibold text-amber-600 hover:text-amber-700"
      >
        ← Back to Despatch & Invoice Audit
      </Link>

      <div className="mt-6 flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
            Sales Order Audit
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Sales Order {salesOrder.salesOrderNumber}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            OdinIQ evidence trail for this Sales Order.
          </p>
        </div>

        <div
          className={`rounded-xl border px-4 py-3 text-sm font-bold ${statusClass()}`}
        >
          {statusLabel()}
        </div>
      </div>

      <div
        className={`mt-6 rounded-xl border p-5 ${statusBannerClass()}`}
      >
        {status === "NOT_DESPATCHED" && (
          <>
            <p className="font-bold text-red-700">
              Action required
            </p>

            <p className="mt-1 text-sm text-red-700">
              This Sales Order is still open and no Goods
              Despatch Note has been found. Check whether the
              order is awaiting stock, awaiting despatch,
              cancelled, or no longer required.
            </p>
          </>
        )}

        {status === "DESPATCHED_NOT_INVOICED" && (
          <>
            <p className="font-bold text-amber-700">
              Revenue at risk
            </p>

            <p className="mt-1 text-sm text-amber-700">
              Goods have been despatched but no matching Sales
              Invoice has been found. Check whether this order
              requires invoicing.
            </p>
          </>
        )}

        {status === "CANCELLED" && (
          <>
            <p className="font-bold text-slate-700">
              Order cancelled
            </p>

            <p className="mt-1 text-sm text-slate-600">
              This Sales Order was cancelled in Sage. No revenue
              is outstanding.
            </p>
          </>
        )}

        {status === "INVOICED" && (
          <>
            <p className="font-bold text-emerald-700">
              Transaction complete
            </p>

            <p className="mt-1 text-sm text-emerald-700">
              The Sales Order, Goods Despatch Note and Sales
              Invoice have been matched successfully.
            </p>
          </>
        )}
      </div>

      <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Investigation
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {status === "CANCELLED"
                ? "Record any useful context about this cancelled Sales Order without changing the Sage record."
                : "Record why this order is still outstanding without changing the Sage record."}
            </p>
          </div>

          {salesOrder.investigatedAt && (
            <div className="text-right text-xs text-slate-500">
              <p>
                Reviewed by{" "}
                {salesOrder.investigatedBy ?? "Unknown"}
              </p>

              <p>
                {new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(salesOrder.investigatedAt)}
              </p>
            </div>
          )}
        </div>

        <form
          action={updateInvestigation}
          className="mt-5 space-y-4"
        >
          <input
            type="hidden"
            name="salesOrderNumber"
            value={salesOrder.salesOrderNumber}
          />

          <div>
            <label
              htmlFor="investigationStatus"
              className="block text-sm font-semibold text-slate-700"
            >
              Investigation status
            </label>

            <select
              id="investigationStatus"
              name="investigationStatus"
              defaultValue={
                salesOrder.investigationStatus ?? ""
              }
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              key={
                salesOrder.investigationStatus ??
                "NOT_REVIEWED"
              }
            >
              <option value="">Not reviewed</option>
              <option value="AWAITING_STOCK">
                Awaiting stock
              </option>
              <option value="AWAITING_CUSTOMER">
                Awaiting customer instruction
              </option>
              <option value="FUTURE_DELIVERY">
                Future delivery
              </option>
              <option value="NEEDS_DESPATCH">
                Needs despatch
              </option>
              <option value="CANCELLED">
                Cancelled
              </option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="investigationNote"
              className="block text-sm font-semibold text-slate-700"
            >
              Investigation note
            </label>

            <textarea
              id="investigationNote"
              name="investigationNote"
              defaultValue={
                salesOrder.investigationNote ?? ""
              }
              rows={4}
              placeholder="Add any useful context..."
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Save investigation
          </button>
        </form>
      </section>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Customer
          </p>

          <p className="mt-2 font-semibold text-slate-950">
            {salesOrder.customerName ?? "-"}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Order Date
          </p>

          <p className="mt-2 font-semibold text-slate-950">
            {formatDate(salesOrder.orderDate)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Order Value
          </p>

          <p className="mt-2 font-semibold text-slate-950">
            £
            {Number(
              salesOrder.orderValue ?? 0
            ).toFixed(2)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Account
          </p>

          <p className="mt-2 font-semibold text-slate-950">
            {resolvedCustomerAccountCode ?? "-"}
          </p>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">
          Goods Despatch Notes
        </h2>

        {gdns.length === 0 ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            No Goods Despatch Note was found for this Sales
            Order.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {gdns.map((gdn) => (
              <div
                key={gdn.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <div>
                    <span className="font-semibold">
                      GDN:
                    </span>{" "}
                    {gdn.gdnNumber}
                  </div>

                  <div>
                    <span className="font-semibold">
                      Date:
                    </span>{" "}
                    {formatDate(gdn.gdnDate)}
                  </div>

                  <div>
                    <span className="font-semibold">
                      Lines:
                    </span>{" "}
                    {gdn.lines.length}
                  </div>
                </div>

                {gdn.lines.length > 0 && (
                  <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                    <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <div className="col-span-2">
                        Stock Code
                      </div>

                      <div className="col-span-6">
                        Description
                      </div>

                      <div className="col-span-2 text-right">
                        Ordered
                      </div>

                      <div className="col-span-2 text-right">
                        Despatched
                      </div>
                    </div>

                    {gdn.lines.map((line) => (
                      <div
                        key={line.id}
                        className="grid grid-cols-12 border-t border-slate-200 px-4 py-3 text-sm"
                      >
                        <div className="col-span-2 font-medium text-slate-950">
                          {line.stockCode ??
                            line.partNumber ??
                            "-"}
                        </div>

                        <div className="col-span-6 text-slate-700">
                          {line.description ?? "-"}
                        </div>

                        <div className="col-span-2 text-right text-slate-700">
                          {Number(
                            line.quantityOrdered ?? 0
                          )}
                        </div>

                        <div className="col-span-2 text-right font-semibold text-slate-950">
                          {Number(
                            line.quantityDespatched ?? 0
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">
          Sales Invoices
        </h2>

        {actualInvoices.length === 0 ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
            No matching Sales Invoice was found for this Sales
            Order.
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <div>Invoice</div>
              <div>Date</div>
              <div>Value</div>
            </div>

            {actualInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="grid grid-cols-3 border-t px-4 py-3 text-sm"
              >
                <div className="font-medium">
                  {invoice.invoiceNumber}
                </div>

                <div>
                  {formatDate(invoice.invoiceDate)}
                </div>

                <div>
                  £
                  {Number(
                    invoice.grossValue ?? 0
                  ).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}