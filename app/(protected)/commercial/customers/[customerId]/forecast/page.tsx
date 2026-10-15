
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";
import { getCustomerSalesForecast } from "@/lib/commercial/customerSalesForecast";
import {
  saveCustomerForecastAction,
  restoreCustomerForecastAction,
} from "../forecastActions";

type PageProps = {
  params: Promise<{
    customerId: string;
  }>;
  searchParams: Promise<{
    businessUnitId?: string;
  }>;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function formatDate(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function CustomerForecastPage({
  params,
  searchParams,
}: PageProps) {
  const { companyId, membership } =
    await requireCompanyContext();

  const { customerId } = await params;
  const { businessUnitId: requestedUnit } =
    await searchParams;

  const id = Number(customerId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    notFound();
  }

  const canViewForecast =
    membership.role?.permissions.some(
      (entry) =>
        entry.permission.key ===
          "commercial.forecast.view" ||
        entry.permission.key ===
          "commercial.forecast.manage"
    ) ?? false;
const canManageForecast =
  membership.role?.permissions.some(
    (entry) =>
      entry.permission.key ===
      "commercial.forecast.manage"
  ) ?? false;
  if (!canViewForecast) {
    notFound();
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id,
      companyId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!customer) {
    notFound();
  }

  const businessUnits =
    await prisma.businessUnit.findMany({
      where: {
        companyId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        type: true,
      },
      orderBy: {
        id: "asc",
      },
    });

  if (businessUnits.length === 0) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-bold">
          Management Forecast
        </h1>
        <p className="mt-4">
          No active business units are available.
        </p>
      </main>
    );
  }

  const requestedId = Number(requestedUnit);

  const selectedUnit =
    businessUnits.find(
      (unit) => unit.id === requestedId
    ) ??
    businessUnits.find(
      (unit) => unit.type === "MAIN"
    ) ??
    businessUnits[0];

  const today = new Date();
  const year = today.getFullYear();

  const forecast = await getCustomerSalesForecast({
    companyId,
    customerId: id,
    businessUnitId: selectedUnit.id,
    year,
    asOfDate: today,
  });

  const history =
    await prisma.salesForecastOverride.findMany({
      where: {
        companyId,
        customerId: forecast.customerId,
        businessUnitId: selectedUnit.id,
        forecastYear: year,
      },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: 50,
    });

  const userIds = [
    ...new Set(
      history.flatMap((record) => [
        record.createdByUserId,
        ...(record.deactivatedByUserId
          ? [record.deactivatedByUserId]
          : []),
      ])
    ),
  ];

  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const userNames = new Map(
    users.map((user) => [user.id, user.name])
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <Link
          href={`/commercial/customers/${id}`}
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to customer
        </Link>

        <p className="mt-5 text-xs font-bold uppercase tracking-wide text-violet-700">
          Restricted Commercial Information
        </p>

        <h1 className="mt-1 text-2xl font-bold text-slate-950">
          Management Forecast
        </h1>

        <p className="mt-1 text-slate-600">
          {forecast.customerName} · {year}
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">
          Business Unit
        </h2>

        <div className="mt-3 flex flex-wrap gap-2">
          {businessUnits.map((unit) => (
            <Link
              key={unit.id}
              href={`/commercial/customers/${id}/forecast?businessUnitId=${unit.id}`}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                selectedUnit.id === unit.id
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {unit.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Actual Sales",
            value: forecast.actualSales,
          },
          {
            label: "Automatic Forecast",
            value: forecast.automaticForecast,
          },
          {
            label: "Management Forecast",
            value: forecast.manualForecast,
          },
          {
            label: "Selected Annual Forecast",
            value: forecast.selectedForecast,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {item.label}
            </p>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              {item.value === null
                ? "Not set"
                : formatMoney(item.value)}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">
            Forecast Details
          </h2>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {forecast.forecastMethod}
          </span>
        </div>

        <dl className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">
              Projected Remaining Sales
            </dt>
            <dd className="font-semibold">
              {formatMoney(
                forecast.projectedRemainingSales
              )}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-slate-500">
              Forecast Year
            </dt>
            <dd className="font-semibold">
              {year}
            </dd>
          </div>

          <div className="md:col-span-2">
            <dt className="text-sm text-slate-500">
              Management Override Reason
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {forecast.overrideReason ??
                "Automatic forecast is currently in use."}
            </dd>
          </div>
        </dl>
      </section>

{canManageForecast && (
  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-5">
      <h2 className="text-lg font-semibold text-slate-950">
        Management Forecast Controls
      </h2>

      <p className="mt-1 text-sm text-slate-600">
        Set a management forecast for {selectedUnit.name}.
        All changes are recorded in the audit history.
      </p>
    </div>

    <form
      action={saveCustomerForecastAction.bind(null, id)}
      className="space-y-4"
    >
      <input
        type="hidden"
        name="businessUnitId"
        value={selectedUnit.id}
      />

      <input
        type="hidden"
        name="year"
        value={year}
      />

      <div>
        <label
          htmlFor="projectedAnnualSales"
          className="block text-sm font-semibold text-slate-700"
        >
          Projected Annual Sales (£)
        </label>

        <input
          id="projectedAnnualSales"
          name="projectedAnnualSales"
          type="number"
          min={Math.max(0, forecast.actualSales)}
          step="0.01"
          defaultValue={
            forecast.manualForecast ??
            forecast.automaticForecast
          }
          required
          className="mt-2 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-slate-950"
        />

        <p className="mt-1 text-xs text-slate-500">
          Cannot be lower than actual sales:
          {" "}
          {formatMoney(forecast.actualSales)}
        </p>
      </div>

      <div>
        <label
          htmlFor="forecastReason"
          className="block text-sm font-semibold text-slate-700"
        >
          Reason for Management Forecast
        </label>

        <textarea
          id="forecastReason"
          name="reason"
          minLength={10}
          maxLength={1000}
          rows={3}
          required
          placeholder="Explain why management expects sales to differ from the automatic forecast..."
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950"
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
      >
        Save Management Forecast
      </button>
    </form>

    {forecast.manualForecast !== null && (
      <div className="mt-8 border-t border-slate-200 pt-6">
        <h3 className="font-semibold text-slate-900">
          Restore Automatic Forecast
        </h3>

        <p className="mt-1 text-sm text-slate-600">
          Remove the active management override and
          return to the automatic forecast calculation.
        </p>

        <form
          action={restoreCustomerForecastAction.bind(
            null,
            id
          )}
          className="mt-4 space-y-4"
        >
          <input
            type="hidden"
            name="businessUnitId"
            value={selectedUnit.id}
          />

          <input
            type="hidden"
            name="year"
            value={year}
          />

          <div>
            <label
              htmlFor="restoreReason"
              className="block text-sm font-semibold text-slate-700"
            >
              Reason for Restoring Automatic Forecast
            </label>

            <textarea
              id="restoreReason"
              name="reason"
              minLength={10}
              maxLength={1000}
              rows={2}
              required
              placeholder="Explain why the automatic forecast is being restored..."
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            Restore Automatic Forecast
          </button>
        </form>
      </div>
    )}
  </section>
)}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Forecast Audit History
        </h2>

        {history.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No management forecast changes have been recorded.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {history.map((record) => (
              <div
                key={record.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <p className="font-semibold text-slate-950">
                    {formatMoney(
                      record.projectedAnnualSales
                    )}
                  </p>

                  <span className="text-xs font-semibold text-slate-600">
                    {record.isActive
                      ? "ACTIVE"
                      : "HISTORICAL"}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-600">
                  Created by{" "}
                  {userNames.get(
                    record.createdByUserId
                  ) ?? "Unknown user"}{" "}
                  on {formatDate(record.createdAt)}
                </p>

                <p className="mt-2 text-sm">
                  {record.reason ??
                    "No reason recorded."}
                </p>

                {!record.isActive && (
                  <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
                    <p>
                      Deactivated by:{" "}
                      {record.deactivatedByUserId
                        ? userNames.get(
                            record.deactivatedByUserId
                          ) ?? "Unknown user"
                        : "Not recorded"}
                    </p>

                    <p>
                      Date:{" "}
                      {formatDate(
                        record.deactivatedAt
                      )}
                    </p>

                    <p>
                      Reason:{" "}
                      {record.deactivationReason ??
                        "Not recorded"}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
