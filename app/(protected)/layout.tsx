import type { ReactNode } from "react";

import Sidebar from "@/app/components/Sidebar";
import TopBar from "@/app/components/TopBar";
import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedLayout({
  children,
}: ProtectedLayoutProps) {
  const {
    user,
    membership,
    company,
  } = await requireCompanyContext();

  const canManageTeam =
    membership.role?.name === "Company Admin" ||
    membership.role?.name === "Accounts";

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          userName={user.name}
          roleName={
            membership.role?.name ??
            user.platformRole
          }
          companyName={company.name}
          canManageTeam={canManageTeam}
        />

        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}