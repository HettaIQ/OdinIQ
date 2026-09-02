import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";
type PageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function CustomersPage({
  searchParams,
}: PageProps) {
  const user = await requireAuth();
  const membership = user.memberships[0];
  const isSalesAgent = membership.role?.name === "Sales Agent";
  const { q } = await searchParams;
const search = String(q ?? "").trim();

  if (!membership) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        No active company membership was found for this account.
      </div>
    );
  }
  const customers = await prisma.customer.findMany({
where: {
  companyId: membership.companyId,

  ...(isSalesAgent
    ? {
        assignedMembershipId: membership.id,
      }
    : {}),

  ...(search
    ? {
        OR: [
          {
            accountCode: {
              contains: search,
            },
          },
          {
            name: {
              contains: search,
            },
          },
        ],
      }
    : {}),
},
  orderBy: {
    name: "asc",
  },
});

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold text-amber-600">
          Commercial CRM
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Customers
        </h1>

        <p className="mt-2 text-slate-600">
          Review customer accounts, credit exposure, buying groups and commercial activity.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Customer Explorer
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {customers.length} customer{customers.length === 1 ? "" : "s"}
              </p>
            </div>

            <button
              type="button"
              className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Add customer
            </button>
          </div>
        </div>
<form
  method="GET"
  className="border-t border-slate-200 bg-slate-50 px-6 py-4"
>
  <div className="flex max-w-2xl items-center gap-3">
    <input
      type="search"
      name="q"
      defaultValue={search}
      placeholder="Search by customer name or account code..."
      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500"
    />

    <button
      type="submit"
      className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
    >
      Search
    </button>

    {search && (
      <Link
        href="/customers"
        className="whitespace-nowrap text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        Clear
      </Link>
    )}
  </div>
</form>
        {customers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-900">
              No customers yet
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Add your first customer or import customer data to begin building the commercial CRM.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4">Account</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Buying Group</th>
                  <th className="px-6 py-4">Last Order</th>
                  <th className="px-6 py-4">Credit Limit</th>
                  <th className="px-6 py-4">Balance</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {customers.map((customer) => (
                  <tr
  key={customer.id}
  className="transition hover:bg-slate-50"
>
  <td className="px-6 py-4 text-sm font-medium text-slate-700">
    <Link
      href={`/customers/${customer.id}`}
      className="block"
    >
      {customer.accountCode}
    </Link>
  </td>

  <td className="px-6 py-4">
    <Link
      href={`/customers/${customer.id}`}
      className="block"
    >
      <p className="font-semibold text-slate-900">
        {customer.name}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {customer.town ?? "Location not set"}
      </p>
    </Link>
  </td>

  <td className="px-6 py-4 text-sm text-slate-600">
    <Link
      href={`/customers/${customer.id}`}
      className="block"
    >
      {customer.buyingGroup ?? "—"}
    </Link>
  </td>
<td className="px-6 py-4 text-sm text-slate-600">
  <Link
    href={`/customers/${customer.id}`}
    className="block"
  >
    {customer.lastInvoiceDate
      ? customer.lastInvoiceDate.toLocaleDateString("en-GB")
      : "No sales history"}
  </Link>
</td>
  <td className="px-6 py-4 text-sm text-slate-600">
    <Link
      href={`/customers/${customer.id}`}
      className="block"
    >
      {customer.creditLimit != null
        ? `£${customer.creditLimit.toLocaleString("en-GB")}`
        : "—"}
    </Link>
  </td>

  <td className="px-6 py-4 text-sm text-slate-600">
    <Link
      href={`/customers/${customer.id}`}
      className="block"
    >
      {customer.currentBalance != null
        ? `£${customer.currentBalance.toLocaleString("en-GB")}`
        : "£0"}
    </Link>
  </td>

  <td className="px-6 py-4">
    <Link
      href={`/customers/${customer.id}`}
      className="block"
    >
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        {customer.status}
      </span>
    </Link>
  </td>
</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
