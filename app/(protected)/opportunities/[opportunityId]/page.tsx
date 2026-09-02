import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { updateOpportunity } from "@/app/actions/updateOpportunity";

type OpportunityPageProps = {
  params: Promise<{
    opportunityId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function OpportunityPage({
  params,
}: OpportunityPageProps) {
  const user = await requireAuth();
  const membership = user.memberships[0];

  if (!membership) {
    throw new Error("No active company membership found.");
  }

  const { opportunityId } = await params;
  const id = Number(opportunityId);

  if (!Number.isInteger(id)) {
    notFound();
  }

  const opportunity = await prisma.commercialOpportunity.findFirst({
    where: {
      id,
      companyId: membership.companyId,
    },
    include: {
  customer: true,

  owner: {
    include: {
      user: true,
    },
  },

  agent: {
    include: {
      user: true,
    },
  },

  quoter: {
    include: {
      user: true,
    },
  },
},
  });

  if (!opportunity) {
    notFound();
  }
const companyMembers = await prisma.companyMembership.findMany({
  where: {
    companyId: membership.companyId,
    active: true,
  },
  include: {
    user: true,
    role: true,
  },
  orderBy: {
    user: {
      name: "asc",
    },
  },
});
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <Link
        href="/opportunities"
        className="text-sm font-semibold text-amber-600 hover:text-amber-700"
      >
        ← Back to opportunities
      </Link>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          Commercial Opportunity
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          {opportunity.title}
        </h1>

        <Link
          href={`/customers/${opportunity.customerId}`}
          className="mt-2 inline-block font-semibold text-slate-600 hover:text-amber-600"
        >
          {opportunity.customer.name}
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Stage
          </p>
          <p className="mt-2 text-xl font-bold text-slate-950">
            {opportunity.stage.replaceAll("_", " ")}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Value
          </p>
          <p className="mt-2 text-xl font-bold text-slate-950">
            {opportunity.value !== null
              ? `£${opportunity.value.toLocaleString("en-GB")}`
              : "Not set"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Probability
          </p>
          <p className="mt-2 text-xl font-bold text-slate-950">
            {opportunity.probability !== null
              ? `${opportunity.probability}%`
              : "Not set"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Status
          </p>
          <p className="mt-2 text-xl font-bold text-white">
            {opportunity.status}
          </p>
        </div>
      </div>

<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
    Edit opportunity
  </p>

  <h2 className="mt-1 text-xl font-bold text-slate-950">
    Commercial details
  </h2>

  <form
    action={async (formData) => {
      "use server";
      await updateOpportunity(opportunity.id, formData);
    }}
    className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
  >
    <div>
      <label className="text-sm font-semibold text-slate-700">
        Stage
      </label>

      <select
      key={opportunity.stage}
        name="stage"
        defaultValue={opportunity.stage}
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="QUALIFY">Qualify</option>
        <option value="DEVELOP">Develop</option>
        <option value="QUOTED">Quoted</option>
        <option value="NEGOTIATION">Negotiation</option>
        <option value="WON">Won</option>
        <option value="LOST">Lost</option>
      </select>
    </div>

    <div>
      <label className="text-sm font-semibold text-slate-700">
        Value
      </label>

      <input
        type="number"
        name="value"
        step="0.01"
        defaultValue={opportunity.value ?? ""}
        placeholder="0.00"
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label className="text-sm font-semibold text-slate-700">
        Probability %
      </label>

      <input
        type="number"
        name="probability"
        min="0"
        max="100"
        defaultValue={opportunity.probability ?? ""}
        placeholder="0"
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label className="text-sm font-semibold text-slate-700">
        Expected close date
      </label>

      <input
        type="date"
        name="expectedCloseDate"
        defaultValue={
          opportunity.expectedCloseDate
            ? opportunity.expectedCloseDate.toISOString().slice(0, 10)
            : ""
        }
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>

<div>
  <label className="text-sm font-semibold text-slate-700">
    Sales Agent
  </label>

  <select
    name="agentMembershipId"
    defaultValue={opportunity.agentMembershipId ?? ""}
    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
  >
    <option value="">Unassigned</option>

    {companyMembers
  .filter((member) => member.role?.name === "Sales Agent")
  .map((member) => (
      <option key={member.id} value={member.id}>
        {member.user.name ?? member.user.email}
      </option>
    ))}
  </select>
</div>

<div>
  <label className="text-sm font-semibold text-slate-700">
    Quoter
  </label>

  <select
    name="quoterMembershipId"
    defaultValue={opportunity.quoterMembershipId ?? ""}
    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
  >
    <option value="">Unassigned</option>

    {companyMembers
  .filter((member) => member.role?.name === "Quoting Team")
  .map((member) => (
      <option key={member.id} value={member.id}>
        {member.user.name ?? member.user.email}
      </option>
    ))}
  </select>
</div>

    <div className="md:col-span-2 xl:col-span-4">
      <button
        type="submit"
        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Save opportunity
      </button>
    </div>
  </form>
</section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            Opportunity details
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-950">
            Commercial overview
          </h2>

          <div className="mt-6 space-y-5 text-sm">
            <div>
              <p className="font-semibold text-slate-500">Description</p>
              <p className="mt-1 text-slate-900">
                {opportunity.description ?? "No description added yet."}
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-500">Expected close date</p>
              <p className="mt-1 text-slate-900">
                {opportunity.expectedCloseDate
                  ? opportunity.expectedCloseDate.toLocaleDateString("en-GB")
                  : "Not set"}
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-500">Source</p>
              <p className="mt-1 text-slate-900">
                {opportunity.source?.replaceAll("_", " ") ?? "Not set"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            Ownership
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-950">
            Opportunity owner
          </h2>

          <p className="mt-5 text-sm text-slate-700">
            {opportunity.owner?.user?.name ??
              opportunity.owner?.user?.email ??
              "Unassigned"}
          </p>
        </section>
      </div>
    </main>
  );
}