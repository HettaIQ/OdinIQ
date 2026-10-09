import Link from "next/link";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

export default async function MeetingsPage() {
  const { companyId } = await requireCompanyContext();

  const now = new Date();

  const [
    upcomingMeetings,
    recentMeetings,
    openActions,
    meetingCount,
  ] = await Promise.all([
    prisma.meeting.findMany({
      where: {
        companyId,
        status: "PLANNED",
        scheduledAt: {
          gte: now,
        },
      },
      include: {
        customer: true,
        attendees: true,
        actions: true,
      },
      orderBy: {
        scheduledAt: "asc",
      },
      take: 5,
    }),

    prisma.meeting.findMany({
      where: {
        companyId,
        OR: [
          {
            status: "COMPLETED",
          },
          {
            endedAt: {
              not: null,
            },
          },
        ],
      },
      include: {
        customer: true,
        attendees: true,
        actions: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
    }),

    prisma.meetingAction.findMany({
      where: {
        meeting: {
          companyId,
        },
        status: "OPEN",
      },
      include: {
        meeting: {
          include: {
            customer: true,
          },
        },
        assignedMembership: {
          include: {
            user: true,
          },
        },
      },
      orderBy: [
        {
          dueDate: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 8,
    }),

    prisma.meeting.count({
      where: {
        companyId,
      },
    }),
  ]);

  const overdueActions = openActions.filter(
    (action) =>
      action.dueDate &&
      action.dueDate < now
  );

  function formatDate(
    value: Date | null
  ) {
    if (!value) {
      return "Date not set";
    }

    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ).format(value);
  }

  function formatDateTime(
    value: Date | null
  ) {
    if (!value) {
      return "Date not set";
    }

    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(value);
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
            Odin Intelligence
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Meetings
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Prepare for customer meetings, capture what was discussed
            and turn decisions into actions with Odin.
          </p>
        </div>

        <Link
          href="/commercial/meetings/new"
          className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          + New Meeting
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Meetings
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
            {meetingCount}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            Upcoming
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
            {upcomingMeetings.length}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Open Actions
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
            {openActions.length}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
            Overdue Actions
          </p>

          <p className="mt-2 text-3xl font-bold text-red-700">
            {overdueActions.length}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Upcoming Meetings
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Meetings Odin can help you prepare for.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y">
            {upcomingMeetings.length ===
            0 ? (
              <div className="px-6 py-10 text-center">
                <p className="font-semibold text-slate-700">
                  No upcoming meetings
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Create your first meeting
                  and Odin will help you
                  prepare.
                </p>
              </div>
            ) : (
              upcomingMeetings.map(
                (meeting) => (
                  <div
                    key={meeting.id}
                    className="px-6 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-950">
                          {meeting.title}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {meeting.customer
                            ?.name ??
                            "No customer attached"}
                        </p>

                        <p className="mt-2 text-xs font-medium text-amber-700">
                          {formatDateTime(
                            meeting.scheduledAt
                          )}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {
                          meeting
                            .attendees
                            .length
                        }{" "}
                        attendees
                      </span>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-bold text-slate-950">
              Open Actions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Actions created from your
              meetings.
            </p>
          </div>

          <div className="divide-y">
            {openActions.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="font-semibold text-slate-700">
                  No open actions
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Meeting actions will
                  appear here.
                </p>
              </div>
            ) : (
              openActions.map(
                (action) => {
                  const overdue =
                    Boolean(
                      action.dueDate &&
                        action.dueDate <
                          now
                    );

                  return (
                    <div
                      key={action.id}
                      className="px-6 py-4"
                    >
                      <p className="font-medium text-slate-900">
                        {
                          action.description
                        }
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>
                          {
                            action
                              .meeting
                              .title
                          }
                        </span>

                        {action.meeting
                          .customer && (
                          <span>
                            {
                              action
                                .meeting
                                .customer
                                .name
                            }
                          </span>
                        )}

                        {action
                          .assignedMembership
                          ?.user && (
                          <span>
                            Assigned to{" "}
                            {
                              action
                                .assignedMembership
                                .user
                                .name
                            }
                          </span>
                        )}

                        {action.dueDate && (
                          <span
                            className={
                              overdue
                                ? "font-semibold text-red-600"
                                : ""
                            }
                          >
                            Due{" "}
                            {formatDate(
                              action.dueDate
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-5">
          <h2 className="text-lg font-bold text-slate-950">
            Recent Meetings
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Your latest completed meeting
            history.
          </p>
        </div>

        <div className="divide-y">
          {recentMeetings.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-semibold text-slate-700">
                No completed meetings yet
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Completed meetings and Odin
                summaries will appear here.
              </p>
            </div>
          ) : (
            recentMeetings.map(
              (meeting) => (
                <div
                  key={meeting.id}
                  className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {meeting.title}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {meeting.customer
                        ?.name ??
                        "No customer attached"}
                    </p>
                  </div>

                  <div className="text-sm text-slate-500">
                    {formatDate(
                      meeting.endedAt ??
                        meeting.scheduledAt
                    )}
                  </div>
                </div>
              )
            )
          )}
        </div>
      </section>
    </main>
  );
}