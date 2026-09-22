import Link from "next/link";

import { completeTask } from "@/app/actions/completeTask";
import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type TasksPageProps = {
  searchParams: Promise<{
    scope?: string;
    status?: string;
    priority?: string;
  }>;
};

export default async function TasksPage({
  searchParams,
}: TasksPageProps) {
  const {
    user,
    membership,
    companyId,
  } = await requireCompanyContext();

  const canCompleteTasks =
    user.platformRole === "SUPER_ADMIN" ||
    Boolean(
      membership.role?.permissions.some(
        ({ permission }) =>
          permission.key === "tasks.complete",
      ),
    );

  const filters = await searchParams;

  const scope = filters.scope ?? "all";
  const status = filters.status ?? "all";
  const priority = filters.priority ?? "all";

  const tasks = await prisma.commercialTask.findMany({
    where: {
      companyId,

      ...(scope === "mine"
        ? {
            assignedMembershipId: membership.id,
          }
        : {}),

      ...(status !== "all"
        ? {
            status: status.toUpperCase(),
          }
        : {}),

      ...(priority !== "all"
        ? {
            priority: priority.toUpperCase(),
          }
        : {}),
    },
    include: {
      customer: true,
      assignedTo: {
        include: {
          user: true,
        },
      },
    },
    orderBy: [
      {
        status: "desc",
      },
      {
        priority: "asc",
      },
      {
        dueDate: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

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

  const openTasks = tasks.filter(
    (task) => task.status === "OPEN",
  );

  const openTaskCount = openTasks.length;

  const overdueCount = openTasks.filter(
    (task) =>
      task.dueDate &&
      task.dueDate < startOfToday,
  ).length;

  const dueTodayCount = openTasks.filter(
    (task) =>
      task.dueDate &&
      task.dueDate >= startOfToday &&
      task.dueDate < startOfTomorrow,
  ).length;

  const highPriorityCount = openTasks.filter(
    (task) => task.priority === "HIGH",
  ).length;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          Commercial Tasks
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Tasks dashboard
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Open actions, customer follow-ups and commercial priorities.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href={`/tasks?scope=all&status=${status}&priority=${priority}`}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            scope === "all"
              ? "bg-slate-950 text-white"
              : "border border-slate-300 bg-white text-slate-700"
          }`}
        >
          All tasks
        </Link>

        <Link
          href={`/tasks?scope=mine&status=${status}&priority=${priority}`}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            scope === "mine"
              ? "bg-slate-950 text-white"
              : "border border-slate-300 bg-white text-slate-700"
          }`}
        >
          My tasks
        </Link>

        <Link
          href={`/tasks?scope=${scope}&status=open&priority=${priority}`}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            status === "open"
              ? "bg-blue-600 text-white"
              : "border border-slate-300 bg-white text-slate-700"
          }`}
        >
          Open
        </Link>

        <Link
          href={`/tasks?scope=${scope}&status=completed&priority=${priority}`}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            status === "completed"
              ? "bg-emerald-600 text-white"
              : "border border-slate-300 bg-white text-slate-700"
          }`}
        >
          Completed
        </Link>

        <Link
          href={`/tasks?scope=${scope}&status=${status}&priority=high`}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            priority === "high"
              ? "bg-red-600 text-white"
              : "border border-slate-300 bg-white text-slate-700"
          }`}
        >
          High
        </Link>

        <Link
          href={`/tasks?scope=${scope}&status=${status}&priority=medium`}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            priority === "medium"
              ? "bg-amber-500 text-white"
              : "border border-slate-300 bg-white text-slate-700"
          }`}
        >
          Medium
        </Link>

        <Link
          href="/tasks"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Clear filters
        </Link>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Open tasks
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
            {openTaskCount}
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
            Overdue
          </p>

          <p className="mt-2 text-3xl font-bold text-red-700">
            {overdueCount}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Due today
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-800">
            {dueTodayCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            High priority
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {highPriorityCount}
          </p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-slate-900">
            No tasks found
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Customer tasks and Odin-approved actions will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Task
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Customer
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Assigned
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Priority
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Due
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-950">
                        {task.title}
                      </p>

                      {task.description ? (
                        <p className="mt-1 max-w-md text-sm text-slate-500">
                          {task.description}
                        </p>
                      ) : null}

                      <p className="mt-2 text-xs text-slate-400">
                        {task.type.replaceAll("_", " ")}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/customers/${task.customer.id}`}
                        className="font-semibold text-slate-900 hover:text-amber-600"
                      >
                        {task.customer.name}
                      </Link>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {task.assignedTo?.user?.name ??
                        task.assignedTo?.user?.email ??
                        "Unassigned"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          task.priority === "HIGH"
                            ? "bg-red-50 text-red-700"
                            : task.priority === "MEDIUM"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm">
                      {task.dueDate ? (
                        <span
                          className={
                            task.status === "OPEN" &&
                            task.dueDate < startOfToday
                              ? "font-semibold text-red-600"
                              : "text-slate-600"
                          }
                        >
                          {task.dueDate.toLocaleDateString(
                            "en-GB",
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          No due date
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          task.status === "OPEN"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      {task.status === "OPEN" ? (
                        canCompleteTasks ? (
                          <form
                            action={async () => {
                              "use server";

                              await completeTask(
                                task.id,
                              );
                            }}
                          >
                            <button
                              type="submit"
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Complete
                            </button>
                          </form>
                        ) : (
                          <span className="text-sm text-slate-400">
                            Read only
                          </span>
                        )
                      ) : (
                        <span className="text-sm font-semibold text-emerald-700">
                          ✓ Completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}