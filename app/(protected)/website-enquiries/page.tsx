import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    followUp?: string;
    q?: string;
    status?: string;
  }>;
};

export default async function WebsiteEnquiriesPage({
  searchParams,
}: PageProps) {
  await requireSuperAdmin();
  const { followUp, q, status } = await searchParams;

const searchTerm = (q ?? "").trim().toLowerCase();
const activeStatusFilter =
  status === "NEW" ||
  status === "CONTACTED" ||
  status === "QUOTED" ||
  status === "WON" ||
  status === "LOST"
    ? status
    : null;
const activeFollowUpFilter =
  followUp === "overdue" ||
  followUp === "today" ||
  followUp === "upcoming"
    ? followUp
    : null;



const enquiries = await prisma.websiteEnquiry.findMany({
  orderBy: {
    createdAt: "desc",
  },
});

const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "Europe/London",
});

function getFollowUpStatus(date: Date | null) {
  if (!date) return "NOT_SCHEDULED";

  const followUpDate = date.toISOString().slice(0, 10);

  if (followUpDate < today) return "OVERDUE";
  if (followUpDate === today) return "DUE_TODAY";

  return "UPCOMING";
}

// Enquiry summary totals
const total = enquiries.length;

const newCount = enquiries.filter(
  (enquiry) => enquiry.status === "NEW"
).length;

const corporateCount = enquiries.filter(
  (enquiry) => enquiry.packageName === "Corporate"
).length;

// Active enquiries
const activeEnquiries = enquiries.filter(
  (enquiry) =>
    enquiry.status !== "WON" &&
    enquiry.status !== "LOST"
);

// Follow-up summary totals
const overdueCount = activeEnquiries.filter(
  (enquiry) =>
    getFollowUpStatus(enquiry.nextFollowUpAt) === "OVERDUE"
).length;

const dueTodayCount = activeEnquiries.filter(
  (enquiry) =>
    getFollowUpStatus(enquiry.nextFollowUpAt) === "DUE_TODAY"
).length;

const upcomingCount = activeEnquiries.filter(
  (enquiry) =>
    getFollowUpStatus(enquiry.nextFollowUpAt) === "UPCOMING"
).length;

// Apply search, status and follow-up filters
const filteredEnquiries = enquiries.filter((enquiry) => {
  // Search by company, contact, email or reference
  const matchesSearch =
    !searchTerm ||
    enquiry.companyName.toLowerCase().includes(searchTerm) ||
    enquiry.contactName.toLowerCase().includes(searchTerm) ||
    enquiry.email.toLowerCase().includes(searchTerm) ||
    `oiq-${enquiry.id}`.includes(searchTerm);

  if (!matchesSearch) {
    return false;
  }

  // Filter by enquiry status
  if (
    activeStatusFilter &&
    enquiry.status !== activeStatusFilter
  ) {
    return false;
  }

  // Show all matching enquiries when no follow-up filter is active
  if (!activeFollowUpFilter) {
    return true;
  }

  // Exclude completed enquiries from follow-up lists
  if (
    enquiry.status === "WON" ||
    enquiry.status === "LOST"
  ) {
    return false;
  }

  const followUpStatus = getFollowUpStatus(
    enquiry.nextFollowUpAt
  );

  if (activeFollowUpFilter === "overdue") {
    return followUpStatus === "OVERDUE";
  }

  if (activeFollowUpFilter === "today") {
    return followUpStatus === "DUE_TODAY";
  }

  return followUpStatus === "UPCOMING";
});


  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">
          OdinIQ Platform Administration
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Website Enquiries
        </h1>

        <p className="mt-2 text-slate-600">
          Manage incoming OdinIQ annual licence enquiries.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Enquiries", value: total },
          { label: "New Enquiries", value: newCount },
          { label: "Corporate Enquiries", value: corporateCount },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm text-slate-500">
              {card.label}
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

