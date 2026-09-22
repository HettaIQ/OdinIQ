"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type MobileNavProps = {
  canManageTeam: boolean;
};

export default function MobileNav({
  canManageTeam,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const navigationItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/commercial", label: "Commercial" },
    { href: "/tasks", label: "Tasks" },
    { href: "/opportunities", label: "Opportunities" },
    { href: "/products", label: "Products" },
    { href: "/warehouse", label: "Warehouse" },
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

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="relative lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="Open navigation menu"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-xl font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        {open ? "×" : "☰"}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/20"
          />

          <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-bold text-slate-950">
                Odin<span className="text-amber-500">IQ</span>
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                Navigation
              </p>
            </div>

            <nav className="max-h-[70vh] overflow-y-auto p-2">
              {navigationItems.map((item) => {
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-amber-50 text-amber-800"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}