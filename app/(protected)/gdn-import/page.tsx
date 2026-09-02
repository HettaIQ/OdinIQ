import Link from "next/link";

import { requireAuth } from "@/lib/auth/requireAuth";
import GdnImportUploader from "./GdnImportUploader";

export const dynamic = "force-dynamic";

export default async function GdnImportPage() {
  const user = await requireAuth();
  const membership = user.memberships[0];

  if (!membership) {
    throw new Error("No active company membership found.");
  }

  const canManage =
    membership.role?.name === "Company Admin" ||
    membership.role?.name === "Accounts";

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Link
        href="/despatch-audit"
        className="text-sm font-semibold text-amber-600 hover:text-amber-700"
      >
       ← Back to Despatch & Invoice Audit
      </Link>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          Sales & Despatch Intelligence
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Import Goods Despatched Notes
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Upload Sage Goods Despatched data so OdinIQ can track what physically
          left the warehouse and compare it against invoice history.
        </p>
      </div>

      {!canManage && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You can view GDN information, but only Company Admin and Accounts can
          import despatch data.
        </div>
      )}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
          Step 1
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-950">
          Upload Sage GDN export
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Use the Sage Goods Despatched Sales Order Report exported with
          Data to Excel.
        </p>

        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
  <GdnImportUploader />
</div>

</section>
</main>
);
}