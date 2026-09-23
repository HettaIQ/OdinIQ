import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { switchCompany } from "@/app/actions/switchCompany";

export default async function CompaniesPage() {
  const user = await requireSuperAdmin();

  const companies = await prisma.company.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      memberships: {
        where: {
          active: true,
        },
        include: {
          user: true,
          role: true,
        },
      },
    },
  });

  /*
   * A SUPER_ADMIN can see every company in HQ,
   * but may only enter companies where they have
   * an active CompanyMembership.
   *
   * switchCompany() performs the same validation
   * again server-side before changing the session.
   */
  const accessibleCompanyIds = new Set(
    companies
      .filter((company) =>
        company.memberships.some(
          (membership) =>
            membership.userId === user.id
        )
      )
      .map((company) => company.id)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
            OdinIQ Platform
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Companies
          </h1>

          <p className="mt-2 text-slate-400">
            Manage the companies using OdinIQ.
          </p>
        </div>

        <Link
          href="/hq/companies/new"
          className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200"
        >
          Add Company
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">
                  Company
                </th>

                <th className="px-6 py-4 font-medium">
                  Status
                </th>

                <th className="px-6 py-4 font-medium">
                  Users
                </th>

                <th className="px-6 py-4 font-medium">
                  Company Admin
                </th>

                <th className="px-6 py-4 font-medium">
                  Slug
                </th>

                <th className="px-6 py-4 text-right font-medium">
                  Access
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {companies.map((company) => {
                const admins =
                  company.memberships.filter(
                    (membership) =>
                      membership.role?.name ===
                      "Company Admin"
                  );

                const canEnter =
                  accessibleCompanyIds.has(
                    company.id
                  );

                return (
                  <tr
                    key={company.id}
                    className="hover:bg-slate-800/40"
                  >
                    <td className="px-6 py-5">
                      {canEnter ? (
                        <form action={switchCompany}>
                          <input
                            type="hidden"
                            name="companyId"
                            value={company.id}
                          />

                          <button
                            type="submit"
                            className="text-left"
                          >
                            <div className="font-medium text-white hover:text-amber-400">
                              {company.name}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              Company ID{" "}
                              {company.id}
                            </div>
                          </button>
                        </form>
                      ) : (
                        <>
                          <div className="font-medium text-white">
                            {company.name}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            Company ID{" "}
                            {company.id}
                          </div>
                        </>
                      )}
                    </td>

                    <td className="px-6 py-5">
                      <span className="inline-flex rounded-full border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300">
                        {company.status}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-slate-300">
                      {
                        company.memberships
                          .length
                      }
                    </td>

                    <td className="px-6 py-5">
                      {admins.length > 0 ? (
                        <div className="space-y-1">
                          {admins.map(
                            (admin) => (
                              <div
                                key={admin.id}
                              >
                                <div className="text-slate-200">
                                  {
                                    admin.user
                                      .name
                                  }
                                </div>

                                <div className="text-xs text-slate-500">
                                  {
                                    admin.user
                                      .email
                                  }
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">
                          No admin assigned
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-5 font-mono text-xs text-slate-500">
                      {company.slug}
                    </td>

                    <td className="px-6 py-5 text-right">
                      {canEnter ? (
                        <form
                          action={switchCompany}
                        >
                          <input
                            type="hidden"
                            name="companyId"
                            value={company.id}
                          />

                          <button
                            type="submit"
                            className="inline-flex rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:border-amber-500 hover:text-amber-400"
                          >
                            Enter Company
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-slate-600">
                          No membership
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {companies.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No companies have been created yet.
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