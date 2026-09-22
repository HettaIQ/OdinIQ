import Link from "next/link";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import CustomerImportUploader from "./CustomerImportUploader";

export const dynamic = "force-dynamic";

export default async function CustomerImportPage() {
  await requireCompanyContext();

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Link
        href="/customers"
        className="text-sm font-semibold text-amber-600 hover:text-amber-700"
      >
        ← Back to customers
      </Link>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          Customer Master Import
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Import Sage customers
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Upload the Sage customer export. OdinIQ will match customers by account
          code and preview changes to credit limits, sales agents and buying
          groups before anything is updated.
        </p>
      </div>

     <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
    Step 1
  </p>

  <h2 className="mt-1 text-xl font-bold text-slate-950">
    Upload customer file
  </h2>

  <p className="mt-2 text-sm text-slate-500">
    Use the Sage customer list export in CSV or Excel format.
  </p>

  <div className="mt-6">
    <CustomerImportUploader />
  </div>
</section>
    </main>
  );
}
