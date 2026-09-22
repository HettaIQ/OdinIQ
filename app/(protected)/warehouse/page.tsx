import Link from "next/link";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

const warehouseStages = [
  {
    value: "ORDER_RECEIVED",
    label: "Order Received",
    description: "Waiting to be picked",
  },
  {
    value: "PICKING",
    label: "Picking",
    description: "Currently being picked",
  },
  {
    value: "PACKING",
    label: "Packing",
    description: "Currently being packed",
  },
  {
    value: "READY_TO_DESPATCH",
    label: "Ready to Despatch",
    description: "Packed and waiting to leave",
  },
  {
    value: "DESPATCHED",
    label: "Despatched",
    description: "Completed by warehouse",
  },
] as const;

function warehouseLabel(status: string) {
  return (
    warehouseStages.find((stage) => stage.value === status)?.label ??
    status
  );
}

function warehouseStageClass(status: string) {
  switch (status) {
    case "ORDER_RECEIVED":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "PICKING":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "PACKING":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "READY_TO_DESPATCH":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "DESPATCHED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function formatDate(date: Date | null) {
  if (!date) {
    return "Not updated";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatOrderDate(date: Date | null) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatMoney(value: number | null) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

export default async function WarehousePage() {
  const {
    companyId,
  } = await requireCompanyContext();

  const orders = await prisma.salesOrder.findMany({
  where: {
    companyId,
    warehouseActive: true,
  },
  orderBy: [
      {
        warehouseStatusAt: "desc",
      },
      {
        orderDate: "desc",
      },
    ],
  });

  /*
   * A Sales Order is treated as cancelled when Sage has an invoice
   * record for that Sales Order with customerOrderNumber = "cancelled".
   *
   * We keep those orders out of the active warehouse workload.
   */
  const cancelledInvoices = await prisma.salesInvoice.findMany({
    where: {
      companyId,
      customerOrderNumber: {
        not: null,
      },
    },
    select: {
      salesOrderNumber: true,
      customerOrderNumber: true,
    },
  });

  const cancelledSalesOrders = new Set(
    cancelledInvoices
      .filter(
        (invoice) =>
          invoice.customerOrderNumber?.trim().toLowerCase() ===
          "cancelled"
      )
      .map((invoice) => invoice.salesOrderNumber)
      .filter((value): value is string => Boolean(value))
  );

  const activeOrders = orders.filter(
    (order) => !cancelledSalesOrders.has(order.salesOrderNumber)
  );

  const stageCounts = Object.fromEntries(
    warehouseStages.map((stage) => [
      stage.value,
      activeOrders.filter(
        (order) => order.warehouseStatus === stage.value
      ).length,
    ])
  );

  const outstandingOrders = activeOrders.filter(
    (order) => order.warehouseStatus !== "DESPATCHED"
  );

  return (
    <main className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">
          Operations
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Warehouse
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Live warehouse workload from Sales Order receipt through to
          despatch. Open an order to update its progress, add notes and
          record photo evidence.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {warehouseStages.map((stage) => (
          <div
            key={stage.value}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${warehouseStageClass(
                stage.value
              )}`}
            >
              {stage.label}
            </div>

            <p className="mt-5 text-4xl font-bold tracking-tight text-slate-950">
              {stageCounts[stage.value] ?? 0}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {stage.description}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
                Active Workload
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950">
                Orders in the Warehouse
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Cancelled and completed warehouse orders are excluded
                from this working list.
              </p>
            </div>

            <div className="text-sm font-semibold text-slate-600">
              {outstandingOrders.length} active{" "}
              {outstandingOrders.length === 1 ? "order" : "orders"}
            </div>
          </div>
        </div>

        {outstandingOrders.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-semibold text-slate-700">
              No active warehouse orders
            </p>

            <p className="mt-1 text-sm text-slate-500">
              New Sales Orders will appear here automatically.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-4 font-semibold">
                      Sales Order
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Customer
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Order Date
                    </th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Value
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Warehouse Stage
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Last Updated
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {outstandingOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/sales-orders/${order.salesOrderNumber}`}
                          className="font-bold text-amber-700 hover:text-amber-800 hover:underline"
                        >
                          {order.salesOrderNumber}
                        </Link>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">
                          {order.customerName || "Unknown customer"}
                        </p>

                        {order.customerAccountCode && (
                          <p className="mt-1 text-xs text-slate-500">
                            {order.customerAccountCode}
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                        {formatOrderDate(order.orderDate)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-slate-900">
                        {formatMoney(order.orderValue)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${warehouseStageClass(
                            order.warehouseStatus
                          )}`}
                        >
                          {warehouseLabel(order.warehouseStatus)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <p className="whitespace-nowrap text-sm text-slate-600">
                          {formatDate(order.warehouseStatusAt)}
                        </p>

                        {order.warehouseStatusBy && (
                          <p className="mt-1 text-xs text-slate-500">
                            by {order.warehouseStatusBy}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-200 md:hidden">
              {outstandingOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/sales-orders/${order.salesOrderNumber}`}
                  className="block p-5 transition hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Sales Order
                      </p>

                      <p className="mt-1 text-lg font-bold text-amber-700">
                        {order.salesOrderNumber}
                      </p>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${warehouseStageClass(
                        order.warehouseStatus
                      )}`}
                    >
                      {warehouseLabel(order.warehouseStatus)}
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="font-semibold text-slate-900">
                      {order.customerName || "Unknown customer"}
                    </p>

                    {order.customerAccountCode && (
                      <p className="mt-1 text-xs text-slate-500">
                        {order.customerAccountCode}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">
                        Order Date
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {formatOrderDate(order.orderDate)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Order Value
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatMoney(order.orderValue)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    Last updated {formatDate(order.warehouseStatusAt)}
                    {order.warehouseStatusBy
                      ? ` by ${order.warehouseStatusBy}`
                      : ""}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
