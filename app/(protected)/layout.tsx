import type { ReactNode } from "react";

import Sidebar from "@/app/components/Sidebar";
import TopBar from "@/app/components/TopBar";
import { requireAuth } from "@/lib/auth/requireAuth";

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedLayout({
  children,
}: ProtectedLayoutProps) {
  const user = await requireAuth();
  const membership = user.memberships[0];

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          userName={user.name}
          roleName={membership?.role?.name ?? user.platformRole}
          companyName={membership?.company.name ?? "No company assigned"}
        />

        <main className="flex-1 overflow-x-hidden p-8">
          {children}
        </main>
      </div>
    </div>
  );
}