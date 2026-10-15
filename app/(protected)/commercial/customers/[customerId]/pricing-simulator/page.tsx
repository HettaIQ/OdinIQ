import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";
import { calculateNetSalesYTD } from "@/lib/commercial/salesCalculations";
import PricingSimulator from "./PricingSimulator";

type Props = {
  params: Promise<{
    customerId: string;
  }>;
  searchParams: Promise<{
    businessUnitId?: string;
  }>;
};

export default async function PricingSimulatorPage({
  params,
  searchParams,
}: Props) {
  const { membership, companyId } =
    await requireCompanyContext();

  const permission = membership.role?.id
    ? await prisma.rolePermission.findFirst({
        where: {
          roleId: membership.role.id,
          permission: {
            key: "commercial.profitability.view",
          },
        },
        select: {
          roleId: true,
        },
      })
    : null;

  if (!permission) {
    notFound();
  }

  const { customerId } = await params;
  const id = Number(customerId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    notFound();
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id,
      companyId,
    },
    select: {
      id: true,
      name: true,
      accountCode: true,
    },
  });

  if (!customer) {
    notFound();
  }

  const { businessUnitId } = await searchParams;

  const requestedBusinessUnitId =
    businessUnitId === undefined ||
    businessUnitId === "all"
      ? null
      : Number(businessUnitId);

  const selectedBusinessUnitId =
    requestedBusinessUnitId !== null &&
    Number.isSafeInteger(requestedBusinessUnitId) &&
    requestedBusinessUnitId > 0
      ? requestedBusinessUnitId
      : null;

  const validatedBusinessUnit =
    selectedBusinessUnitId !== null
      ? await prisma.businessUnit.findFirst({
          where: {
            id: selectedBusinessUnitId,
            companyId,
          },
          select: {
            id: true,
          },
        })
      : null;

  const validatedBusinessUnitId =
    validatedBusinessUnit?.id ?? null;

  const today = new Date();
  const currentYear = today.getFullYear();

  const invoices = await prisma.salesInvoice.findMany({
    where: {
      companyId,
      customerAccountCode: customer.accountCode,
      ...(validatedBusinessUnitId !== null
        ? {
            businessUnitId: validatedBusinessUnitId,
          }
        : {}),
    },
    select: {
      invoiceType: true,
      customerOrderNumber: true,
      netValue: true,
      invoiceDate: true,
    },
  });

  const actualSalesYTD = calculateNetSalesYTD(
    invoices,
    currentYear,
    today
  );

  return (
    <main className="mx-auto max-w-7xl p-6">
      <Link
        href={`/commercial/customers/${customer.id}`}
        className="text-sm underline"
      >
        Back to customer
      </Link>

      <PricingSimulator
        customerName={customer.name}
        actualAnnualSales={actualSalesYTD}
      />
    </main>
  );
}
