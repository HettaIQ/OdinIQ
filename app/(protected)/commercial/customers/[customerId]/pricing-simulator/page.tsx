
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

import {
  calculateNetSalesYTD,
  isSalesInvoice,
  isCreditNote,
  isCancelledTransaction,
} from "@/lib/commercial/salesCalculations";

import {
  buildProductCostMap,
  calculateDespatchCogs,
  calculateCreditCogsAdjustment,
} from "@/lib/commercial/profitabilityCalculations";

import PricingSimulator from "./PricingSimulator";

type Props = {
  params: Promise<{
    customerId: string;
  }>;
  searchParams: Promise<{
    businessUnitId?: string;
  }>;
};

function normalizeStockCode(
  value: string | null | undefined
) {
  return String(value ?? "").trim().toUpperCase();
}

export default async function PricingSimulatorPage({
  params,
  searchParams,
}: Props) {
  const { membership, companyId } =
    await requireCompanyContext();

  // Profitability information is restricted.
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

  const isAgent =
    membership.role?.name === "Agent" ||
    membership.role?.name === "Sales Agent";

  const customer = await prisma.customer.findFirst({
    where: {
      id,
      companyId,
      ...(isAgent
        ? { assignedMembershipId: membership.id }
        : {}),
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

  // Validate the requested business unit.
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

  if (
    selectedBusinessUnitId !== null &&
    !validatedBusinessUnit
  ) {
    notFound();
  }

  const validatedBusinessUnitId =
    validatedBusinessUnit?.id ?? null;

  const today = new Date();
  const currentYear = today.getFullYear();

  // Include directly linked customer accounts.
  const linkedCustomers = await prisma.customer.findMany({
    where: {
      companyId,
      parentCustomerId: customer.id,
      ...(isAgent
        ? { assignedMembershipId: membership.id }
        : {}),
    },
    select: {
      accountCode: true,
    },
  });

  const salesAccountCodes = [
    customer.accountCode,
    ...linkedCustomers.map(
      (linked) => linked.accountCode
    ),
  ];

  // Retrieve invoices and credit-note product lines.
  const invoices = await prisma.salesInvoice.findMany({
    where: {
      companyId,
      customerAccountCode: {
        in: salesAccountCodes,
      },
      ...(validatedBusinessUnitId !== null
        ? {
            businessUnitId: validatedBusinessUnitId,
          }
        : {}),
    },
    include: {
      lines: true,
    },
  });

  const actualSalesYTD = calculateNetSalesYTD(
    invoices,
    currentYear,
    today
  );

  const currentYearInvoices = invoices.filter(
    (invoice) => {
      if (!invoice.invoiceDate) {
        return false;
      }

      const invoiceDate = new Date(
        invoice.invoiceDate
      );

      return (
        invoiceDate.getFullYear() === currentYear &&
        invoiceDate <= today &&
        !isCancelledTransaction(invoice)
      );
    }
  );

  const currentYearSalesInvoices =
    currentYearInvoices.filter(isSalesInvoice);

  const currentYearCredits =
    currentYearInvoices.filter(isCreditNote);

  // Match qualifying invoices to sales orders.
  const salesOrderNumbers = Array.from(
    new Set(
      currentYearSalesInvoices
        .map((invoice) => invoice.salesOrderNumber)
        .filter(
          (value): value is string => Boolean(value)
        )
    )
  );

  const profitabilityGdns =
    salesOrderNumbers.length > 0
      ? await prisma.goodsDespatchNote.findMany({
          where: {
            companyId,
            salesOrderNumber: {
              in: salesOrderNumbers,
            },
          },
          include: {
            lines: true,
          },
        })
      : [];

  // Collect the product codes needed for costing.
  const requiredStockCodes = new Set<string>();

  for (const gdn of profitabilityGdns) {
    for (const line of gdn.lines) {
      const stockCode =
        normalizeStockCode(line.stockCode) ||
        normalizeStockCode(line.partNumber);

      if (stockCode && stockCode !== "M") {
        requiredStockCodes.add(stockCode);
      }
    }
  }

  for (const credit of currentYearCredits) {
    for (const line of credit.lines) {
      const stockCode = normalizeStockCode(
        line.stockCode
      );

      if (stockCode && stockCode !== "M") {
        requiredStockCodes.add(stockCode);
      }
    }
  }

  // Retrieve product costs and historical cost records.
  const products =
    requiredStockCodes.size > 0
      ? await prisma.product.findMany({
          where: {
            companyId,
            productCode: {
              in: [...requiredStockCodes],
            },
          },
          select: {
            productCode: true,
            costPrice: true,
            costHistory: {
              select: {
                costPrice: true,
                effectiveFrom: true,
                effectiveTo: true,
              },
            },
          },
        })
      : [];

  // Resolve Sage / legacy product codes.
  const productAliases =
    requiredStockCodes.size > 0
      ? await prisma.productAlias.findMany({
          where: {
            companyId,
            aliasCode: {
              in: [...requiredStockCodes],
            },
          },
          select: {
            aliasCode: true,
            product: {
              select: {
                productCode: true,
                costPrice: true,
                costHistory: {
                  select: {
                    costPrice: true,
                    effectiveFrom: true,
                    effectiveTo: true,
                  },
                },
              },
            },
          },
        })
      : [];

  const productMap = buildProductCostMap(products);

  for (const alias of productAliases) {
    const aliasCode = normalizeStockCode(
      alias.aliasCode
    );

    if (aliasCode) {
      productMap.set(aliasCode, alias.product);
    }
  }

  // Match sales orders to their invoice dates.
  const invoiceDateBySalesOrder = new Map<
    string,
    Date | null
  >();

  for (const invoice of currentYearSalesInvoices) {
    if (!invoice.salesOrderNumber) {
      continue;
    }

    const existingDate = invoiceDateBySalesOrder.get(
      invoice.salesOrderNumber
    );

    if (
      !existingDate ||
      (invoice.invoiceDate &&
        invoice.invoiceDate < existingDate)
    ) {
      invoiceDateBySalesOrder.set(
        invoice.salesOrderNumber,
        invoice.invoiceDate
      );
    }
  }

  // Calculate despatch COGS and credit adjustments.
  let normalCogs = 0;
  let creditCogsAdjustment = 0;
  let costedLines = 0;
  let uncostedLines = 0;

  const missingStockCodes = new Set<string>();
  const processedGdnIds = new Set<number>();

  for (const gdn of profitabilityGdns) {
    if (processedGdnIds.has(gdn.id)) {
      continue;
    }

    processedGdnIds.add(gdn.id);

    const transactionDate =
      (gdn.salesOrderNumber
        ? invoiceDateBySalesOrder.get(
            gdn.salesOrderNumber
          )
        : null) ??
      gdn.gdnDate ??
      null;

    const result = calculateDespatchCogs({
      lines: gdn.lines,
      transactionDate,
      productMap,
    });

    normalCogs += result.cogs;
    costedLines += result.costedLines;
    uncostedLines += result.uncostedLines;

    for (const code of result.missingStockCodes) {
      missingStockCodes.add(code);
    }
  }

  for (const credit of currentYearCredits) {
    const result = calculateCreditCogsAdjustment({
      lines: credit.lines,
      transactionDate: credit.invoiceDate,
      productMap,
    });

    creditCogsAdjustment += result.cogsAdjustment;
    costedLines += result.costedLines;
    uncostedLines += result.uncostedLines;

    for (const code of result.missingStockCodes) {
      missingStockCodes.add(code);
    }
  }

  const actualProductCosts =
    normalCogs + creditCogsAdjustment;

  const backUrl =
    `/commercial/customers/${customer.id}` +
    (validatedBusinessUnitId !== null
      ? `?businessUnitId=${validatedBusinessUnitId}`
      : "");

  return (
    <main className="mx-auto max-w-7xl p-6">
      <Link
        href={backUrl}
        className="text-sm underline"
      >
        Back to customer
      </Link>

      <PricingSimulator
        customerName={customer.name}
        actualAnnualSales={actualSalesYTD}
        actualProductCosts={actualProductCosts}
      />

      <div className="mt-6 rounded-lg border p-4 text-sm">
        <h2 className="font-semibold">
          Product Cost Coverage
        </h2>

        <p className="mt-2">
          Costed product lines: {costedLines}
        </p>

        <p>
          Uncosted product lines: {uncostedLines}
        </p>

        {uncostedLines > 0 && (
          <p className="mt-3 font-medium text-amber-700">
            Warning: Some products have missing cost
            information. The calculated product costs
            are incomplete, so the simulated profit
            may be overstated.
          </p>
        )}

        {missingStockCodes.size > 0 && (
          <p className="mt-2">
            Missing stock codes:{" "}
            {[...missingStockCodes].sort().join(", ")}
          </p>
        )}
      </div>
    </main>
  );
}