<div className="grid gap-4 sm:grid-cols-3">
  {[
    
{
  label: "Overdue Follow-Ups",
  value: overdueCount,
  colour: "text-red-700",
  href: `/website-enquiries?${new URLSearchParams({
  followUp: "overdue",
  ...(activeStatusFilter ? { status: activeStatusFilter } : {}),
  ...(searchTerm ? { q: searchTerm } : {}),
}).toString()}`,
},
{
  label: "Due Today",
  value: dueTodayCount,
  colour: "text-amber-700",
 href: `/website-enquiries?${new URLSearchParams({
  followUp: "today",
  ...(activeStatusFilter ? { status: activeStatusFilter } : {}),
  ...(searchTerm ? { q: searchTerm } : {}),
}).toString()}`,
},
{
  label: "Upcoming Follow-Ups",
  value: upcomingCount,
  colour: "text-blue-700",
  href: `/website-enquiries?${new URLSearchParams({
  followUp: "upcoming",
  ...(activeStatusFilter ? { status: activeStatusFilter } : {}),
  ...(searchTerm ? { q: searchTerm } : {}),
}).toString()}`,
},

  ].map((card) => (
   <Link
  key={card.label}
  href={card.href}
  className="block rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-amber-400 hover:shadow-md"
>
      <p className="text-sm text-slate-500">
        {card.label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${card.colour}`}>
        {card.value}
      </p>
   </Link>
  ))}
</div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          
<div className="flex flex-wrap items-center justify-between gap-4">
  <h2 className="text-lg font-bold text-slate-900">
    Licence Enquiries
  </h2>

  {activeFollowUpFilter && (
    <Link
      href={`/website-enquiries?${new URLSearchParams({
        ...(activeStatusFilter ? { status: activeStatusFilter } : {}),
        ...(searchTerm ? { q: searchTerm } : {}),
      }).toString()}`}
      className="text-sm font-semibold text-amber-700 hover:underline"
    >
      Show All Enquiries
    </Link>
  )}
</div>

<form
  action="/website-enquiries"
  method="GET"
  className="mt-4 flex flex-wrap items-center gap-3"
>
  {activeFollowUpFilter && (
    <input
      type="hidden"
      name="followUp"
      value={activeFollowUpFilter}
    />
  )}

  <input
    type="search"
    name="q"
    defaultValue={q ?? ""}
    placeholder="Search company, contact, email or OIQ reference..."
    className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
  />

<select
  name="status"
  defaultValue={activeStatusFilter ?? ""}
  aria-label="Filter by enquiry status"
  className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
>
  <option value="">All Statuses</option>
  <option value="NEW">New</option>
  <option value="CONTACTED">Contacted</option>
  <option value="QUOTED">Quoted</option>
  <option value="WON">Won</option>
  <option value="LOST">Lost</option>
</select>

  <button
    type="submit"
    className="rounded-lg bg-slate-950 px-6 py-3 text-sm font-semibold text-amber-400 transition hover:bg-slate-800"
  >
    Search
  </button>

  {searchTerm && (
    <Link
      href={`/website-enquiries?${new URLSearchParams({
        ...(activeFollowUpFilter
          ? { followUp: activeFollowUpFilter }
          : {}),
        ...(activeStatusFilter
    ? { status: activeStatusFilter }
    : {}),
}).toString()}`}

      className="text-sm font-semibold text-amber-700 hover:underline"
    >
      Clear Search
    </Link>
  )}
</form>

        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Reference</th>
                <th className="px-5 py-4">Company</th>
                <th className="px-5 py-4">Contact</th>
                <th className="px-5 py-4">Package</th>
                <th className="px-5 py-4">Users</th>
                <th className="px-5 py-4">Status</th>
<th className="px-5 py-4">Follow-Up</th>
<th className="px-5 py-4">Received</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredEnquiries.map((enquiry) => (
                <tr
                  key={enquiry.id}
                  className="hover:bg-slate-50"
                >
                  <td className="px-5 py-4 font-semibold">
  <Link
    href={`/website-enquiries/${enquiry.id}`}
    className="text-amber-700 hover:text-amber-900 hover:underline"
  >
    OIQ-{enquiry.id}
  </Link>
</td>

                  <td className="px-5 py-4">
                    {enquiry.companyName}
                  </td>

                  <td className="px-5 py-4">
                    <p className="font-medium">
                      {enquiry.contactName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {enquiry.email}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    Odin {enquiry.packageName}
                  </td>

                  <td className="px-5 py-4">
                    {enquiry.packageName === "Corporate"
                      ? "Bespoke"
                      : enquiry.totalUsers}
                  </td>

                  <td className="px-5 py-4">
                    
<span
  className={`rounded-full px-3 py-1 text-xs font-semibold ${
    enquiry.status === "NEW"
      ? "bg-amber-100 text-amber-800"
      : enquiry.status === "CONTACTED"
      ? "bg-blue-100 text-blue-800"
      : enquiry.status === "QUOTED"
      ? "bg-purple-100 text-purple-800"
      : enquiry.status === "WON"
      ? "bg-green-100 text-green-800"
      : enquiry.status === "LOST"
      ? "bg-red-100 text-red-800"
      : "bg-slate-100 text-slate-700"
  }`}
>
  {enquiry.status}
</span>

                  </td>

<td className="px-5 py-4">
  {enquiry.nextFollowUpAt ? (
    <div className="space-y-1">
      <p className="font-medium text-slate-900">
        {enquiry.nextFollowUpAt.toLocaleDateString("en-GB", {
          timeZone: "UTC",
        })}
      </p>

      <span
        className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
          getFollowUpStatus(enquiry.nextFollowUpAt) === "OVERDUE"
            ? "bg-red-100 text-red-800"
            : getFollowUpStatus(enquiry.nextFollowUpAt) === "DUE_TODAY"
            ? "bg-amber-100 text-amber-800"
            : "bg-blue-100 text-blue-800"
        }`}
      >
        {getFollowUpStatus(enquiry.nextFollowUpAt) === "OVERDUE"
          ? "Overdue"
          : getFollowUpStatus(enquiry.nextFollowUpAt) === "DUE_TODAY"
          ? "Due Today"
          : "Upcoming"}
      </span>
    </div>
  ) : (
    <span className="text-slate-400">
      Not scheduled
    </span>
  )}
</td>

                  <td className="px-5 py-4 text-slate-500">
                    {enquiry.createdAt.toLocaleDateString("en-GB")}
                  </td>
                </tr>
              ))}

              {filteredEnquiries.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No website enquiries received yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
