import Link from "next/link";
import { notFound } from "next/navigation";

import { updateOpportunity } from "@/app/actions/updateOpportunity";
import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

type EditOpportunityPageProps = {
  params: Promise<{
    opportunityId: string;
  }>;
};

function formatDateForInput(value: Date | null) {
  if (!value) {
    return "";
  }

  const year = value.getFullYear();
  const month = String(
    value.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    value.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function EditOpportunityPage({
  params,
}: EditOpportunityPageProps) {
  const { companyId } =
    await requireCompanyContext();

  const { opportunityId } = await params;
  const id = Number(opportunityId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const [opportunity, memberships] =
    await Promise.all([
      prisma.commercialOpportunity.findFirst({
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
        },
      }),

      prisma.companyMembership.findMany({
        where: {
          companyId,
          active: true,
          user: {
            active: true,
          },
        },

        select: {
          id: true,
          agentCode: true,

          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },

        orderBy: {
          user: {
            name: "asc",
          },
        },
      }),
    ]);

  if (!opportunity) {
    notFound();
  }

  const updateAction =
    updateOpportunity.bind(
      null,
      opportunity.id
    );

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <div>
        <Link
          href={`/commercial/opportunities/${opportunity.id}`}
          className="text-sm font-semibold text-amber-700 hover:text-amber-800"
        >
          ← Opportunity
        </Link>

        <p className="mt-5 text-xs font-bold uppercase tracking-wide text-amber-700">
          Commercial Opportunity
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Edit Opportunity
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          {opportunity.customer.name} ·{" "}
          {opportunity.customer.accountCode}
        </p>
      </div>

      <form
        action={updateAction}
        className="mt-8 space-y-6"
      >
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Opportunity Details
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="title"
                className="text-sm font-semibold text-slate-700"
              >
                Opportunity Title
              </label>

              <input
                id="title"
                name="title"
                type="text"
                required
                defaultValue={opportunity.title}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="description"
                className="text-sm font-semibold text-slate-700"
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                rows={5}
                defaultValue={
                  opportunity.description ?? ""
                }
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="stage"
                className="text-sm font-semibold text-slate-700"
              >
                Stage
              </label>

              <select
                id="stage"
                name="stage"
                defaultValue={opportunity.stage}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="QUALIFY">
                  Qualify
                </option>

                <option value="DEVELOP">
                  Develop
                </option>

                <option value="PROPOSE">
                  Propose
                </option>

                <option value="NEGOTIATE">
                  Negotiate
                </option>

                <option value="CLOSE">
                  Close
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="status"
                className="text-sm font-semibold text-slate-700"
              >
                Status
              </label>

              <select
                id="status"
                name="status"
                defaultValue={opportunity.status}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="OPEN">
                  Open
                </option>

                <option value="WON">
                  Won
                </option>

                <option value="LOST">
                  Lost
                </option>

                <option value="CANCELLED">
                  Cancelled
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="value"
                className="text-sm font-semibold text-slate-700"
              >
                Opportunity Value (£)
              </label>

              <input
                id="value"
                name="value"
                type="number"
                min="0"
                step="0.01"
                defaultValue={
                  opportunity.value ?? ""
                }
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="probability"
                className="text-sm font-semibold text-slate-700"
              >
                Probability (%)
              </label>

              <input
                id="probability"
                name="probability"
                type="number"
                min="0"
                max="100"
                step="1"
                defaultValue={
                  opportunity.probability ?? ""
                }
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="expectedCloseDate"
                className="text-sm font-semibold text-slate-700"
              >
                Expected Close Date
              </label>

              <input
                id="expectedCloseDate"
                name="expectedCloseDate"
                type="date"
                defaultValue={formatDateForInput(
                  opportunity.expectedCloseDate
                )}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Ownership
          </h2>

    

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div>
              <label
                htmlFor="ownerMembershipId"
                className="text-sm font-semibold text-slate-700"
              >
                Owner
              </label>

              <select
                id="ownerMembershipId"
                name="ownerMembershipId"
                defaultValue={
                  opportunity.ownerMembershipId ?? ""
                }
               
                className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700"
              >
                <option value="">
                  Not assigned
                </option>

                {memberships.map(
                  (membership) => (
                    <option
                      key={membership.id}
                      value={membership.id}
                    >
                      {membership.user.name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="agentMembershipId"
                className="text-sm font-semibold text-slate-700"
              >
                Sales Agent
              </label>

              <select
                id="agentMembershipId"
                name="agentMembershipId"
                defaultValue={
                  opportunity.agentMembershipId ?? ""
                }
               
                className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700"
              >
                <option value="">
                  Not assigned
                </option>

                {memberships.map(
                  (membership) => (
                    <option
                      key={membership.id}
                      value={membership.id}
                    >
                      {membership.user.name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="quoterMembershipId"
                className="text-sm font-semibold text-slate-700"
              >
                Quoter
              </label>

              <select
                id="quoterMembershipId"
                name="quoterMembershipId"
                defaultValue={
                  opportunity.quoterMembershipId ?? ""
                }
                
                className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700"
              >
                <option value="">
                  Not assigned
                </option>

                {memberships.map(
                  (membership) => (
                    <option
                      key={membership.id}
                      value={membership.id}
                    >
                      {membership.user.name}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link
            href={`/commercial/opportunities/${opportunity.id}`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="rounded-lg bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Save Opportunity
          </button>
        </div>
      </form>
    </main>
  );
}