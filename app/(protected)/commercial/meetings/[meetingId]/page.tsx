import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

import {
  getMeetingIntelligence,
} from "@/lib/commercial/meetingIntelligence";

type MeetingPageProps = {
  params: Promise<{
    meetingId: string;
  }>;
};

export default async function MeetingPage({
  params,
}: MeetingPageProps) {
  const { companyId } =
    await requireCompanyContext();

  const { meetingId } = await params;
  const id = Number(meetingId);

  if (!Number.isInteger(id)) {
    notFound();
  }

  const meeting =
    await prisma.meeting.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        customer: true,
        attendees: {
          include: {
            membership: {
              include: {
                user: true,
              },
            },
          },
          orderBy: [
            {
              internal: "desc",
            },
            {
              name: "asc",
            },
          ],
        },
        actions: {
          include: {
            assignedMembership: {
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
              dueDate: "asc",
            },
          ],
        },
        organisedByMembership: {
          include: {
            user: true,
          },
        },
      },
    });

  if (!meeting) {
    notFound();
  }

  function formatDateTime(
    value: Date | null
  ) {
    if (!value) {
      return "Not scheduled";
    }

    return new Intl.DateTimeFormat(
      "en-GB",
      {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(value);
  }

  function formatDate(
    value: Date | null
  ) {
    if (!value) {
      return "No due date";
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

  function formatMoney(
    value: number
  ) {
    return value.toLocaleString(
      "en-GB",
      {
        style: "currency",
        currency: "GBP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }
    );
  }

  const openActions =
    meeting.actions.filter(
      (action) =>
        action.status === "OPEN"
    );

  const intelligence =
    meeting.customerId
      ? await getMeetingIntelligence({
          companyId,
          customerId:
            meeting.customerId,
        })
      : null;

  return (
    <main className="space-y-6">
      <div>
        <Link
          href="/commercial/meetings"
          className="text-sm font-semibold text-amber-600 hover:text-amber-700"
        >
          ← Back to Meetings
        </Link>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
              Odin Meetings
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              {meeting.title}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {formatDateTime(
                meeting.scheduledAt
              )}
            </p>
          </div>

          <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
            {meeting.status}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Customer
          </p>

          <p className="mt-2 text-lg font-bold text-slate-950">
            {meeting.customer?.name ??
              "No customer linked"}
          </p>

          {meeting.customer ? (
            <p className="mt-1 text-xs text-slate-500">
              {
                meeting.customer
                  .accountCode
              }
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Meeting Type
          </p>

          <p className="mt-2 text-lg font-bold text-slate-950">
            {meeting.meetingType ??
              "Not specified"}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Location
          </p>

          <p className="mt-2 text-lg font-bold text-slate-950">
            {meeting.location ??
              "Not specified"}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Organiser
          </p>

          <p className="mt-2 text-lg font-bold text-slate-950">
            {meeting
              .organisedByMembership
              ?.user.name ??
              "Not assigned"}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
          Odin Intelligence
        </p>

        <h2 className="mt-2 text-xl font-bold text-slate-950">
          Prepare with Odin
        </h2>

        {!intelligence ? (
          <p className="mt-3 text-sm text-slate-600">
            Link this meeting to a customer
            to allow Odin to prepare
            commercial intelligence.
          </p>
        ) : (
          <div className="mt-5 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-amber-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Sales YTD
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {formatMoney(
                    intelligence.sales
                      .currentYearSales
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {
                    intelligence.sales
                      .currentYear
                  }
                </p>
              </div>

              <div className="rounded-lg border border-amber-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Previous YTD
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {formatMoney(
                    intelligence.sales
                      .previousYearSales
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {
                    intelligence.sales
                      .previousYear
                  }
                </p>
              </div>

              <div className="rounded-lg border border-amber-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Sales Movement
                </p>

                <p
                  className={`mt-2 text-2xl font-bold ${
                    intelligence.sales
                      .difference >= 0
                      ? "text-emerald-700"
                      : "text-red-700"
                  }`}
                >
                  {intelligence.sales
                    .difference >= 0
                    ? "+"
                    : "-"}
                  {formatMoney(
                    Math.abs(
                      intelligence.sales
                        .difference
                    )
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {intelligence.sales
                    .percentageChange !==
                  null
                    ? `${
                        intelligence.sales
                          .percentageChange >=
                        0
                          ? "+"
                          : ""
                      }${intelligence.sales.percentageChange.toFixed(
                        1
                      )}%`
                    : "No prior-year comparison"}
                </p>
              </div>

              <div className="rounded-lg border border-amber-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Products Bought YTD
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {
                    intelligence.products
                      .currentYearCount
                  }
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {
                    intelligence.products
                      .previousYearCount
                  }{" "}
                  last year
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-amber-200 bg-white p-5">
                <h3 className="font-bold text-slate-950">
                  Odin Talking Points
                </h3>

                {intelligence.talkingPoints
                  .length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {intelligence.talkingPoints.map(
                      (
                        point,
                        index
                      ) => (
                        <div
                          key={`${index}-${point}`}
                          className="flex gap-3"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
                            {index + 1}
                          </div>

                          <p className="text-sm leading-6 text-slate-700">
                            {point}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Odin has not identified
                    any significant talking
                    points yet.
                  </p>
                )}
              </div>
<div className="rounded-lg border border-amber-200 bg-white p-5">
  <div className="flex items-center justify-between gap-4">
    <div>
      <h3 className="font-bold text-slate-950">
        Open Commercial Opportunities
      </h3>

      <p className="mt-1 text-xs text-slate-500">
        Active opportunities Odin has identified for this customer.
      </p>
    </div>

    <Link
      href={`/commercial/opportunities?customerId=${meeting.customerId}`}
      className="text-xs font-semibold text-amber-700 hover:text-amber-800"
    >
      View all →
    </Link>
  </div>

  {intelligence.opportunities.length > 0 ? (
    <div className="mt-4 space-y-3">
      {intelligence.opportunities.map(
        (opportunity) => (
          <Link
            key={opportunity.id}
            href={`/commercial/opportunities/${opportunity.id}`}
            className="block rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-amber-300 hover:bg-amber-50"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-semibold text-slate-900">
                  {opportunity.title}
                </p>

                {opportunity.description ? (
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    {opportunity.description}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    {opportunity.stage}
                  </span>

                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    {opportunity.status}
                  </span>

                  {opportunity.probability !== null ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {opportunity.probability}% probability
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="shrink-0 text-left md:text-right">
                {opportunity.value !== null ? (
                  <p className="text-lg font-bold text-slate-950">
                    {formatMoney(
                      opportunity.value
                    )}
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-slate-500">
                    Value not set
                  </p>
                )}

                {opportunity.expectedCloseDate ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Close{" "}
                    {new Date(
                      opportunity.expectedCloseDate
                    ).toLocaleDateString(
                      "en-GB"
                    )}
                  </p>
                ) : null}
              </div>
            </div>
          </Link>
        )
      )}
    </div>
  ) : (
    <p className="mt-4 text-sm text-slate-500">
      No open commercial opportunities have been recorded for this customer.
    </p>
  )}
</div>
              <div className="rounded-lg border border-amber-200 bg-white p-5">
                <h3 className="font-bold text-slate-950">
                  Product Opportunities
                </h3>

                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Growth
                    </p>

                    {intelligence.products
                      .topGrowth.length >
                    0 ? (
                      <div className="mt-2 space-y-2">
                        {intelligence.products.topGrowth.map(
                          (product) => (
                            <div
                              key={
                                product.productCode
                              }
                              className="flex items-start justify-between gap-4 text-sm"
                            >
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {
                                    product.productCode
                                  }
                                </p>

                                <p className="text-xs text-slate-500">
                                  {
                                    product.description
                                  }
                                </p>
                              </div>

                              <span className="shrink-0 font-semibold text-emerald-700">
                                +
                                {formatMoney(
                                  product.difference
                                )}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        No existing product
                        growth identified.
                      </p>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                      Declining
                    </p>

                    {intelligence.products
                      .topDeclines.length >
                    0 ? (
                      <div className="mt-2 space-y-2">
                        {intelligence.products.topDeclines.map(
                          (product) => (
                            <div
                              key={
                                product.productCode
                              }
                              className="flex items-start justify-between gap-4 text-sm"
                            >
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {
                                    product.productCode
                                  }
                                </p>

                                <p className="text-xs text-slate-500">
                                  {
                                    product.description
                                  }
                                </p>
                              </div>

                              <span className="shrink-0 font-semibold text-red-700">
                                -
                                {formatMoney(
                                  Math.abs(
                                    product.difference
                                  )
                                )}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        No active product
                        declines identified.
                      </p>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Stopped Buying
                    </p>

                    {intelligence.products
                      .stopped.length >
                    0 ? (
                      <div className="mt-2 space-y-2">
                        {intelligence.products.stopped.map(
                          (product) => (
                            <div
                              key={
                                product.productCode
                              }
                              className="flex items-start justify-between gap-4 text-sm"
                            >
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {
                                    product.productCode
                                  }
                                </p>

                                <p className="text-xs text-slate-500">
                                  {
                                    product.description
                                  }
                                </p>
                              </div>

                              <span className="shrink-0 text-slate-600">
                                {formatMoney(
                                  product.previousSales
                                )}{" "}
                                last year
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        No stopped product
                        lines identified.
                      </p>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      New Products
                    </p>

                    {intelligence.products
                      .newProducts.length >
                    0 ? (
                      <div className="mt-2 space-y-2">
                        {intelligence.products.newProducts.map(
                          (product) => (
                            <div
                              key={
                                product.productCode
                              }
                              className="flex items-start justify-between gap-4 text-sm"
                            >
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {
                                    product.productCode
                                  }
                                </p>

                                <p className="text-xs text-slate-500">
                                  {
                                    product.description
                                  }
                                </p>
                              </div>

                              <span className="shrink-0 font-semibold text-blue-700">
                                {formatMoney(
                                  product.currentSales
                                )}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        No new product lines
                        identified.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-bold text-slate-950">
              Meeting Purpose
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              What you want to discuss.
            </p>
          </div>

          <div className="p-6">
            {meeting.notes ? (
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {meeting.notes}
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                No preparation notes have
                been added.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-bold text-slate-950">
              Attendees
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Everyone attending this
              meeting.
            </p>
          </div>

          <div className="divide-y">
            {meeting.attendees.length ===
            0 ? (
              <div className="p-6 text-sm text-slate-500">
                No attendees added.
              </div>
            ) : (
              meeting.attendees.map(
                (attendee) => (
                  <div
                    key={attendee.id}
                    className="flex items-center justify-between gap-4 px-6 py-4"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {attendee.name}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {attendee.email ??
                          attendee.role ??
                          "No email"}
                      </p>
                    </div>

                    <span
                      className={
                        attendee.internal
                          ? "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                          : "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                      }
                    >
                      {attendee.internal
                        ? "Internal"
                        : "External"}
                    </span>
                  </div>
                )
              )
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Meeting Actions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Actions and follow-ups linked
              to this meeting.
            </p>
          </div>

          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            {openActions.length} open
          </span>
        </div>

        {meeting.actions.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-slate-500">
              No actions have been added to
              this meeting yet.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {meeting.actions.map(
              (action) => (
                <div
                  key={action.id}
                  className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {
                        action.description
                      }
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Assigned to{" "}
                      {action
                        .assignedMembership
                        ?.user.name ??
                        "Unassigned"}
                      {" · "}
                      {formatDate(
                        action.dueDate
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {action.priority}
                    </span>

                    <span
                      className={
                        action.status ===
                        "COMPLETED"
                          ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                          : "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                      }
                    >
                      {action.status}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-dashed bg-slate-50 p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Next Stage
        </p>

        <h2 className="mt-2 text-lg font-bold text-slate-950">
          Odin Meeting Assistant
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          The next stage will allow Odin to
          capture meeting notes and
          transcripts, identify decisions,
          create actions, highlight risks and
          opportunities, and prepare the
          follow-up after the meeting.
        </p>
      </section>
    </main>
  );
}