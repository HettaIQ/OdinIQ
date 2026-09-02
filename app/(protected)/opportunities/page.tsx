import Link from "next/link";

import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const user = await requireAuth();
  const membership = user.memberships[0];

  if (!membership) {
    throw new Error("No active company membership found.");
  }

  const opportunities = await prisma.commercialOpportunity.findMany({
    where: {
      companyId: membership.companyId,
    },
    include: {
      customer: true,
      owner: {
        include: {
          user: true,
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
        createdAt: "desc",
      },
    ],
  });

  const openOpportunities = opportunities.filter(
    (opportunity) => opportunity.status === "OPEN",
  );

  const totalPipelineValue = openOpportunities.reduce(
    (total, opportunity) => total + (opportunity.value ?? 0),
    0,
  );

  const weightedPipelineValue = openOpportunities.reduce(
    (total, opportunity) => {
      const value = opportunity.value ?? 0;
      const probability = opportunity.probability ?? 0;

      return total + value * (probability / 100);
    },
    0,
  );

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          Commercial Pipeline
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Opportunities
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Track commercial opportunities from identification through to close.
        </p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Open opportunities
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
            {openOpportunities.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pipeline value
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
            £
            {totalPipelineValue.toLocaleString("en-GB", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Weighted pipeline
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            £
            {weightedPipelineValue.toLocaleString("en-GB", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </p>
        </div>
      </div>

      {opportunities.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-950">
            No opportunities yet
          </p>

          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
            Commercial opportunities identified by your team or Odin will
            appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Opportunity
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Stage
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Value
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Probability
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Expected close
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Owner
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {opportunities.map((opportunity) => (
                  <tr key={opportunity.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                     <Link
  href={`/opportunities/${opportunity.id}`}
  className="font-semibold text-slate-950 hover:text-amber-600"
>
  {opportunity.title}
</Link>

                      {opportunity.description ? (
                        <p className="mt-1 max-w-md text-sm text-slate-500">
                          {opportunity.description}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/customers/${opportunity.customerId}`}
                        className="font-semibold text-slate-900 hover:text-amber-600"
                      >
                        {opportunity.customer.name}
                      </Link>
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                      {opportunity.stage.replaceAll("_", " ")}
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                      {opportunity.value !== null
                        ? `£${opportunity.value.toLocaleString("en-GB")}`
                        : "—"}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {opportunity.probability !== null
                        ? `${opportunity.probability}%`
                        : "—"}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {opportunity.expectedCloseDate
                        ? opportunity.expectedCloseDate.toLocaleDateString(
                            "en-GB",
                          )
                        : "—"}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {opportunity.owner?.user?.name ??
                        opportunity.owner?.user?.email ??
                        "Unassigned"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {opportunity.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}