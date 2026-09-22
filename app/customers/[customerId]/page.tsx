import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";
import AskOdin from "@/app/components/AskOdin";
import { completeTask } from "@/app/actions/completeTask";
import { createTask } from "@/app/actions/createTask";
import { createTaskFromVoiceNote } from "@/app/actions/completeTask";
import CustomerVoiceRecorder from "@/app/components/CustomerVoiceRecorder";
import { updateCustomer } from "@/app/actions/updateCustomer";

type CustomerPageProps = {
  params: Promise<{
    customerId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function CustomerPage({
  params,
}: CustomerPageProps) {
  const {
    membership,
    companyId,
  } = await requireCompanyContext();
  const canManageCustomerOwnership =
  membership?.role?.name === "Company Admin" ||
  membership?.role?.name === "Accounts";

  const isSalesAgent = membership?.role?.name === "Sales Agent";

  if (!membership) {
    notFound();
  }

  const { customerId } = await params;
  const id = Number(customerId);

  if (!Number.isInteger(id)) {
    notFound();
  }

 const customer = await prisma.customer.findFirst({
  where: {
  id,
  companyId: companyId,

  ...(isSalesAgent
    ? {
        assignedMembershipId: membership.id,
      }
    : {}),
},
  include: {
    timelineEntries: {
      orderBy: {
        occurredAt: "desc",
      },
      take: 10,
    },
        tasks: {
      where: {
        status: "OPEN",
      },
      orderBy: [
        {
          priority: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
    },

    voiceNotes: {
      orderBy: {
        createdAt: "desc",
      },
    },

assignedTo: {
  include: {
    user: true,
  },
},

agentHistory: {
  orderBy: {
    effectiveFrom: "desc",
  },
},

buyingGroupHistory: {
  orderBy: {
    effectiveFrom: "desc",
  },
},
},
});
  if (!customer) {
    notFound();
  }
const teamMembers = await prisma.companyMembership.findMany({
  where: {
    companyId: companyId,
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
  const creditUsed =
    customer.creditLimit && customer.creditLimit > 0
      ? ((customer.currentBalance ?? 0) / customer.creditLimit) * 100
      : 0;
const updateCustomerAction = updateCustomer;
  return (
    <div className="space-y-8">
      <section>
        <Link
          href="/customers"
          className="text-sm font-semibold text-amber-600 hover:text-amber-700"
        >
          ← Back to customers
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-amber-600">
              Customer Workspace
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              {customer.name}
            </h1>

            <p className="mt-2 text-slate-600">
              Account {customer.accountCode}
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
            {customer.status}
          </span>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <p className="text-sm text-slate-500">Last order</p>

  <p className="mt-2 text-2xl font-bold text-slate-950">
    {customer.lastInvoiceDate
      ? customer.lastInvoiceDate.toLocaleDateString("en-GB")
      : "No sales history"}
  </p>
</div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Credit limit</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {customer.creditLimit != null
              ? `£${customer.creditLimit.toLocaleString("en-GB")}`
              : "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Current balance</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            £{(customer.currentBalance ?? 0).toLocaleString("en-GB")}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Credit used</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {creditUsed.toFixed(1)}%
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Buying group</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {customer.buyingGroup ?? "—"}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <h2 className="text-lg font-semibold text-slate-950">
            Account details
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Customer type
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {customer.customerType ?? "Not set"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Payment terms
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {customer.paymentTerms ?? "Not set"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Location
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {[customer.town, customer.postcode]
                  .filter(Boolean)
                  .join(", ") || "Not set"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Contact
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {customer.email ?? customer.phone ?? "Not set"}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Notes
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {customer.notes ?? "No notes have been added yet."}
            </p>
          </div>
          {canManageCustomerOwnership && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
    Customer Management
  </p>

  <h2 className="mt-1 text-xl font-bold text-slate-950">
    Account ownership & buying group
  </h2>

  <p className="mt-2 text-sm text-slate-500">
    Update the current sales agent and buying group while preserving the previous assignment history.
  </p>

  <form
    action={updateCustomerAction}
    className="mt-6 grid gap-5 md:grid-cols-2"
  >
    <input type="hidden" name="customerId" value={customer.id} />

    <div>
      <label className="text-sm font-semibold text-slate-700">
        Sales Agent
      </label>

      <select
        name="assignedMembershipId"
        defaultValue={customer.assignedMembershipId ?? ""}
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">Unassigned</option>

        {teamMembers
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
        Agent effective from
      </label>

      <input
        type="date"
        name="agentEffectiveFrom"
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label className="text-sm font-semibold text-slate-700">
        Buying Group
      </label>

      <input
        type="text"
        name="buyingGroup"
        defaultValue={customer.buyingGroup ?? ""}
        placeholder="e.g. NBG, IPG, Fortis"
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label className="text-sm font-semibold text-slate-700">
        Buying group effective from
      </label>

      <input
        type="date"
        name="buyingGroupEffectiveFrom"
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>

    <div className="md:col-span-2">
      <button
        type="submit"
        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Save customer changes
      </button>
    </div>
  </form>
</section>
)}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-sm font-semibold text-amber-400">
            Odin Intelligence
          </p>

          <h2 className="mt-2 text-xl font-bold">
            Customer health
          </h2>

          <p className="mt-4 text-sm leading-6 text-slate-400">
            Odin will eventually analyse sales trends, quote activity,
            payment behaviour, pricing agreements and customer engagement
            for this account.
          </p>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current signal
            </p>

            <p className="mt-2 text-sm font-semibold text-white">
              Development mode
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Customer intelligence will appear here once sales and quote
              history are connected.
            </p>
          </div>
        </div>
      </section>

<AskOdin
  customerId={customer.id}
  customerName={customer.name}
/>
<section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
  <div className="border-b border-slate-200 px-6 py-5">
    <p className="text-sm font-semibold text-amber-600">
      Commercial Tasks
    </p>

    <h2 className="mt-1 text-xl font-bold text-slate-950">
      Open actions
    </h2>

    <p className="mt-1 text-sm text-slate-500">
      Prioritised actions for this customer.
    </p>
  </div>
<form
  action={createTask}
  className="grid gap-4 border-b border-slate-200 px-6 py-5 md:grid-cols-2 xl:grid-cols-5"
>
  <input
    type="hidden"
    name="customerId"
    value={customer.id}
  />

  <input
    name="title"
    placeholder="Task title"
    required
    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
  />

  <input
    name="description"
    placeholder="Description"
    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
  />

  <select
    name="type"
    defaultValue="GENERAL"
    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
  >
    <option value="GENERAL">General</option>
    <option value="CALL">Call</option>
    <option value="QUOTE_FOLLOW_UP">Quote follow-up</option>
    <option value="SALES_OPPORTUNITY">Sales opportunity</option>
    <option value="CREDIT_REVIEW">Credit review</option>
    <option value="AGREEMENT_REVIEW">Agreement review</option>
  </select>

  <select
    name="priority"
    defaultValue="MEDIUM"
    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
  >
    <option value="LOW">Low</option>
    <option value="MEDIUM">Medium</option>
    <option value="HIGH">High</option>
  </select>

  <div className="flex gap-3">
    <input
      type="date"
      name="dueDate"
      className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
    />

    <button
      type="submit"
      className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
    >
      Add task
    </button>
  </div>
</form>

  {customer.tasks.length === 0 ? (
    <div className="px-6 py-12 text-center">
      <p className="font-semibold text-slate-900">
        No open tasks
      </p>

      <p className="mt-2 text-sm text-slate-500">
        New commercial actions will appear here.
      </p>
    </div>
  ) : (
    <div className="divide-y divide-slate-100">
      {customer.tasks.map((task) => (
        <div
          key={task.id}
          className="flex flex-wrap items-start justify-between gap-4 px-6 py-5"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-semibold text-slate-950">
                {task.title}
              </h3>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  task.priority === "HIGH"
                    ? "bg-red-50 text-red-700"
                    : task.priority === "MEDIUM"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {task.priority}
              </span>
            </div>

            {task.description ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {task.description}
              </p>
            ) : null}

            <p className="mt-3 text-xs font-medium text-slate-400">
              {task.type.replaceAll("_", " ")}
            </p>
          </div>

          <form
  action={async () => {
    "use server";
    await completeTask(task.id);
  }}
>
  <button
    type="submit"
    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
  >
    Complete
  </button>
</form>
        </div>
      ))}
    </div>
  )}
</section>

<CustomerVoiceRecorder customerId={customer.id} />

<section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
  <div className="border-b border-slate-200 px-6 py-5">
    <p className="text-sm font-semibold text-amber-600">
      Saved Voice Notes
    </p>

    <h2 className="mt-1 text-xl font-bold text-slate-950">
      Customer recordings
    </h2>

    <p className="mt-1 text-sm text-slate-500">
      Recorded calls, meetings and commercial updates.
    </p>
  </div>

  {customer.voiceNotes.length === 0 ? (
    <div className="px-6 py-10 text-center">
      <p className="font-semibold text-slate-900">
        No voice notes yet
      </p>

      <p className="mt-2 text-sm text-slate-500">
        Record a customer update and it will appear here.
      </p>
    </div>
  ) : (
    <div className="divide-y divide-slate-100">
      {customer.voiceNotes.map((voiceNote) => (
        <div
          key={voiceNote.id}
          className="px-6 py-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-950">
                Voice note
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {voiceNote.createdAt.toLocaleString("en-GB")}
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              VOICE-{voiceNote.id}
            </span>
          </div>

          <audio
            controls
            src={voiceNote.audioUrl}
            className="mt-4 w-full"
          />

          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Transcript
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-700">
              {voiceNote.transcript
                ? voiceNote.transcript
                : "Transcription unavailable or pending."}
            </p>
          </div>
          {voiceNote.summary ? (
  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
      Odin Summary
    </p>

    <p className="mt-2 text-sm leading-6 text-slate-700">
      {voiceNote.summary}
    </p>
  </div>
) : null}


{voiceNote.suggestedTaskTitle ? (
  <div className="mt-4 rounded-xl border border-slate-200 p-4">
    <div className="flex flex-wrap items-center gap-3">
      <p className="font-semibold text-slate-950">
        Suggested action
      </p>

      {voiceNote.suggestedTaskPriority ? (
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            voiceNote.suggestedTaskPriority === "HIGH"
              ? "bg-red-50 text-red-700"
              : voiceNote.suggestedTaskPriority === "MEDIUM"
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {voiceNote.suggestedTaskPriority}
        </span>
      ) : null}
    </div>

    <p className="mt-2 text-sm font-semibold text-slate-900">
      {voiceNote.suggestedTaskTitle}
    </p>

    {voiceNote.suggestedTaskDescription ? (
      <p className="mt-1 text-sm leading-6 text-slate-600">
        {voiceNote.suggestedTaskDescription}
      </p>
    ) : null}

    {voiceNote.suggestedTaskDueDate ? (
      <p className="mt-3 text-xs font-semibold text-slate-500">
        Suggested due date:{" "}
        {voiceNote.suggestedTaskDueDate.toLocaleDateString("en-GB")}
      </p>
    ) : null}

    <form
  action={async () => {
    "use server";
    await createTaskFromVoiceNote(voiceNote.id);
  }}
  className="mt-4"
>
  <button
    type="submit"
    className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
  >
    Approve task
  </button>
</form>
  </div>
) : null}

{voiceNote.opportunitySummary ? (
  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
      Commercial Opportunity
    </p>

    <p className="mt-2 text-sm leading-6 text-slate-700">
      {voiceNote.opportunitySummary}
    </p>
  </div>
) : null}

{voiceNote.sentiment ? (
  <div className="mt-4 flex items-center gap-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      Customer sentiment
    </p>

    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        voiceNote.sentiment === "POSITIVE"
          ? "bg-emerald-50 text-emerald-700"
          : voiceNote.sentiment === "NEGATIVE"
            ? "bg-red-50 text-red-700"
            : "bg-slate-100 text-slate-600"
      }`}
    >
      {voiceNote.sentiment}
    </span>
  </div>
) : null}
        </div>
      ))}
    </div>
  )}
</section>


<section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
  <div className="border-b border-slate-200 px-6 py-5">
    <p className="text-sm font-semibold text-amber-600">
      Commercial Timeline
    </p>

    <h2 className="mt-1 text-xl font-bold text-slate-950">
      Account activity
    </h2>

    <p className="mt-1 text-sm text-slate-500">
      Quotes, calls, agreements, credit events and commercial activity.
    </p>
  </div>

  {customer.timelineEntries.length === 0 ? (
    <div className="px-6 py-12 text-center">
      <p className="font-semibold text-slate-900">
        No activity recorded yet
      </p>

      <p className="mt-2 text-sm text-slate-500">
        New quotes, meetings, tasks and commercial events will appear here.
      </p>
    </div>
  ) : (
    <div className="divide-y divide-slate-100">
      {customer.timelineEntries.map((entry) => (
        <div
          key={entry.id}
          className="flex gap-4 px-6 py-5"
        >
          <div className="mt-1">
            <div
              className={`h-3 w-3 rounded-full ${
                entry.type === "CREDIT"
                  ? "bg-red-500"
                  : entry.type === "QUOTE"
                    ? "bg-emerald-500"
                    : entry.type === "AGREEMENT"
                      ? "bg-amber-500"
                      : "bg-blue-500"
              }`}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">
                  {entry.title}
                </p>

                {entry.description ? (
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {entry.description}
                  </p>
                ) : null}
              </div>

              <div className="text-right">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {entry.type}
                </span>

                <p className="mt-2 text-xs text-slate-400">
                  {entry.occurredAt.toLocaleDateString("en-GB")}
                </p>
              </div>
            </div>

            {(entry.reference || entry.value != null || entry.createdBy) && (
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                {entry.reference ? (
                  <span>Reference: {entry.reference}</span>
                ) : null}

                {entry.value != null ? (
                  <span>
                    Value: £{entry.value.toLocaleString("en-GB")}
                  </span>
                ) : null}

                {entry.createdBy ? (
                  <span>Added by: {entry.createdBy}</span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )}
</section>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {["Quotes", "Agreements", "Sales History", "Tasks"].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="font-semibold text-slate-950">{item}</p>
            <p className="mt-2 text-sm text-slate-500">
              Coming next
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
