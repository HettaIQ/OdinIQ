import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";
import { updateTeamMember } from "@/app/actions/updateTeamMember";
import { reassignCustomer } from "@/app/actions/reassignCustomer";

type TeamMemberPageProps = {
  params: Promise<{
    membershipId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function TeamMemberPage({
  params,
}: TeamMemberPageProps) {
  const {
    companyId,
  } = await requireCompanyContext();

  const { membershipId } = await params;
  const id = Number(membershipId);

  if (!Number.isInteger(id)) {
    notFound();
  }

  const member = await prisma.companyMembership.findFirst({
    where: {
      id,
      companyId: companyId,
    },
    include: {
      user: true,
      role: true,
    },
  });

  if (!member) {
    notFound();
  }
  const availableOwners = await prisma.companyMembership.findMany({
  where: {
    companyId: companyId,
    active: true,
    role: {
      name: {
        in: ["Agent", "Sales Agent"],
      },
    },
  },
  include: {
    user: true,
    role: true,
  },
  orderBy: {
    user: {
      name: "asc",
    },
  },
});
const roles = await prisma.role.findMany({
  where: {
    companyId: companyId,
  },
  orderBy: {
    name: "asc",
  },
});
const allocatedCustomers = await prisma.customer.findMany({
  where: {
    companyId: companyId,
    assignedMembershipId: member.id,
  },
  orderBy: {
    name: "asc",
  },
});

const allocatedAccountCodes = allocatedCustomers.map(
  (customer) => customer.accountCode
);

const allocatedInvoices = await prisma.salesInvoice.findMany({
  where: {
    companyId: companyId,
    customerAccountCode: {
      in: allocatedAccountCodes,
    },
  },
});

const repNetSales = allocatedInvoices.reduce((total, invoice) => {
  const type = String(invoice.invoiceType ?? "")
    .trim()
    .toUpperCase();

  const value = Number(invoice.netValue ?? 0);

  if (type === "CRD" || type === "CREDIT") {
    return total - value;
  }

  return total + value;
}, 0);


const currentYear = new Date().getFullYear();

const repYtdSales = allocatedInvoices.reduce((total, invoice) => {
  if (!invoice.invoiceDate) {
    return total;
  }

  if (invoice.invoiceDate.getFullYear() !== currentYear) {
    return total;
  }

  const type = String(invoice.invoiceType ?? "")
    .trim()
    .toUpperCase();

  const value = Number(invoice.netValue ?? 0);

  if (type === "CRD" || type === "CREDIT") {
    return total - value;
  }

  return total + value;
}, 0);

const updateMember = updateTeamMember.bind(null, member.id);
  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Link
        href="/team"
        className="text-sm font-semibold text-amber-600 hover:text-amber-700"
      >
        ← Back to team
      </Link>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          Team Member
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          {member.user.name ?? "Unnamed user"}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {member.user.email}
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Role
          </p>
          <p className="mt-2 text-xl font-bold text-slate-950">
            {member.role?.name ?? "No role"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Agent code
          </p>
          <p className="mt-2 text-xl font-bold text-slate-950">
            {member.agentCode ?? "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Status
          </p>
          <p className="mt-2 text-xl font-bold text-white">
            {member.active ? "ACTIVE" : "INACTIVE"}
          </p>
        </div>
      </div>

<section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
    User Management
  </p>

  <h2 className="mt-1 text-xl font-bold text-slate-950">
    Edit team member
  </h2>

  <form action={updateMember} className="mt-6 grid gap-5 md:grid-cols-3">
    <div>
      <label className="text-sm font-semibold text-slate-700">
        Role
      </label>

      <select
        name="roleId"
        defaultValue={member.roleId ?? ""}
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        required
      >
        <option value="" disabled>
          Select role
        </option>

        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className="text-sm font-semibold text-slate-700">
        Sage Agent
      </label>

      <input
        type="text"
        name="agentCode"
        defaultValue={member.agentCode ?? ""}
        placeholder="Only required for Sales Agents"
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label className="text-sm font-semibold text-slate-700">
        Status
      </label>

      <select
        name="active"
        defaultValue={member.active ? "true" : "false"}
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>
    </div>

    <div className="md:col-span-3">
      <button
        type="submit"
        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Save changes
      </button>
    </div>
  </form>
</section>
<section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
  <div className="border-b border-slate-200 px-6 py-5">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
          Account Ownership
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-950">
          Allocated customers
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Customers currently assigned to this team member.
        </p>
      </div>

      <div className="flex gap-3">
  <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      Accounts
    </p>
    <p className="mt-1 text-2xl font-bold text-slate-950">
      {allocatedCustomers.length}
    </p>
  </div>

  <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {currentYear} YTD Sales
    </p>
    <p className="mt-1 text-2xl font-bold text-slate-950">
      £{repYtdSales.toLocaleString("en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </p>
  </div>

  <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      Total Sales
    </p>
    <p className="mt-1 text-2xl font-bold text-slate-950">
      £{repNetSales.toLocaleString("en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </p>
  </div>
</div>
    </div>
  </div>

  {allocatedCustomers.length > 0 ? (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
  <th className="px-6 py-3">Customer</th>
  <th className="px-6 py-3">Account</th>
  <th className="px-6 py-3">Buying Group</th>
  <th className="px-6 py-3">Status</th>
  <th className="px-6 py-3">Reassign</th>
</tr>
        </thead>

        <tbody className="divide-y divide-slate-200">
          {allocatedCustomers.map((customer) => (
            <tr key={customer.id} className="hover:bg-slate-50">
              <td className="px-6 py-4">
                <Link
                  href={`/commercial/customers/${customer.id}`}
                  className="font-semibold text-slate-950 hover:text-amber-600 hover:underline"
                >
                  {customer.name}
                </Link>
              </td>

              <td className="px-6 py-4 text-slate-600">
                {customer.accountCode}
              </td>

              <td className="px-6 py-4 text-slate-600">
                {customer.buyingGroup ?? "—"}
              </td>

              <td className="px-6 py-4">
                <span
                  className={
                    customer.accountOnHold
                      ? "font-semibold text-red-700"
                      : "font-semibold text-emerald-700"
                  }
                >
                  {customer.accountOnHold ? "ON HOLD" : customer.status}
                </span>
              </td>
              <td className="px-6 py-4">
  <form action={reassignCustomer} className="flex items-center gap-2">
    <input
      type="hidden"
      name="customerId"
      value={customer.id}
    />

    <select
      name="assignedMembershipId"
      defaultValue={member.id}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
    >
      {availableOwners.map((owner) => (
        <option key={owner.id} value={owner.id}>
          {owner.user.name
  ? owner.user.name
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase())
  : owner.user.email}
        </option>
      ))}
    </select>

    <button
      type="submit"
      className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
    >
      Move
    </button>
  </form>
</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="px-6 py-8 text-sm text-slate-500">
      No customers are currently allocated to this team member.
    </div>
  )}
</section>
    </main>
  );
}
