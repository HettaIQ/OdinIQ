import Link from "next/link";
import { notFound } from "next/navigation";

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

type OpportunityPageProps = {
  params: Promise<{
    opportunityId: string;
  }>;
};

export default async function OpportunityPage({
  params,
}: OpportunityPageProps) {
  const { companyId } = await requireCompanyContext();

  const { opportunityId } = await params;
  const id = Number(opportunityId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const opportunity =
    await prisma.commercialOpportunity.findFirst({
      where: {
        id,
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

        owner: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },

        agent: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },

        quoter: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

  if (!opportunity) {
    notFound();
  }

  const weightedValue =
    opportunity.value !== null &&
    opportunity.probability !== null
      ? opportunity.value *
        (opportunity.probability / 100)
      : null;

  const isOverdue =
    opportunity.status === "OPEN" &&
    opportunity.expectedCloseDate !== null &&
    opportunity.expectedCloseDate < new Date();

  return (
    <main className="mx-auto w-full max-w-7xl p-6">
      <div>
        <Link
          href="/commercial/opportunities"
          className="text-sm font-semibold text-amber-700 hover:text-amber-800"
        >
          ← Opportunities
        </Link>

        <p className="mt-5 text-xs font-bold uppercase tracking-wide text-amber-700">
          Commercial Opportunity
        </p>

        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">
              {opportunity.title}
            </h1>

            <Link
              href={`/commercial/customers/${opportunity.customer.id}`}
              className="mt-2 inline-block text-sm font-semibold text-amber-700 hover:text-amber-800"
            >
              {opportunity.customer.name}
            </Link>

            <p className="mt-1 text-xs text-slate-500">
              Account: {opportunity.customer.accountCode}
            </p>
          </div>

          <Link
  href={`/commercial/opportunities/${opportunity.id}/edit`}
  className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
>
  Edit Opportunity
</Link>

          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                opportunity.status === "OPEN"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {opportunity.status}
            </span>

            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              {opportunity.stage}
            </span>

            {isOverdue && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                OVERDUE
              </span>
            )}
          </div>
        </div>
      </div>

      {isOverdue && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="font-bold text-red-800">
            Odin Attention Required
          </p>

          <p className="mt-1 text-sm leading-6 text-red-700">
            This opportunity is still open but its
            expected close date has passed. Review the
            opportunity and update its stage, close date
            or status.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Opportunity Value
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {formatMoney(opportunity.value)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Probability
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {opportunity.probability !== null
              ? `${opportunity.probability}%`
              : "Not set"}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Weighted Value
          </p>

          <p className="mt-2 text-2xl font-bold text-amber-700">
            {formatMoney(weightedValue)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Expected Close
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${
              isOverdue
                ? "text-red-700"
                : "text-slate-950"
            }`}
          >
            {formatDate(opportunity.expectedCloseDate)}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Opportunity Details
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Description
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-700">
                {opportunity.description ||
                  "No description recorded."}
              </p>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Source
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {opportunity.source || "Not recorded"}
              </p>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Created
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatDate(opportunity.createdAt)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Ownership
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Owner
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {opportunity.owner?.user.name ||
                  opportunity.owner?.user.email ||
                  "Not assigned"}
              </p>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sales Agent
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {opportunity.agent?.user.name ||
                  opportunity.agent?.user.email ||
                  "Not assigned"}
              </p>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Quoter
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {opportunity.quoter?.user.name ||
                  opportunity.quoter?.user.email ||
                  "Not assigned"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
