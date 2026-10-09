import Link from "next/link";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

function formatMoney(value: number | null) {
  if (value === null) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Not set";
  }

  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function OpportunitiesPage() {
  const { companyId } = await requireCompanyContext();

  const opportunities =
    await prisma.commercialOpportunity.findMany({
      where: {
        companyId,
      },

      include: {
        customer: {
          select: {
            id: true,
            accountCode: true,
            name: true,
          },
        },
      },

      orderBy: [
        {
          status: "asc",
        },
        {
          expectedCloseDate: "asc",
        },
        {
          value: "desc",
        },
      ],
    });

  const openOpportunities = opportunities.filter(
    (opportunity) => opportunity.status === "OPEN"
  );

  const totalOpenValue = openOpportunities.reduce(
    (total, opportunity) =>
      total + (opportunity.value ?? 0),
    0
  );

  const weightedPipeline = openOpportunities.reduce(
    (total, opportunity) => {
      const value = opportunity.value ?? 0;
      const probability = opportunity.probability ?? 0;

      return total + value * (probability / 100);
    },
    0
  );

  return (
    <main className="mx-auto w-full max-w-7xl p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/commercial"
            className="text-sm font-semibold text-amber-700 hover:text-amber-800"
          >
            ← Commercial
          </Link>

          <p className="mt-5 text-xs font-bold uppercase tracking-wide text-amber-700">
            Commercial Intelligence
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Opportunities
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Track customer opportunities, pipeline value,
            probability and expected close dates.
          </p>
           </div>

    <Link
      href="/commercial/opportunities/new"
      className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
    >
      + New Opportunity
    </Link>
  </div>

  <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Open Opportunities
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
            {openOpportunities.length}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Open Pipeline
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
            {formatMoney(totalOpenValue)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Weighted Pipeline
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-700">
            {formatMoney(weightedPipeline)}
          </p>
        </div>
      </div>

      <section className="mt-8 rounded-xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-bold text-slate-950">
            Commercial Pipeline
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            All commercial opportunities recorded in Odin.
          </p>
        </div>

        {opportunities.length > 0 ? (
          <div className="divide-y">
            {opportunities.map((opportunity) => (
              <div
                key={opportunity.id}
                className="p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          opportunity.status === "OPEN"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {opportunity.status}
                      </span>

                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                        {opportunity.stage}
                      </span>
                    </div>

                    <Link
  href={`/commercial/opportunities/${opportunity.id}`}
  className="mt-3 block text-lg font-bold text-slate-950 hover:text-amber-700"
>
  {opportunity.title}
</Link>

                    <Link
                      href={`/commercial/customers/${opportunity.customer.id}`}
                      className="mt-1 inline-block text-sm font-semibold text-amber-700 hover:text-amber-800"
                    >
                      {opportunity.customer.name}
                    </Link>

                    <p className="mt-1 text-xs text-slate-500">
                      Account:{" "}
                      {opportunity.customer.accountCode}
                    </p>

                    {opportunity.description && (
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                        {opportunity.description}
                      </p>
                    )}
                  </div>

                  <div className="grid shrink-0 grid-cols-2 gap-4 sm:grid-cols-3 lg:min-w-[430px]">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Value
                      </p>

                      <p className="mt-1 font-bold text-slate-950">
                        {formatMoney(opportunity.value)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Probability
                      </p>

                      <p className="mt-1 font-bold text-slate-950">
                        {opportunity.probability !== null
                          ? `${opportunity.probability}%`
                          : "Not set"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Expected Close
                      </p>

                      <p className="mt-1 font-bold text-slate-950">
                        {formatDate(
                          opportunity.expectedCloseDate
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="font-semibold text-slate-700">
              No commercial opportunities recorded yet.
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Opportunities created for customers will
              appear here.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}