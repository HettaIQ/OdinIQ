
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { prisma } from "@/lib/prisma";
import { addWebsiteEnquiryNote } from "@/app/actions/addWebsiteEnquiryNote";
import { updateWebsiteEnquiryFollowUp } from "@/app/actions/updateWebsiteEnquiryFollowUp";
import { updateWebsiteEnquiryStatus } from "@/app/actions/updateWebsiteEnquiryStatus";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function WebsiteEnquiryDetailPage({
  params,
}: PageProps) {
  await requireSuperAdmin();

  const { id } = await params;
  const enquiryId = Number(id);

  if (
    !Number.isSafeInteger(enquiryId) ||
    enquiryId < 1
  ) {
    notFound();
  }

  const enquiry = await prisma.websiteEnquiry.findUnique({
    where: { id: enquiryId },
  });

  if (!enquiry) {
    notFound();
  }

const notes = await prisma.websiteEnquiryNote.findMany({
  where: {
    enquiryId: enquiry.id,
  },
  orderBy: {
    createdAt: "desc",
  },
});

  let modules: string[] = [];

  try {
    const parsed: unknown = JSON.parse(
      enquiry.selectedModules
    );

    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
    ) {
      modules = parsed;
    }
  } catch {
    modules = [];
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/website-enquiries"
        className="text-sm font-medium text-amber-700 hover:underline"
      >
        ← Back to Website Enquiries
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
            OdinIQ Licence Enquiry
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            OIQ-{enquiry.id}
          </h1>

          <p className="mt-1 text-slate-500">
            {enquiry.companyName}
          </p>
        </div>

        <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
          {enquiry.status}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-slate-900">
            Contact Details
          </h2>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-slate-500">Company</p>
              <p className="font-semibold">{enquiry.companyName}</p>
            </div>

            <div>
              <p className="text-slate-500">Contact</p>
              <p className="font-semibold">{enquiry.contactName}</p>
            </div>

            <div>
              <p className="text-slate-500">Email</p>
              <a
                href={`mailto:${enquiry.email}`}
                className="font-semibold text-amber-700 hover:underline"
              >
                {enquiry.email}
              </a>
            </div>

            <div>
              <p className="text-slate-500">Telephone</p>
              <p className="font-semibold">
                {enquiry.telephone || "Not provided"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-slate-900">
            Licence Configuration
          </h2>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-slate-500">Package</p>
              <p className="font-semibold">
                Odin {enquiry.packageName}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Total Users</p>
              <p className="font-semibold">
                {enquiry.packageName === "Corporate"
                  ? "Bespoke"
                  : enquiry.totalUsers}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Additional Users</p>
              <p className="font-semibold">
                {enquiry.additionalUsers}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Additional Modules</p>
              <p className="font-semibold">
                {enquiry.additionalModules}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          Selected Modules
        </h2>

        {modules.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {modules.map((module) => (
              <span
                key={module}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700"
              >
                {module}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Modules to be discussed.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          Customer Requirements
        </h2>

        <p className="whitespace-pre-wrap text-sm text-slate-700">
          {enquiry.requirements || "No additional requirements provided."}
        </p>
      </section>


<section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
  <h2 className="mb-4 text-lg font-bold text-slate-900">
    Enquiry Status
  </h2>

  <p className="mb-4 text-sm text-slate-500">
    Update the progress of this OdinIQ licence enquiry.
  </p>

  <form
    action={updateWebsiteEnquiryStatus.bind(null, enquiry.id)}
    className="flex flex-wrap items-end gap-4"
  >
    <div className="w-full max-w-xs">
      <label
        htmlFor="enquiry-status"
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        Current Status
      </label>

      <select
        id="enquiry-status"
        name="status"
        defaultValue={enquiry.status}
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
      >
        <option value="NEW">New</option>
        <option value="CONTACTED">Contacted</option>
        <option value="QUOTED">Quoted</option>
        <option value="WON">Won</option>
        <option value="LOST">Lost</option>
      </select>
    </div>

    <button
      type="submit"
      className="rounded-lg bg-slate-950 px-6 py-3 text-sm font-semibold text-amber-400 transition hover:bg-slate-800"
    >
      Save Status
    </button>
  </form>
</section>


<section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
  <h2 className="mb-2 text-lg font-bold text-slate-900">
    Next Follow-Up
  </h2>

  <p className="mb-5 text-sm text-slate-500">
    Schedule when this prospective customer needs contacting.
  </p>

  <form
    action={updateWebsiteEnquiryFollowUp.bind(null, enquiry.id)}
    className="flex flex-wrap items-end gap-4"
  >
    <div className="w-full max-w-xs">
      <label
        htmlFor="nextFollowUpAt"
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        Follow-Up Date
      </label>

      <input
        type="date"
        id="nextFollowUpAt"
        name="nextFollowUpAt"
        defaultValue={
          enquiry.nextFollowUpAt
            ? enquiry.nextFollowUpAt.toISOString().slice(0, 10)
            : ""
        }
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
      />
    </div>

    <button
      type="submit"
      className="rounded-lg bg-slate-950 px-6 py-3 text-sm font-semibold text-amber-400 transition hover:bg-slate-800"
    >
      Save Follow-Up
    </button>
  </form>

  {enquiry.nextFollowUpAt && (
    <p className="mt-4 text-sm font-medium text-slate-700">
      Scheduled for:{" "}
      {enquiry.nextFollowUpAt.toLocaleDateString("en-GB", {
        timeZone: "UTC",
      })}
    </p>
  )}
</section>


<section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
  <h2 className="mb-2 text-lg font-bold text-slate-900">
    Activity & Follow-Up Notes
  </h2>

  <p className="mb-5 text-sm text-slate-500">
    Record customer calls, emails, quotation discussions and next actions.
  </p>

  <form
    action={addWebsiteEnquiryNote.bind(null, enquiry.id)}
    className="space-y-4"
  >
    <textarea
      name="note"
      required
      maxLength={5000}
      rows={4}
      placeholder="Enter a note about this enquiry..."
      className="w-full rounded-lg border border-slate-300 bg-white p-4 text-sm text-slate-900"
    />

    <button
      type="submit"
      className="rounded-lg bg-slate-950 px-6 py-3 text-sm font-semibold text-amber-400 transition hover:bg-slate-800"
    >
      Add Note
    </button>
  </form>

  <div className="mt-8 space-y-4 border-t border-slate-200 pt-6">
    <h3 className="font-semibold text-slate-900">
      Activity History
    </h3>

    {notes.length === 0 ? (
      <p className="text-sm text-slate-500">
        No activity recorded yet.
      </p>
    ) : (
      notes.map((item) => (
        <div
          key={item.id}
          className="rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <p className="whitespace-pre-wrap text-sm text-slate-800">
            {item.note}
          </p>

          <p className="mt-3 text-xs text-slate-500">
            {item.createdAt.toLocaleString("en-GB")}
          </p>
        </div>
      ))
    )}
  </div>
</section>


      <p className="text-sm text-slate-500">
        Received:{" "}
        {enquiry.createdAt.toLocaleString("en-GB")}
      </p>
    </div>
  );
}
