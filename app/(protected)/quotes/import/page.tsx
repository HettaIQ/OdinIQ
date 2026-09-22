import Link from "next/link";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import QuoteImportUploader from "./QuoteImportUploader";

export const dynamic = "force-dynamic";

export default async function QuoteImportPage() {
  await requireCompanyContext();


  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Link
        href="/quotes"
        className="text-sm font-semibold text-amber-600 hover:text-amber-700"
      >
        ← Back to quotes
      </Link>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          Sage Quote Import
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Import quotations
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Upload a Sage quotation export. OdinIQ will identify quote numbers,
          customers, branches, buying groups, reps, quoters, values and quote
          lines before importing anything.
        </p>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
          Step 1
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-950">
          Upload Sage export
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          CSV and Excel files will be supported.
        </p>

        <div className="mt-6">
  <QuoteImportUploader />
</div>
      </section>
    </main>
  );
}
