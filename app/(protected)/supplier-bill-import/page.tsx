import { requireAuth } from "@/lib/auth/requireAuth";

import SupplierBillImporter from "./SupplierBillImporter";

export default async function SupplierBillImportPage() {
  const user = await requireAuth();

  const membership = user.memberships[0];

  if (!membership) {
    return null;
  }

  const canImport =
    user.platformRole === "SUPER_ADMIN" ||
    Boolean(
      membership.role?.permissions.some(
        ({ permission }) =>
          permission.key === "imports.manage",
      ),
    );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">
          Purchase Intelligence
        </p>

        <h1 className="text-2xl font-semibold text-slate-900">
          Import Supplier Bills
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Import supplier invoices to record actual products purchased,
          quantities and costs. Supplier bills are kept separate from
          purchase orders so purchases are not double counted.
        </p>
      </div>

      {canImport ? (
        <SupplierBillImporter />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">
            You do not have permission to import supplier bills.
          </p>
        </div>
      )}
    </div>
  );
}