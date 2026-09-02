import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { updateCustomer } from "@/app/actions/updateCustomer";

type EditCustomerPageProps = {
  params: Promise<{
    customerId: string;
  }>;
};

export default async function EditCustomerPage({
  params,
}: EditCustomerPageProps) {
  const user = await requireAuth();
  const membership = user.memberships[0];
  const isAgent =
  membership?.role?.name === "Agent" ||
  membership?.role?.name === "Sales Agent";

  if (!membership) {
    throw new Error("No active company membership found.");
  }

  const { customerId } = await params;
  const id = Number(customerId);

  if (!Number.isInteger(id)) {
    notFound();
  }

  const customer = await prisma.customer.findFirst({
  where: {
    id,
    companyId: membership.companyId,
    ...(isAgent
      ? {
          assignedMembershipId: membership.id,
        }
      : {}),
  },
});

  if (!customer) {
    notFound();
  }

  return (
    <main className="space-y-6">
      <div>
        <Link
          href={`/commercial/customers/${customer.id}`}
          className="text-sm font-semibold text-amber-600 hover:text-amber-700"
        >
          ← Back to customer
        </Link>

        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-amber-600">
          Customer Management
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Edit {customer.name}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Sage account {customer.accountCode}
        </p>
      </div>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <form action={updateCustomer}>
  <input
    type="hidden"
    name="customerId"
    value={customer.id}
  />
        <input
  type="hidden"
  name="assignedMembershipId"
  value={customer.assignedMembershipId ?? ""}
/>
        <h2 className="text-lg font-semibold text-slate-950">
          Customer details
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Customer name
            </label>

            <input
              type="text"
              name="name"
              defaultValue={customer.name}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Account code
            </label>

            <input
              type="text"
              value={customer.accountCode}
              disabled
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Buying group
            </label>

            <input
              type="text"
              name="buyingGroup"
              defaultValue={customer.buyingGroup ?? ""}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Payment terms
            </label>

            <input
              type="text"
              name="paymentTerms"
              defaultValue={customer.paymentTerms ?? ""}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Discount %
            </label>

            <input
              type="number"
              name="discount"
              step="0.01"
              defaultValue={customer.discount ?? ""}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
            />
          </div>

{!isAgent && (
  <>
    <div>
      <label className="text-sm font-semibold text-slate-700">
        Credit limit
      </label>

      <div className="mt-2 flex overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-amber-500">
        <span className="flex items-center border-r border-slate-300 bg-slate-50 px-3 font-semibold text-slate-600">
          £
        </span>

        <input
          type="text"
          name="creditLimit"
          defaultValue={
            customer.creditLimit != null
              ? Number(customer.creditLimit).toLocaleString("en-GB", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : ""
          }
          className="w-full px-3 py-2 text-sm outline-none"
        />
      </div>
    </div>

    <div>
      <label className="text-sm font-semibold text-slate-700">
        Current balance
      </label>

      <div className="mt-2 flex overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-amber-500">
        <span className="flex items-center border-r border-slate-300 bg-slate-50 px-3 font-semibold text-slate-600">
          £
        </span>

        <input
          type="text"
          name="currentBalance"
          defaultValue={
            customer.currentBalance != null
              ? Number(customer.currentBalance).toLocaleString("en-GB", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : ""
          }
          className="w-full px-3 py-2 text-sm outline-none"
        />
      </div>
    </div>
  </>
)}

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Account status
            </label>

            <select
            name="status"
              defaultValue={customer.status}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Link
            href={`/commercial/customers/${customer.id}`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Save changes
          </button>
        </div>
        </form>
      </section>
    </main>
  );
}