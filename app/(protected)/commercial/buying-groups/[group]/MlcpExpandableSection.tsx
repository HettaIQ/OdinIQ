"use client";

import { ReactNode, useState } from "react";

type MlcpExpandableSectionProps = {
  id: string;
  title: string;
  subtitle?: string;
  count: number;
  children: ReactNode;
  defaultOpen?: boolean;
};

export default function MlcpExpandableSection({
  id,
  title,
  subtitle,
  count,
  children,
  defaultOpen = false,
}: MlcpExpandableSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      id={id}
      className="scroll-mt-6 border-t border-slate-200"
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            {title}
          </p>

          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-900">
            {count}
          </span>

          <span className="text-lg font-bold text-slate-500">
            {open ? "−" : "+"}
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-5">
          {children}
        </div>
      )}
    </div>
  );
}