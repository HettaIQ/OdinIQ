import InvoiceImportUploader from "./InvoiceImportUploader";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";

export const dynamic = "force-dynamic";

export default async function InvoiceImportPage() {
  const {
    membership,
  } = await requireCompanyContext();

  const canManage =
    Boolean(
      membership.role?.permissions.some(
        ({ permission }) =>
          permission.key === "imports.manage",
      ),
    );

  if (!canManage) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-bold text-slate-950">
          Import Sales Invoices
        </h1>

        <p className="mt-3 text-sm text-slate-500">
          You do not have permission to import invoice data.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
        Sales & Invoice Intelligence
      </p>

      <h1 className="mt-2 text-3xl font-bold text-slate-950">
        Import Sales Invoices
      </h1>

      <p className="mt-2 text-sm text-slate-500">
        Upload Sage invoice data so OdinIQ can compare invoiced items against
        Goods Despatched Notes.
      </p>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
          Step 1
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-950">
          Upload Sage invoice export
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Use the Sage Invoices And Credits By Customer (Detailed) report
          exported with Data to Excel.
        </p>

        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <InvoiceImportUploader />
        </div>
      </section>
    </main>
  );
}