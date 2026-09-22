import Link from "next/link";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";
import { createTeamMember } from "@/app/actions/createTeamMember";

export const dynamic = "force-dynamic";

export default async function NewTeamMemberPage() {
  const {
    companyId,
  } = await requireCompanyContext();

  const roles = await prisma.role.findMany({
    where: {
      companyId,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <Link
        href="/team"
        className="text-sm font-semibold text-amber-600 hover:text-amber-700"
      >
        ← Back to team
      </Link>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          Team Management
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Add user
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Create a new company user and assign their role.
        </p>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form
  action={createTeamMember}
  className="grid gap-5 md:grid-cols-2"
>
  <div>
            <label className="text-sm font-semibold text-slate-700">
              Name
            </label>

            <input
              type="text"
              name="name"
              required
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Email
            </label>

            <input
              type="email"
              name="email"
              required
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Role
            </label>

            <select
              name="roleId"
              required
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select role</option>

              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Agent code
            </label>

            <input
              type="text"
              name="agentCode"
              placeholder="Optional"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Add user
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
