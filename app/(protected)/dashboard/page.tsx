import Link from "next/link";

import OdinIntelligence from "@/app/components/ui/OdinIntelligence";
import StatCard from "@/app/components/ui/StatCard";
import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { completeTask } from "@/app/actions/completeTask";

export default async function DashboardPage() {
  const user = await requireAuth();
  const membership = user.memberships[0];

const openTasks = membership
  ? await prisma.commercialTask.findMany({
      where: {
        companyId: membership.companyId,
        status: "OPEN",
      },
      include: {
        customer: true,
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
    })
  : [];
const now = new Date();

const startOfToday = new Date(
  now.getFullYear(),
  now.getMonth(),
  now.getDate(),
);

const startOfTomorrow = new Date(
  now.getFullYear(),
  now.getMonth(),
  now.getDate() + 1,
);

const overdueTasks = openTasks.filter(
  (task) => task.dueDate && task.dueDate < startOfToday,
);

const dueTodayTasks = openTasks.filter(
  (task) =>
    task.dueDate &&
    task.dueDate >= startOfToday &&
    task.dueDate < startOfTomorrow,
);

const highPriorityTasks = openTasks.filter(
  (task) => task.priority === "HIGH",
);

const priorityTasks = [...openTasks]
  .sort((a, b) => {
    const aOverdue =
      a.dueDate && a.dueDate < startOfToday ? 1 : 0;
    const bOverdue =
      b.dueDate && b.dueDate < startOfToday ? 1 : 0;

    if (aOverdue !== bOverdue) {
      return bOverdue - aOverdue;
    }

    if (a.priority === "HIGH" && b.priority !== "HIGH") {
      return -1;
    }

    if (b.priority === "HIGH" && a.priority !== "HIGH") {
      return 1;
    }

    return 0;
  })
  .slice(0, 5);
  const openOpportunityCount = membership
  ? await prisma.commercialOpportunity.count({
      where: {
        companyId: membership.companyId,
        status: "OPEN",
      },
    })
  : 0;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-amber-600">
          Commercial Command Centre
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Welcome back, {user.name}
        </h1>

        <p className="mt-2 text-slate-600">
          Here is your latest commercial overview.
        </p>
      </section>
<section className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
        Odin Intelligence
      </p>

      <h2 className="mt-1 text-2xl font-bold">
        Commercial priorities
      </h2>

      <p className="mt-2 text-sm text-slate-300">
        The actions that need attention first.
      </p>
    </div>

    <Link
      href="/tasks"
      className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
    >
      View all tasks
    </Link>
  </div>

  <div className="mt-6 grid gap-4 md:grid-cols-3">
    <div className="rounded-xl border border-red-900 bg-red-950/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-red-300">
        Overdue
      </p>
      <p className="mt-2 text-3xl font-bold">
        {overdueTasks.length}
      </p>
    </div>

    <div className="rounded-xl border border-amber-800 bg-amber-950/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
        Due today
      </p>
      <p className="mt-2 text-3xl font-bold">
        {dueTodayTasks.length}
      </p>
    </div>

    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
        High priority
      </p>
      <p className="mt-2 text-3xl font-bold">
        {highPriorityTasks.length}
      </p>
    </div>
  </div>

  <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
    {priorityTasks.length === 0 ? (
      <div className="p-5 text-sm text-slate-300">
        No open commercial priorities.
      </div>
    ) : (
      <div className="divide-y divide-slate-800">
        {priorityTasks.map((task) => {
          const isOverdue =
            task.dueDate && task.dueDate < startOfToday;

          return (
            <div
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 px-5 py-4"
            >
              <div>
                <Link
                  href={`/customers/${task.customerId}`}
                  className="font-semibold text-white hover:text-amber-400"
                >
                  {task.title}
                </Link>

                <p className="mt-1 text-sm text-slate-400">
                  {task.customer.name}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    task.priority === "HIGH"
                      ? "bg-red-950 text-red-300"
                      : task.priority === "MEDIUM"
                        ? "bg-amber-950 text-amber-300"
                        : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {task.priority}
                </span>

                <span
                  className={`text-sm font-semibold ${
                    isOverdue
                      ? "text-red-400"
                      : "text-slate-300"
                  }`}
                >
                  {task.dueDate
                    ? task.dueDate.toLocaleDateString("en-GB")
                    : "No due date"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
</section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sales today"
          value="£28,430"
          change="+12.4% compared with yesterday"
          trend="up"
        />

        <StatCard
  label="Quotes waiting"
  value="—"
  change="Quote module coming soon"
  trend="neutral"
/>

        <StatCard
          label="Margin at risk"
          value="£12,800"
          change="+£2,100 this week"
          trend="down"
        />

        <StatCard
  label="Open opportunities"
  value={String(openOpportunityCount)}
  change="Live commercial opportunities"
  trend="up"
/>
      </section>
<section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
    <div>
      <p className="text-sm font-semibold text-amber-600">
        Today&apos;s Priorities
      </p>

      <h2 className="mt-1 text-xl font-bold text-slate-950">
        Commercial actions
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Open tasks requiring commercial attention.
      </p>
    </div>

    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
      {openTasks.length} open
    </span>
  </div>

  {openTasks.length === 0 ? (
    <div className="px-6 py-12 text-center">
      <p className="font-semibold text-slate-900">
        No open commercial tasks
      </p>

      <p className="mt-2 text-sm text-slate-500">
        Odin has no outstanding actions to surface.
      </p>
    </div>
  ) : (
    <div className="divide-y divide-slate-100">
      {openTasks.map((task) => (
       <div
  key={task.id}
  className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 transition hover:bg-slate-50"
>
  <Link
    href={`/customers/${task.customerId}`}
    className="min-w-0 flex-1"
  >
    <div className="flex flex-wrap items-center gap-3">
      <p className="font-semibold text-slate-950">
        {task.title}
      </p>

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

      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          getDueStatus(task.dueDate).className
        }`}
      >
        {getDueStatus(task.dueDate).label}
      </span>
    </div>

    <p className="mt-1 text-sm text-slate-600">
      {task.customer.name}
    </p>

    {task.description ? (
      <p className="mt-2 text-sm text-slate-500">
        {task.description}
      </p>
    ) : null}
  </Link>

  <div className="flex items-center gap-3">
    <Link
      href={`/customers/${task.customerId}`}
      className="text-sm font-semibold text-amber-600"
    >
      Open customer →
    </Link>

    <form
      action={async () => {
        "use server";
        await completeTask(task.id);
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        Complete
      </button>
    </form>
  </div>
</div>
      ))}
    </div>
  )}
</section>

      <OdinIntelligence />
    </div>
  );
}
function getDueStatus(dueDate: Date | null) {
  if (!dueDate) {
    return {
      label: "NO DUE DATE",
      className: "bg-slate-100 text-slate-600",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (due < today) {
    return {
      label: "OVERDUE",
      className: "bg-red-100 text-red-700",
    };
  }

  if (due.getTime() === today.getTime()) {
    return {
      label: "TODAY",
      className: "bg-red-50 text-red-700",
    };
  }

  if (due.getTime() === tomorrow.getTime()) {
    return {
      label: "TOMORROW",
      className: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: due.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    }),
    className: "bg-slate-100 text-slate-600",
  };
}