import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const user = await requireAuth();
  const membership = user.memberships[0];

  if (!membership) {
    throw new Error("No active company membership found.");
  }

const canManageTeam =
  membership.role?.name === "Company Admin" ||
  membership.role?.name === "Accounts";

if (!canManageTeam) {
  throw new Error("You do not have permission to access the Team area.");
}

  const teamMembers = await prisma.companyMembership.findMany({
    where: {
      companyId: membership.companyId,
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

  const roles = await prisma.role.findMany({
    where: {
      companyId: membership.companyId,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
     <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
  <div>
    <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
      Company Settings
    </p>

    <h1 className="mt-1 text-3xl font-bold text-slate-950">
      Team & Users
    </h1>

    <p className="mt-2 text-sm text-slate-500">
      Manage company users, roles, access and commercial responsibilities.
    </p>
  </div>

  <Link
    href="/team/new"
    className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
  >
    + Add user
  </Link>
</div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Team members
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {teamMembers.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Active
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {teamMembers.filter((member) => member.active).length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Roles
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {roles.length}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Role
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Agent code
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {teamMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
  <Link
    href={`/team/${member.id}`}
    className="font-semibold text-slate-950 hover:text-amber-600"
  >
    {member.user.name
  ? member.user.name
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  : "Unnamed user"}
  </Link>
</td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {member.user.email}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-700">
                    {member.role?.name ?? "No role"}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {member.agentCode ?? "—"}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        member.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {member.active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}