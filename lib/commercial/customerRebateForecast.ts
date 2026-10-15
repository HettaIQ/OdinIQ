
import { prisma } from "@/lib/prisma";

import {
  calculateRebateSalesPeriods,
  type RebateFrequency,
} from "@/lib/commercial/rebateForecastCalculations";

type CustomerRebateForecastInput = {
  companyId: number;
  customerId: number;
  businessUnitId: number;
  year: number;
  frequency: RebateFrequency;
  asOfDate?: Date;
};

export async function getCustomerRebateSales({
  companyId,
  customerId,
  businessUnitId,
   year,
  frequency,
  asOfDate,
}: CustomerRebateForecastInput) {
  // Validate the request.
  if (
    !Number.isSafeInteger(companyId) ||
    companyId <= 0 ||
    !Number.isSafeInteger(customerId) ||
    customerId <= 0 ||
    !Number.isSafeInteger(businessUnitId) ||
    businessUnitId <= 0 ||
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 9998
  ) {
    throw new Error("Invalid rebate sales request.");
  }

  // Find the customer within the correct company.
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      companyId,
    },
    select: {
      id: true,
      name: true,
      accountCode: true,
      parentCustomerId: true,
    },
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  // If a trading account is supplied, resolve its parent.
  const parentId = customer.parentCustomerId ?? customer.id;

  const parent = await prisma.customer.findFirst({
    where: {
      id: parentId,
      companyId,
    },
    select: {
      id: true,
      name: true,
      accountCode: true,
    },
  });

  if (!parent) {
    throw new Error("Parent customer not found.");
  }

  // Include the parent and directly linked trading accounts.
  const linkedCustomers = await prisma.customer.findMany({
    where: {
      companyId,
      OR: [
        { id: parent.id },
        { parentCustomerId: parent.id },
      ],
    },
    select: {
      id: true,
      name: true,
      accountCode: true,
    },
  });

  // Remove empty and duplicate Sage account codes.
  const accountCodes = [
    ...new Set(
      linkedCustomers
        .map((linked) => linked.accountCode.trim())
        .filter(Boolean)
    ),
  ];

  if (accountCodes.length === 0) {
    throw new Error("No customer account codes found.");
  }

  const periodStart = new Date(year, 0, 1);
const periodEnd = new Date(year + 1, 0, 1);

if (
  asOfDate !== undefined &&
  (!(asOfDate instanceof Date) ||
    !Number.isFinite(asOfDate.getTime()))
) {
  throw new Error("Invalid rebate sales cut-off date.");
}

const cutoffEnd = asOfDate
  ? new Date(
      asOfDate.getFullYear(),
      asOfDate.getMonth(),
      asOfDate.getDate() + 1
    )
  : periodEnd;

const effectiveEnd =
  cutoffEnd < periodEnd ? cutoffEnd : periodEnd;

  // Retrieve invoices once, across all linked accounts.
  const invoices = await prisma.salesInvoice.findMany({
    where: {
      companyId,
      businessUnitId,
      customerAccountCode: {
        in: accountCodes,
      },
      invoiceDate: {
  gte: periodStart,
  lt: periodEnd,
},
    },
    select: {
      invoiceType: true,
      customerOrderNumber: true,
      invoiceDate: true,
      netValue: true,
      grossValue: true,
    },
  });

  const periods = calculateRebateSalesPeriods(
    invoices,
    frequency,
    year
  );

  const totalNetSales = Math.round(
    periods.reduce(
      (total, period) => total + period.qualifyingSales,
      0
    ) * 100
  ) / 100;

  return {
    customerId: parent.id,
    customerName: parent.name,
    accountCodes,
    businessUnitId,
    year,
    frequency,
    periods,
    invoiceCount: invoices.length,
    totalNetSales,
  };
}
