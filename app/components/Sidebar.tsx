import Link from "next/link";
import { requireAuth } from "@/lib/auth/requireAuth";



export default async function Sidebar() {
  const user = await requireAuth();
  const membership = user.memberships[0];

  const canManageTeam =
    membership?.role?.name === "Company Admin" ||
    membership?.role?.name === "Accounts";

    const navigationItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/commercial", label: "Commercial" },
  { href: "/tasks", label: "Tasks" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/products", label: "Products" },
  { href: "/commercial/customers", label: "Customers" },
  { href: "/quotes", label: "Quotes" },
  { href: "/agreements", label: "Agreements" },
  { href: "/pricing", label: "Pricing" },
  { href: "/crm", label: "CRM" },
  { href: "/reports", label: "Reports" },
  { href: "/ask-odin", label: "Ask Odin" },

  ...(canManageTeam
    ? [{ href: "/team", label: "Team" }]
    : []),

  { href: "/settings", label: "Settings" },
];
  return (
    <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-950 text-white lg:flex">
      <div className="border-b border-slate-800 px-6 py-6">
        <p className="text-2xl font-bold tracking-tight">
          Odin<span className="text-amber-400">IQ</span>
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Commercial Intelligence
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-slate-800 px-6 py-5">
        <p className="text-xs font-medium text-amber-400">
          Odin is monitoring
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Commercial signals are active
        </p>
      </div>
    </aside>
  );
}