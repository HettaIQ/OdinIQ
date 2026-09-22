import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";
import WarehousePhotoUpload from "./WarehousePhotoUpload";
import SalesOrderQrCode from "./SalesOrderQrCode";

type PageProps = {
  params: Promise<{
    salesOrderNumber: string;
  }>;
};

async function updateInvestigation(formData: FormData) {
  "use server";

  const {
    user,
    membership,
    companyId,
  } = await requireCompanyContext();

  const canManageAudit =
    user.platformRole === "SUPER_ADMIN" ||
    Boolean(
      membership.role?.permissions.some(
        ({ permission }) =>
          permission.key === "audit.manage"
      )
    );

  if (!canManageAudit) {
    throw new Error(
      "You do not have permission to manage despatch investigations."
    );
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
        companyId: companyId,
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


async function updateWarehouse(formData: FormData) {
  "use server";

  const {
    user,
    membership,
    companyId,
  } = await requireCompanyContext();

  const canDispatchStock =
    user.platformRole === "SUPER_ADMIN" ||
    Boolean(
      membership.role?.permissions.some(
        ({ permission }) =>
          permission.key === "stock.dispatch"
      )
    );

  if (!canDispatchStock) {
    throw new Error(
      "You do not have permission to update warehouse progress."
    );
  }

  const salesOrderNumber = String(
    formData.get("salesOrderNumber") ?? ""
  ).trim();

  const warehouseStatus = String(
    formData.get("warehouseStatus") ?? ""
  ).trim();

  const warehouseNote = String(
    formData.get("warehouseNote") ?? ""
  ).trim();

  const allowedStatuses = [
    "ORDER_RECEIVED",
    "PICKING",
    "PACKING",
    "READY_TO_DESPATCH",
    "DESPATCHED",
  ];

  if (!salesOrderNumber) {
    throw new Error("Sales Order number is required.");
  }

  if (!allowedStatuses.includes(warehouseStatus)) {
    throw new Error("Invalid warehouse status.");
  }

const existingOrder = await prisma.salesOrder.findFirst({
  where: {
    companyId: companyId,
    salesOrderNumber,
  },
});

if (!existingOrder) {
  throw new Error("Sales Order not found.");
}

const cancelledInvoice = await prisma.salesInvoice.findFirst({
  where: {
    companyId: companyId,
    salesOrderNumber,
    customerOrderNumber: "cancelled",
  },
});

if (cancelledInvoice) {
  throw new Error(
    "Warehouse progression is locked because this Sales Order is cancelled."
  );
}

  await prisma.salesOrder.update({
    where: {
      companyId_salesOrderNumber: {
        companyId: companyId,
        salesOrderNumber,
      },
    },
    data: {
      warehouseStatus,
      warehouseNote: warehouseNote || null,
      warehouseStatusBy: user.name,
      warehouseStatusAt: new Date(),
    },
  });

  revalidatePath(`/sales-orders/${salesOrderNumber}`);
  revalidatePath("/despatch-audit");
}

export default async function SalesOrderDetailPage({
  params,
}: PageProps) {
  const {
    user,
    membership,
    companyId,
  } = await requireCompanyContext();

  const canManageAudit =
    user.platformRole === "SUPER_ADMIN" ||
    Boolean(
      membership.role?.permissions.some(
        ({ permission }) =>
          permission.key === "audit.manage"
      )
    );

  const canDispatchStock =
    user.platformRole === "SUPER_ADMIN" ||
    Boolean(
      membership.role?.permissions.some(
        ({ permission }) =>
          permission.key === "stock.dispatch"
      )
    );

  const { salesOrderNumber } = await params;

  const salesOrder = await prisma.salesOrder.findFirst({
  where: {
    companyId: companyId,
    salesOrderNumber,
  },
  include: {
    warehousePhotos: {
      orderBy: {
        uploadedAt: "desc",
      },
    },
  },
});

  if (!salesOrder) {
    notFound();
  }

  const gdns = await prisma.goodsDespatchNote.findMany({
    where: {
      companyId: companyId,
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
      companyId: companyId,
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
        companyId: companyId,
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


  const warehouseStages = [
    { value: "ORDER_RECEIVED", label: "Order Received" },
    { value: "PICKING", label: "Picking" },
    { value: "PACKING", label: "Packing" },
    { value: "READY_TO_DESPATCH", label: "Ready to Despatch" },
    { value: "DESPATCHED", label: "Despatched" },
  ] as const;

  const currentWarehouseIndex = Math.max(
    0,
    warehouseStages.findIndex(
      (stage) => stage.value === salesOrder.warehouseStatus
    )
  );

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
    <main className="mx-auto max-w-6xl px-0 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
      <Link
        href="/despatch-audit"
        className="text-sm font-semibold text-amber-600 hover:text-amber-700"
      >
        ← Back to Despatch & Invoice Audit
      </Link>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
              Warehouse
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Warehouse Progress
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Track the physical progress of this order separately from the Sage
              despatch and invoice audit.
            </p>
          </div>

          {salesOrder.warehouseStatusAt && (
            <div className="text-right text-xs text-slate-500">
              <p>
                Last updated by{" "}
                <span className="font-semibold text-slate-700">
                  {salesOrder.warehouseStatusBy ?? "Unknown"}
                </span>
              </p>
              <p>
                {new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(salesOrder.warehouseStatusAt)}
              </p>
            </div>
          )}
        </div>

{status === "CANCELLED" && (
  <div className="mt-5 rounded-xl border border-slate-300 bg-slate-50 p-4">
    <p className="font-semibold text-slate-700">
      Warehouse progression locked
    </p>
    <p className="mt-1 text-sm text-slate-600">
      This Sales Order is cancelled in Sage and cannot be progressed
      through the warehouse.
    </p>
  </div>
)}

        <form action={updateWarehouse} className="mt-6">
          <input
            type="hidden"
            name="salesOrderNumber"
            value={salesOrder.salesOrderNumber}
          />

          <div className="grid gap-3 md:grid-cols-5">
            {warehouseStages.map((stage, index) => {
              const isCurrent =
                stage.value === salesOrder.warehouseStatus;
              const isComplete = index < currentWarehouseIndex;

              return (
                <button
                  key={stage.value}
                  type="submit"
                  name="warehouseStatus"
                  value={stage.value}
                  disabled={status === "CANCELLED" || !canDispatchStock}
                  className={`rounded-xl border px-4 py-4 text-left transition ${
                    isCurrent
                      ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                      : isComplete
                        ? "border-emerald-200 bg-emerald-50 hover:border-emerald-300"
                        : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50"
                 } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        isCurrent
                          ? "bg-amber-500 text-white"
                          : isComplete
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isComplete ? "✓" : index + 1}
                    </span>

                    <span
                      className={`text-sm font-semibold ${
                        isCurrent
                          ? "text-amber-800"
                          : isComplete
                            ? "text-emerald-800"
                            : "text-slate-700"
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>

                  {isCurrent && (
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                      Current stage
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <label
              htmlFor="warehouseNote"
              className="block text-sm font-semibold text-slate-700"
            >
              Warehouse note
            </label>

            <textarea
              id="warehouseNote"
              name="warehouseNote"
              defaultValue={salesOrder.warehouseNote ?? ""}
              rows={3}
              placeholder="Add packing, stock, delivery or warehouse information..."
              disabled={!canDispatchStock}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              Choose a warehouse stage above to save the stage and this note
              together.
            </p>
          </div>
                  </form>

          <div className="mt-6">
            <SalesOrderQrCode
              salesOrderNumber={salesOrder.salesOrderNumber}
            />
          </div>
        </section>

        <WarehousePhotoUpload
          salesOrderNumber={salesOrder.salesOrderNumber}
          disabled={status === "CANCELLED" || !canDispatchStock}
        />

        {salesOrder.warehousePhotos.length > 0 && (
          <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
                Evidence
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950">
                Warehouse Photos
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Photos recorded against this Sales Order during warehouse
                processing.
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {salesOrder.warehousePhotos.map((photo) => {
                const photoUrl = `/uploads/warehouse/${salesOrder.id}/${photo.fileName}`;

                const stageLabel =
                  warehouseStages.find(
                    (stage) =>
                      stage.value === photo.warehouseStage
                  )?.label ?? photo.warehouseStage;

                return (
                  <div
                    key={photo.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <a
                      href={photoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block bg-slate-100"
                    >
                      <img
                        src={photoUrl}
                        alt={
                          photo.note ||
                          `Warehouse evidence for Sales Order ${salesOrder.salesOrderNumber}`
                        }
                        className="h-56 w-full object-cover"
                      />
                    </a>

                    <div className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          {stageLabel}
                        </span>

                        <span className="text-xs text-slate-500">
                          {new Intl.DateTimeFormat("en-GB", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(photo.uploadedAt)}
                        </span>
                      </div>

                      {photo.note && (
                        <p className="mt-3 text-sm font-medium text-slate-800">
                          {photo.note}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-slate-500">
                        Uploaded by{" "}
                        <span className="font-semibold text-slate-700">
                          {photo.uploadedBy ?? "Unknown"}
                        </span>
                      </p>

                      <a
                        href={photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-sm font-semibold text-amber-700 hover:text-amber-800"
                      >
                        View full photo
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

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
              disabled={!canManageAudit}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
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
              disabled={!canManageAudit}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={!canManageAudit}
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
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


