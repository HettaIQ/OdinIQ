import Link from "next/link";

import { createOpportunity } from "@/app/actions/createOpportunity";
import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

export default async function NewOpportunityPage() {
  const { companyId } =
    await requireCompanyContext();

  const [customers, memberships] =
    await Promise.all([
      prisma.customer.findMany({
        where: {
          companyId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          accountCode: true,
          name: true,
        },
        orderBy: {
          name: "asc",
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

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
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

        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          New Opportunity
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Record a new commercial opportunity and assign
          responsibility for progressing it.
        </p>
      </div>

      <form
        action={createOpportunity}
        className="mt-8 space-y-6"
      >
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Customer & Opportunity
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="customerId"
                className="text-sm font-semibold text-slate-700"
              >
                Customer
              </label>

              <select
                id="customerId"
                name="customerId"
                required
                defaultValue=""
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="" disabled>
                  Select customer
                </option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.name} ·{" "}
                    {customer.accountCode}
                  </option>
                ))}
              </select>
            </div>

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
                placeholder="e.g. Expand MLCP range across branches"
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
                placeholder="Add the commercial background, opportunity and next steps..."
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
                defaultValue="QUALIFY"
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
                defaultValue="OPEN"
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
                placeholder="0.00"
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
                placeholder="0"
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
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="source"
                className="text-sm font-semibold text-slate-700"
              >
                Source
              </label>

              <select
                id="source"
                name="source"
                defaultValue="MANUAL"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="MANUAL">
                  Manual
                </option>
                <option value="MEETING">
                  Meeting
                </option>
                <option value="PHONE">
                  Phone
                </option>
                <option value="EMAIL">
                  Email
                </option>
                <option value="CUSTOMER_VISIT">
                  Customer Visit
                </option>
                <option value="VOICE_NOTE">
                  Voice Note
                </option>
                <option value="ODIN">
                  Odin Intelligence
                </option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Ownership
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Assign responsibility for developing and
            quoting the opportunity.
          </p>

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
                defaultValue=""
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="">
                  Not assigned
                </option>

                {memberships.map((membership) => (
                  <option
                    key={membership.id}
                    value={membership.id}
                  >
                    {membership.user.name}
                  </option>
                ))}
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
                defaultValue=""
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="">
                  Not assigned
                </option>

                {memberships.map((membership) => (
                  <option
                    key={membership.id}
                    value={membership.id}
                  >
                    {membership.user.name}
                    {membership.agentCode
                      ? ` · ${membership.agentCode}`
                      : ""}
                  </option>
                ))}
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
                defaultValue=""
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="">
                  Not assigned
                </option>

                {memberships.map((membership) => (
                  <option
                    key={membership.id}
                    value={membership.id}
                  >
                    {membership.user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link
            href="/commercial/opportunities"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="rounded-lg bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Create Opportunity
          </button>
        </div>
      </form>
    </main>
  );
}