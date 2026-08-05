"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

const navigation = [
  { label: "Dashboard", href: "/" },
  { label: "Agreements", href: "/agreements" },
  { label: "Customers", href: "/customers" },
  { label: "Products", href: "/products" },
  { label: "Price Lists", href: "/products/import" },
  { label: "Quotes", href: "/quotes" },
  { label: "Sales", href: "/sales" },
];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-800 bg-black lg:flex lg:flex-col">
        <div className="border-b border-zinc-800 px-6 py-6">
          <Link href="/" className="block">
            <p className="text-2xl font-bold tracking-tight">
              ODIN<span className="text-yellow-400">IQ</span>
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Commercial Intelligence
            </p>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          {navigation.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-yellow-400 text-black"
                    : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-800 p-4">
          <Link
            href="/settings"
            className="block rounded-lg px-4 py-3 text-sm font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
          >
            Settings
          </Link>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-5 lg:px-8">
            <div className="lg:hidden">
              <Link href="/" className="text-xl font-bold">
                ODIN<span className="text-yellow-400">IQ</span>
              </Link>
            </div>

            <div className="ml-auto flex w-full max-w-xl items-center gap-3">
              <Link
                href="/ask-odin"
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400 transition hover:border-yellow-400 hover:text-white"
              >
                Ask Odin anything...
              </Link>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 text-sm font-bold text-black">
                JG
              </div>
            </div>
          </div>
        </header>

        <main className="px-5 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}