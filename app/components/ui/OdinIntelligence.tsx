import Link from "next/link";

import type {
  CommercialIntelligenceSignal,
} from "@/lib/odin/commercialIntelligence";

type OdinIntelligenceProps = {
  signals: CommercialIntelligenceSignal[];
};

function formatDate(date?: Date) {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getSignalStyle(
  signal: CommercialIntelligenceSignal
) {
  if (signal.severity === "HIGH") {
    return {
      badge:
        "border-red-900/70 bg-red-950/60 text-red-300",
      label: "High priority",
      accent: "border-l-red-500",
    };
  }

  if (signal.severity === "POSITIVE") {
    return {
      badge:
        "border-emerald-900/70 bg-emerald-950/60 text-emerald-300",
      label: "Opportunity",
      accent: "border-l-emerald-500",
    };
  }

  return {
    badge:
      "border-amber-900/70 bg-amber-950/60 text-amber-300",
    label: "Attention",
    accent: "border-l-amber-500",
  };
}

function getSignalTypeLabel(
  signal: CommercialIntelligenceSignal
) {
  switch (signal.type) {
    case "SALES_DECLINE":
      return "Sales decline";

    case "SALES_GROWTH":
      return "Sales growth";

    case "DORMANT_CUSTOMER":
      return "Dormant customer";

    default:
      return "Commercial signal";
  }
}

export default function OdinIntelligence({
  signals,
}: OdinIntelligenceProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-sm">
      <div className="border-b border-slate-800 px-6 py-5">
        <p className="text-sm font-semibold text-amber-400">
          Odin Intelligence
        </p>

        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Recommended commercial actions
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Priority signals based on your
              company&apos;s sales and customer
              activity.
            </p>
          </div>

          <span className="whitespace-nowrap rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300">
            {signals.length} active{" "}
            {signals.length === 1
              ? "signal"
              : "signals"}
          </span>
        </div>
      </div>

      {signals.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="mx-auto max-w-lg">
            <h3 className="text-lg font-semibold text-white">
              No commercial insights yet
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Odin will analyse your sales,
              customers, products, pricing and
              commercial activity as data becomes
              available.
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Recommended actions and
              opportunities will appear here when
              Odin identifies something that needs
              your attention.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-800">
          {signals.map((signal) => {
            const style =
              getSignalStyle(signal);

            const lastInvoiceDate =
              formatDate(
                signal.lastInvoiceDate
              );

            return (
              <div
                key={signal.id}
                className={`border-l-4 px-6 py-5 transition hover:bg-slate-900/70 ${style.accent}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${style.badge}`}
                      >
                        {style.label}
                      </span>

                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {getSignalTypeLabel(
                          signal
                        )}
                      </span>
                    </div>

                    <h3 className="mt-3 text-base font-semibold text-white">
                      {signal.title}
                    </h3>

                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
                      {signal.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                      <span>
                        Account:{" "}
                        {
                          signal.customerAccountCode
                        }
                      </span>

                      {lastInvoiceDate && (
                        <span>
                          Last invoice:{" "}
                          {lastInvoiceDate}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Link
                      href={`/customers/${encodeURIComponent(
                        signal.customerAccountCode
                      )}`}
                      className="inline-flex rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:border-amber-500 hover:text-amber-400"
                    >
                      View customer
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-slate-800 bg-slate-900/60 px-6 py-4">
        <p className="text-xs text-slate-500">
          Odin Intelligence analyses only the
          currently selected company&apos;s
          commercial data.
        </p>
      </div>
    </section>
  );
}