import Link from "next/link";

import { createMeeting } from "@/app/actions/createMeeting";
import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

export default async function NewMeetingPage() {
  const {
    membership,
    companyId,
  } = await requireCompanyContext();

  if (!membership) {
    throw new Error(
      "No active company membership found."
    );
  }

  const [customers, teamMembers] =
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
      }),
    ]);

  const otherTeamMembers =
    teamMembers.filter(
      (teamMember) =>
        teamMember.id !== membership.id
    );

  return (
    <main className="space-y-6">
      <div>
        <Link
          href="/commercial/meetings"
          className="text-sm font-semibold text-amber-600 hover:text-amber-700"
        >
          ← Back to Meetings
        </Link>

        <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-amber-600">
          Odin Meetings
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          New Meeting
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Schedule a meeting and give Odin
          the information it needs to help
          you prepare.
        </p>
      </div>

      <form
        action={createMeeting}
        className="space-y-6"
      >
        <section className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-bold text-slate-950">
              Meeting Details
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Who are you meeting and when
              is it taking place?
            </p>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="title"
                className="text-sm font-semibold text-slate-700"
              >
                Meeting title
              </label>

              <input
                id="title"
                name="title"
                required
                placeholder="e.g. Huws Gray 2027 Trading Meeting"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              />
            </div>

            <div>
              <label
                htmlFor="customerId"
                className="text-sm font-semibold text-slate-700"
              >
                Customer
              </label>

              <select
                id="customerId"
                name="customerId"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              >
                <option value="">
                  No customer / internal meeting
                </option>

                {customers.map(
                  (customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name} (
                      {
                        customer.accountCode
                      }
                      )
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="meetingType"
                className="text-sm font-semibold text-slate-700"
              >
                Meeting type
              </label>

              <select
                id="meetingType"
                name="meetingType"
                defaultValue="CUSTOMER"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              >
                <option value="CUSTOMER">
                  Customer Meeting
                </option>
                <option value="SUPPLIER">
                  Supplier Meeting
                </option>
                <option value="INTERNAL">
                  Internal Meeting
                </option>
                <option value="TEAMS">
                  Teams / Video Meeting
                </option>
                <option value="SITE_VISIT">
                  Site Visit
                </option>
                <option value="OTHER">
                  Other
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="scheduledDate"
                className="text-sm font-semibold text-slate-700"
              >
                Date
              </label>

              <input
                id="scheduledDate"
                name="scheduledDate"
                type="date"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              />
            </div>

            <div>
              <label
                htmlFor="scheduledTime"
                className="text-sm font-semibold text-slate-700"
              >
                Time
              </label>

              <input
                id="scheduledTime"
                name="scheduledTime"
                type="time"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="location"
                className="text-sm font-semibold text-slate-700"
              >
                Location / Teams
              </label>

              <input
                id="location"
                name="location"
                placeholder="e.g. Teams, customer's office, Hetta Systems"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-bold text-slate-950">
              Internal Attendees
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              You will automatically be
              added as the organiser. Select
              anyone else from your team who
              will attend.
            </p>
          </div>

          <div className="p-6">
            {otherTeamMembers.length ===
            0 ? (
              <p className="text-sm text-slate-500">
                No other active team members
                are available.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {otherTeamMembers.map(
                  (teamMember) => (
                    <label
                      key={
                        teamMember.id
                      }
                      className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        name="internalMembershipId"
                        value={
                          teamMember.id
                        }
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />

                      <span>
                        <span className="block text-sm font-semibold text-slate-900">
                          {
                            teamMember
                              .user
                              .name
                          }
                        </span>

                        <span className="mt-0.5 block text-xs text-slate-500">
                          {teamMember
                            .role
                            ?.name ??
                            teamMember
                              .user
                              .email}
                        </span>
                      </span>
                    </label>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-bold text-slate-950">
              External Attendees
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add people outside your Odin
              team who will attend the
              meeting.
            </p>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="externalAttendeeName"
                className="text-sm font-semibold text-slate-700"
              >
                Name
              </label>

              <input
                id="externalAttendeeName"
                name="externalAttendeeName"
                placeholder="Attendee name"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              />
            </div>

            <div>
              <label
                htmlFor="externalAttendeeEmail"
                className="text-sm font-semibold text-slate-700"
              >
                Email
              </label>

              <input
                id="externalAttendeeEmail"
                name="externalAttendeeEmail"
                type="email"
                placeholder="name@company.co.uk"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-bold text-slate-950">
              Meeting Purpose
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Tell Odin what you want to
              discuss. This will eventually
              feed into your pre-meeting
              briefing.
            </p>
          </div>

          <div className="p-6">
            <label
              htmlFor="notes"
              className="text-sm font-semibold text-slate-700"
            >
              Preparation notes
            </label>

            <textarea
              id="notes"
              name="notes"
              rows={6}
              placeholder="e.g. Review 2026 performance, discuss 2027 agreement, identify branches with growth potential..."
              className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link
            href="/commercial/meetings"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Save Meeting
          </button>
        </div>
      </form>
    </main>
  );
}
