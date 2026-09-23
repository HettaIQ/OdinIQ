import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

export default async function HqDashboardPage() {
  await requireSuperAdmin();

  const [
    companyCount,
    activeCompanyCount,
    userCount,
    activeUserCount,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({
      where: {
        status: "ACTIVE",
      },
    }),
    prisma.user.count(),
    prisma.user.count({
      where: {
        active: true,
      },
    }),
  ]);

  const cards = [
    {
      label: "Companies",
      value: companyCount,
    },
    {
      label: "Active Companies",
      value: activeCompanyCount,
    },
    {
      label: "Users",
      value: userCount,
    },
    {
      label: "Active Users",
      value: activeUserCount,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
            OdinIQ Platform
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Odin HQ
          </h1>

          <p className="mt-2 text-slate-400">
            Manage OdinIQ companies and platform access.
          </p>
        </div>

        <Link
          href="/hq/companies/new"
          className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200"
        >
          Add Company
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-800 bg-slate-900 p-6"
          >
            <p className="text-sm text-slate-400">
              {card.label}
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              Companies
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              View and manage the companies using OdinIQ.
            </p>
          </div>

          <Link
            href="/hq/companies"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-800"
          >
            View Companies
          </Link>
        </div>
      </div>
    </div>
  );
}