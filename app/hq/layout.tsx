import type { ReactNode } from "react";
import Link from "next/link";

import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

type HqLayoutProps = {
  children: ReactNode;
};

export default async function HqLayout({
  children,
}: HqLayoutProps) {
  const user = await requireSuperAdmin();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link
              href="/hq"
              className="text-xl font-semibold tracking-tight"
            >
              OdinIQ HQ
            </Link>

            <nav className="flex items-center gap-6 text-sm text-slate-300">
              <Link
                href="/hq"
                className="hover:text-white"
              >
                Dashboard
              </Link>

              <Link
                href="/hq/companies"
                className="hover:text-white"
              >
                Companies
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">
              {user.name}
            </span>

            <Link
              href="/select-company"
              className="rounded-md border border-slate-700 px-3 py-2 hover:bg-slate-800"
            >
              Enter OdinIQ
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}