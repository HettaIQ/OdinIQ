import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

import {
  calculateCreditValue,
  calculateNetSales,
  calculateNetSalesForYear,
  calculateNetSalesYTD,
  isCancelledTransaction,
  isCreditNote,
  isSalesInvoice,
} from "@/lib/commercial/salesCalculations";

import {
  buildProductCostMap,
  calculateCreditCogsAdjustment,
  calculateDespatchCogs,
  calculateGrossProfit,
} from "@/lib/commercial/profitabilityCalculations";

import {
  calculateCommercialCosts,
  calculateTrueProfit,
} from "@/lib/commercial/trueProfitCalculations";

import {
  calculateCustomerRebate,
} from "@/lib/commercial/customerRebateCalculations";

import {
  addCustomerCommercialCost,
  deleteCustomerCommercialCost,
} from "./commercialCostActions";

type CustomerDetailPageProps = {
  params: Promise<{
    customerId: string;
  }>;

  searchParams: Promise<{
  activity?: string;
  page?: string;
  products?: string;
  activityPeriod?: string;
  activityFrom?: string;
  activityTo?: string;
}>;
};

function normalizeStockCode(
  value: string | null | undefined
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function normalizeAgreementText(
  value: string | null | undefined
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function agreementOverlapsYtd(
  agreement: {
    status: string;
    startDate: Date | null;
    endDate: Date | null;
  },
  currentYear: number,
  today: Date
) {
  if (
    normalizeAgreementText(
      agreement.status
    ) !== "ACTIVE"
  ) {
    return false;
  }

  const yearStart = new Date(
    currentYear,
    0,
    1,
    0,
    0,
    0,
    0
  );

  if (
    agreement.startDate &&
    agreement.startDate > today
  ) {
    return false;
  }

  if (
    agreement.endDate &&
    agreement.endDate < yearStart
  ) {
    return false;
  }

  return true;
}

function transactionFallsWithinAgreement(
  transactionDate: Date | null,
  agreement: {
    startDate: Date | null;
    endDate: Date | null;
  },
  currentYear: number,
  today: Date
) {
  if (!transactionDate) {
    return false;
  }

  const date =
    new Date(transactionDate);

  if (
    date.getFullYear() !==
    currentYear
  ) {
    return false;
  }

  if (date > today) {
    return false;
  }

  if (
    agreement.startDate &&
    date < agreement.startDate
  ) {
    return false;
  }

  if (
    agreement.endDate &&
    date > agreement.endDate
  ) {
    return false;
  }

  return true;
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: CustomerDetailPageProps) {
  const {
    membership,
    companyId,
  } = await requireCompanyContext();

  const isAgent =
    membership.role?.name ===
      "Agent" ||
    membership.role?.name ===
      "Sales Agent";

  /*
   * Profitability is protected by an
   * explicit OdinIQ permission.
   */
  const profitabilityPermission =
    membership.role?.id
      ? await prisma.rolePermission.findFirst({
          where: {
            roleId:
              membership.role.id,

            permission: {
              key: "commercial.profitability.view",
            },
          },

          select: {
            roleId: true,
          },
        })
      : null;

  const canViewProfitability =
    Boolean(
      profitabilityPermission
    );

  const { customerId } =
    await params;

  const {
  activity,
  page,
  products,
  activityPeriod,
  activityFrom,
  activityTo,
} = await searchParams;

const productView =
  products === "new"
    ? "new"
    : products === "growth"
    ? "growth"
    : products === "decline"
    ? "decline"
    : "top";

  const id = Number(customerId);

  if (!Number.isInteger(id)) {
    notFound();
  }

  const activityPage =
    Math.max(
      1,
      Number(page) || 1
    );

  const activityPageSize = 50;

  const activityFilter =
    activity === "credits"
      ? "credits"
      : activity ===
        "invoices"
      ? "invoices"
      : activity ===
        "cancelled"
      ? "cancelled"
      : "all";

  const selectedActivityPeriod =
    activityPeriod === "this-month" ||
    activityPeriod === "last-month" ||
    activityPeriod === "ytd" ||
    activityPeriod === "custom"
      ? activityPeriod
      : "all";

  const activityToday = new Date();

  function parseActivityDate(
    value: string | undefined,
    endOfDay = false
  ) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const [year, month, day] =
      value.split("-").map(Number);

    const date = new Date(
      year,
      month - 1,
      day,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    );

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  let activityStartDate: Date | null = null;
  let activityEndDate: Date | null = null;

  if (selectedActivityPeriod === "this-month") {
    activityStartDate = new Date(
      activityToday.getFullYear(),
      activityToday.getMonth(),
      1
    );
    activityEndDate = new Date(
      activityToday.getFullYear(),
      activityToday.getMonth(),
      activityToday.getDate(),
      23, 59, 59, 999
    );
  } else if (selectedActivityPeriod === "last-month") {
    activityStartDate = new Date(
      activityToday.getFullYear(),
      activityToday.getMonth() - 1,
      1
    );
    activityEndDate = new Date(
      activityToday.getFullYear(),
      activityToday.getMonth(),
      0,
      23, 59, 59, 999
    );
  } else if (selectedActivityPeriod === "ytd") {
    activityStartDate = new Date(
      activityToday.getFullYear(),
      0,
      1
    );
    activityEndDate = new Date(
      activityToday.getFullYear(),
      activityToday.getMonth(),
      activityToday.getDate(),
      23, 59, 59, 999
    );
  } else if (selectedActivityPeriod === "custom") {
    activityStartDate =
      parseActivityDate(activityFrom);
    activityEndDate =
      parseActivityDate(activityTo, true);
  }

  const invalidActivityDateRange =
    Boolean(
      activityStartDate &&
      activityEndDate &&
      activityStartDate > activityEndDate
    );

  const customer =
    await prisma.customer.findFirst({
      where: {
        id,

        companyId:
          companyId,

        ...(isAgent
          ? {
              assignedMembershipId:
                membership.id,
            }
          : {}),
      },
    });

  if (!customer) {
    notFound();
  }

  /*
   * Invoice lines are required for
   * product credit COGS reversals.
   */
  const invoices =
    await prisma.salesInvoice.findMany({
      where: {
        companyId:
          companyId,

        customerAccountCode:
          customer.accountCode,
      },

      include: {
        lines: true,
      },

      orderBy: {
        invoiceDate: "desc",
      },
    });

  const cancelledInvoices =
    invoices.filter(
      isCancelledTransaction
    );

  const cancelledSalesOrderNumbers =
    new Set(
      cancelledInvoices
        .map(
          (invoice) =>
            invoice.salesOrderNumber
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
    );

  const [
    cancelledOrders,
    cancelledOrderGdns,
  ] = await Promise.all([
    prisma.salesOrder.findMany({
      where: {
        companyId:
          companyId,

        salesOrderNumber: {
          in: [
            ...cancelledSalesOrderNumbers,
          ],
        },
      },

      orderBy: {
        orderDate: "desc",
      },
    }),

    prisma.goodsDespatchNote.findMany({
      where: {
        companyId:
          companyId,

        salesOrderNumber: {
          in: [
            ...cancelledSalesOrderNumbers,
          ],
        },
      },

      include: {
        lines: true,
      },

      orderBy: {
        gdnDate: "desc",
      },
    }),
  ]);

  /*
   * Shared sales engine.
   */
  const salesInvoices =
    invoices.filter(
      isSalesInvoice
    );

  const creditNotes =
    invoices.filter(
      isCreditNote
    );

  const netSales =
    calculateNetSales(
      invoices
    );

  const creditValue =
    calculateCreditValue(
      invoices
    );

  const today = new Date();

  const currentYear =
    today.getFullYear();

  const previousYear =
    currentYear - 1;

  const currentYearSales =
    calculateNetSalesYTD(
      invoices,
      currentYear,
      today
    );

  const previousYearSales =
    calculateNetSalesYTD(
      invoices,
      previousYear,
      today
    );

  const salesMovement =
    previousYearSales !== 0
      ? ((currentYearSales -
          previousYearSales) /
          previousYearSales) *
        100
      : null;

  const salesMovementValue =
    currentYearSales -
    previousYearSales;

  const hasSalesDecline =
    salesMovement !== null &&
    salesMovement < 0;

  /*
   * --------------------------------
   * PRODUCT PERFORMANCE
   * --------------------------------
   *
   * Compare product sales YTD with
   * the same period last year.
   *
   * Credits reduce quantity and sales.
   * Cancelled transactions are excluded.
   */

  type ProductPerformance = {
    stockCode: string;
    description: string;

    currentQty: number;
    currentSales: number;

    previousQty: number;
    previousSales: number;
  };

  const productPerformanceMap =
    new Map<
      string,
      ProductPerformance
    >();

  const nonProductCodes =
  new Set([
    "M",
    "MISC",
    "S1",
    "LAYOUT",
    "PLTDELIVERY",
    "STDELIVERY",
  ]);

  const currentYtdEnd =
    new Date(
      currentYear,
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999
    );

  const previousYtdEnd =
    new Date(
      previousYear,
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999
    );

  for (const invoice of invoices) {
    if (
      !invoice.invoiceDate ||
      isCancelledTransaction(
        invoice
      )
    ) {
      continue;
    }

    const invoiceDate =
      new Date(
        invoice.invoiceDate
      );

    const invoiceYear =
      invoiceDate.getFullYear();

    const isCurrentYtd =
      invoiceYear ===
        currentYear &&
      invoiceDate <=
        currentYtdEnd;

    const isPreviousYtd =
      invoiceYear ===
        previousYear &&
      invoiceDate <=
        previousYtdEnd;

    if (
      !isCurrentYtd &&
      !isPreviousYtd
    ) {
      continue;
    }

    const credit =
      isCreditNote(invoice);

    for (const line of invoice.lines) {
      const stockCode =
        normalizeStockCode(
          line.stockCode
        );

      if (
        !stockCode ||
        nonProductCodes.has(
          stockCode
        )
      ) {
        continue;
      }

      const rawQty =
        Number(
          line.quantity ?? 0
        );

      const rawSales =
        Number(
          line.netValue ?? 0
        );

      const quantity =
        credit
          ? -Math.abs(rawQty)
          : rawQty;

      const sales =
        credit
          ? -Math.abs(rawSales)
          : rawSales;

      const existing =
        productPerformanceMap.get(
          stockCode
        ) ?? {
          stockCode,

          description:
            line.description ??
            "",

          currentQty: 0,
          currentSales: 0,

          previousQty: 0,
          previousSales: 0,
        };

      if (
        !existing.description &&
        line.description
      ) {
        existing.description =
          line.description;
      }

      if (isCurrentYtd) {
        existing.currentQty +=
          quantity;

        existing.currentSales +=
          sales;
      }

      if (isPreviousYtd) {
        existing.previousQty +=
          quantity;

        existing.previousSales +=
          sales;
      }

      productPerformanceMap.set(
        stockCode,
        existing
      );
    }
  }

  const productPerformance =
    [...productPerformanceMap.values()]
      .map((product) => {
        const salesChange =
          product.currentSales -
          product.previousSales;

        const percentageChange =
          product.previousSales !== 0
            ? (salesChange /
                Math.abs(
                  product.previousSales
                )) *
              100
            : product.currentSales >
              0
            ? null
            : 0;

        const isNew =
          product.previousSales ===
            0 &&
          product.currentSales > 0;

        return {
          ...product,
          salesChange,
          percentageChange,
          isNew,
        };
      })
      .sort(
        (a, b) =>
          b.currentSales -
          a.currentSales
      );

  const productsBoughtYtd =
    productPerformance.filter(
      (product) =>
        product.currentQty > 0 ||
        product.currentSales > 0
    ).length;

  const newProductsYtd =
    productPerformance.filter(
      (product) =>
        product.isNew
    ).length;

  const biggestGrowthProduct =
    [...productPerformance]
      .filter(
        (product) =>
          product.salesChange > 0
      )
      .sort(
        (a, b) =>
          b.salesChange -
          a.salesChange
      )[0] ?? null;

  const biggestDeclineProduct =
    [...productPerformance]
      .filter(
        (product) =>
          product.salesChange < 0
      )
      .sort(
        (a, b) =>
          a.salesChange -
          b.salesChange
      )[0] ?? null;

const displayedProductPerformance =
  productView === "new"
    ? [...productPerformance]
        .filter(
          (product) =>
            product.isNew
        )
        .sort(
          (a, b) =>
            b.currentSales -
            a.currentSales
        )
    : productView === "growth"
    ? [...productPerformance].sort(
        (a, b) =>
          b.salesChange -
          a.salesChange
      )
    : productView === "decline"
    ? [...productPerformance].sort(
        (a, b) =>
          a.salesChange -
          b.salesChange
      )
    : [...productPerformance].sort(
        (a, b) =>
          b.currentSales -
          a.currentSales
      );

const meetingTopGrowth =
  [...productPerformance]
    .filter(
      (product) =>
        product.salesChange > 0
    )
    .sort(
      (a, b) =>
        b.salesChange -
        a.salesChange
    )
    .slice(0, 5);

const meetingTopDeclines =
  [...productPerformance]
    .filter(
      (product) =>
        product.salesChange < 0
    )
    .sort(
      (a, b) =>
        a.salesChange -
        b.salesChange
    )
    .slice(0, 5);

const meetingNewProducts =
  [...productPerformance]
    .filter(
      (product) =>
        product.isNew
    )
    .sort(
      (a, b) =>
        b.currentSales -
        a.currentSales
    )
    .slice(0, 5);

const totalPositiveProductGrowth =
  productPerformance
    .filter(
      (product) =>
        product.salesChange > 0
    )
    .reduce(
      (total, product) =>
        total +
        product.salesChange,
      0
    );

const totalProductDecline =
  Math.abs(
    productPerformance
      .filter(
        (product) =>
          product.salesChange < 0
      )
      .reduce(
        (total, product) =>
          total +
          product.salesChange,
        0
      )
  );

  const odinTalkingPoints: {
  title: string;
  text: string;
  type: "positive" | "opportunity" | "watch";
}[] = [];

/*
 * Overall account performance
 */
if (
  salesMovement !== null &&
  salesMovement > 0
) {
  odinTalkingPoints.push({
    title: "Strong Account Growth",
    text: `${customer.name} is ${salesMovement.toFixed(
      1
    )}% ahead YTD, representing an increase of ${formatMoney(
      salesMovementValue
    )} versus the same period in ${previousYear}. Discuss what is driving the growth and how it can be sustained.`,
    type: "positive",
  });
} else if (
  salesMovement !== null &&
  salesMovement < 0
) {
  odinTalkingPoints.push({
    title: "Account Performance",
    text: `${customer.name} is ${Math.abs(
      salesMovement
    ).toFixed(
      1
    )}% behind YTD, representing a reduction of ${formatMoney(
      Math.abs(salesMovementValue)
    )} versus ${previousYear}. Identify which areas of the account can be recovered.`,
    type: "watch",
  });
}

/*
 * Possible product switch.
 *
 * For now we only flag products where the
 * descriptions appear commercially related.
 */

let productShiftDeclineCode: string | null = null;
let productShiftGrowthCode: string | null = null;

for (const decline of meetingTopDeclines) {
  if (decline.previousSales <= 0) continue;
  

  const declineWords =
    decline.description
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .filter(
        (word) =>
          word.length >= 4
      );

  const possibleSwitch =
    meetingTopGrowth.find(
      (growth) => {
        if (
          growth.currentSales <= 0
        ) {
          return false;
        }

        const growthDescription =
          growth.description.toUpperCase();

        const matchingWords =
          declineWords.filter(
            (word) =>
              growthDescription.includes(
                word
              )
          );

        return (
          matchingWords.length >= 2
        );
      }
    );

  if (possibleSwitch) {
  productShiftDeclineCode =
    decline.stockCode;

  productShiftGrowthCode =
    possibleSwitch.stockCode;

  odinTalkingPoints.push({
      title: "Possible Product Shift",
      text: `${decline.stockCode} has reduced by ${formatMoney(
        Math.abs(
          decline.salesChange
        )
      )}, while ${
        possibleSwitch.stockCode
      } has increased by ${formatMoney(
        possibleSwitch.salesChange
      )}. The products appear related, so establish whether this represents a specification or product-mix change rather than lost business.`,
      type: "opportunity",
    });

    break;
  }
}

/*
 * New product adoption
 */
if (newProductsYtd > 0) {
  odinTalkingPoints.push({
    title: "Range Expansion",
    text: `${customer.name} has bought ${newProductsYtd} products this year that had no equivalent sales in ${previousYear}. Discuss which successful new lines could be expanded further across the account.`,
    type: "positive",
  });
}

/*
 * Largest genuine decline
 */
const recoveryOpportunity =
  [...productPerformance]
    .filter(
      (product) =>
        product.salesChange < 0 &&
        product.stockCode !==
          productShiftDeclineCode
    )
    .sort(
      (a, b) =>
        a.salesChange -
        b.salesChange
    )[0] ?? null;

if (recoveryOpportunity) {
  odinTalkingPoints.push({
    title: "Recovery Opportunity",
   text: `${
  recoveryOpportunity.stockCode
} is down ${formatMoney(
  Math.abs(
    recoveryOpportunity.salesChange
  )
)} versus ${previousYear}. Current YTD sales are ${formatMoney(
  recoveryOpportunity.currentSales
)} compared with ${formatMoney(
  recoveryOpportunity.previousSales
)} last year. No obvious replacement product has been identified. Ask whether this product has been discontinued, replaced by another specification, sourced elsewhere, or represents an opportunity to recover the business.`,
    type: "watch",
  });
}

/*
 * Largest growth product
 */
const growthOpportunity =
  [...productPerformance]
    .filter(
      (product) =>
        product.salesChange > 0 &&
        product.stockCode !==
          productShiftGrowthCode
    )
    .sort(
      (a, b) =>
        b.salesChange -
        a.salesChange
    )[0] ?? null;

if (growthOpportunity) {
  odinTalkingPoints.push({
    title: "Growth Opportunity",
    text: `${
      growthOpportunity.stockCode
    } is a major product growth driver, up ${formatMoney(
      growthOpportunity.salesChange
   ) } versus ${previousYear}. Explore whether this success can be replicated across more of the customer's business.`,
    type: "positive",
  });
}

  const fullYearSales =
    Array.from(
      { length: 5 },
      (_, index) =>
        previousYear - index
    ).map((year) => ({
      year,

      sales:
        calculateNetSalesForYear(
          invoices,
          year
        ),
    }));

  const latestSalesInvoice =
    salesInvoices.find(
      (invoice) =>
        invoice.invoiceDate
    );

  /*
   * --------------------------------
   * PROFITABILITY
   * --------------------------------
   */

  let profitability:
    | {
        netSales: number;
        cogs: number;

        grossProfit: number;
        grossMargin: number;

        normalCogs: number;

        creditCogsAdjustment: number;

        costedLines: number;
        uncostedLines: number;

        missingStockCodes: string[];

        creditNotesWithoutProductLines: number;

        rebate: number;
        agentCommission: number;
        merchandise: number;
        entertainment: number;
        marketing: number;
        carriage: number;
        other: number;

        totalCommercialCosts: number;

        automaticRebate: number;
        automaticRebatePercent: number;
        rebateAgreementName: string | null;
        rebateSource: string | null;
        rebateQualifyingSales: number;

        trueProfit: number;
        trueMargin: number;
      }
    | null = null;

  let commercialCostEntries:
    {
      id: number;
      costDate: Date;
      costType: string;
      description: string | null;
      amount: number;
      source: string | null;
      sourceReference: string | null;
      notes: string | null;
      isAutomatic: boolean;
    }[] = [];

  if (canViewProfitability) {
    const currentYearInvoices =
      invoices.filter(
        (invoice) => {
          if (
            !invoice.invoiceDate
          ) {
            return false;
          }

          const invoiceDate =
            new Date(
              invoice.invoiceDate
            );

          if (
            invoiceDate.getFullYear() !==
            currentYear
          ) {
            return false;
          }

          return (
            invoiceDate <= today &&
            !isCancelledTransaction(
              invoice
            )
          );
        }
      );

    const currentYearSalesInvoices =
      currentYearInvoices.filter(
        isSalesInvoice
      );

    const currentYearCredits =
      currentYearInvoices.filter(
        isCreditNote
      );

    const salesOrderNumbers =
      Array.from(
        new Set(
          currentYearSalesInvoices
            .map(
              (invoice) =>
                invoice.salesOrderNumber
            )
            .filter(
              (
                value
              ): value is string =>
                Boolean(value)
            )
        )
      );

    const profitabilityGdns =
      salesOrderNumbers.length >
      0
        ? await prisma.goodsDespatchNote.findMany(
            {
              where: {
                companyId:
                  companyId,

                salesOrderNumber: {
                  in: salesOrderNumbers,
                },
              },

              include: {
                lines: true,
              },
            }
          )
        : [];

    const requiredStockCodes =
      new Set<string>();

    for (
      const gdn of
      profitabilityGdns
    ) {
      for (const line of gdn.lines) {
        const stockCode =
          normalizeStockCode(
            line.stockCode
          ) ||
          normalizeStockCode(
            line.partNumber
          );

        if (
          stockCode &&
          stockCode !== "M"
        ) {
          requiredStockCodes.add(
            stockCode
          );
        }
      }
    }

    for (
      const credit of
      currentYearCredits
    ) {
      for (const line of credit.lines) {
        const stockCode =
          normalizeStockCode(
            line.stockCode
          );

        if (
          stockCode &&
          stockCode !== "M"
        ) {
          requiredStockCodes.add(
            stockCode
          );
        }
      }
    }

   const products =
  requiredStockCodes.size > 0
 ? await prisma.product.findMany({
    where: {
      companyId:
        companyId,

      productCode: {
        in: [
          ...requiredStockCodes,
        ],
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

const productAliases =
  requiredStockCodes.size > 0
    ? await prisma.productAlias.findMany({
        where: {
          companyId:
            companyId,

          aliasCode: {
            in: [
              ...requiredStockCodes,
            ],
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

const productMap =
  buildProductCostMap(
    products
  );

/*
 * Add Sage / legacy product aliases into the
 * same profitability map.
 *
 * Example:
 * KIT30HP -> HSKIT30
 *
 * The GDN can continue using KIT30HP, while
 * OdinIQ uses the real HSKIT30 product cost.
 */
for (const alias of productAliases) {
  const aliasCode =
    normalizeStockCode(
      alias.aliasCode
    );

  if (!aliasCode) {
    continue;
  }

  productMap.set(
    aliasCode,
    alias.product
  );
}

    const invoiceDateBySalesOrder =
      new Map<
        string,
        Date | null
      >();

    for (
      const invoice of
      currentYearSalesInvoices
    ) {
      if (
        !invoice.salesOrderNumber
      ) {
        continue;
      }

      const existingDate =
        invoiceDateBySalesOrder.get(
          invoice.salesOrderNumber
        );

      if (
        !existingDate ||
        (invoice.invoiceDate &&
          invoice.invoiceDate <
            existingDate)
      ) {
        invoiceDateBySalesOrder.set(
          invoice.salesOrderNumber,
          invoice.invoiceDate
        );
      }
    }

    let normalCogs = 0;

    let creditCogsAdjustment =
      0;

    let costedLines = 0;
    let uncostedLines = 0;

    const missingStockCodes =
      new Set<string>();

    const processedGdnIds =
      new Set<number>();

    for (
      const gdn of
      profitabilityGdns
    ) {
      if (
        processedGdnIds.has(
          gdn.id
        )
      ) {
        continue;
      }

      processedGdnIds.add(
        gdn.id
      );

      const transactionDate =
        (gdn.salesOrderNumber
          ? invoiceDateBySalesOrder.get(
              gdn.salesOrderNumber
            )
          : null) ??
        gdn.gdnDate ??
        null;

      const result =
        calculateDespatchCogs({
          lines: gdn.lines,
          transactionDate,
          productMap,
        });

      normalCogs +=
        result.cogs;

      costedLines +=
        result.costedLines;

      uncostedLines +=
        result.uncostedLines;

      for (
        const stockCode of
        result.missingStockCodes
      ) {
        missingStockCodes.add(
          stockCode
        );
      }
    }

    for (
      const credit of
      currentYearCredits
    ) {
      const result =
        calculateCreditCogsAdjustment(
          {
            lines:
              credit.lines,

            transactionDate:
              credit.invoiceDate,

            productMap,
          }
        );

      creditCogsAdjustment +=
        result.cogsAdjustment;

      costedLines +=
        result.costedLines;

      uncostedLines +=
        result.uncostedLines;

      for (
        const stockCode of
        result.missingStockCodes
      ) {
        missingStockCodes.add(
          stockCode
        );
      }
    }

    const totalCogs =
      normalCogs +
      creditCogsAdjustment;

    const gross =
      calculateGrossProfit({
        netSales:
          currentYearSales,

        cogs: totalCogs,
      });

    const creditNotesWithoutProductLines =
      currentYearCredits.filter(
        (credit) =>
          !credit.lines.some(
            (line) =>
              normalizeStockCode(
                line.stockCode
              ) !== "" &&
              normalizeStockCode(
                line.stockCode
              ) !== "M" &&
              Number(
                line.quantity ?? 0
              ) !== 0
          )
      ).length;

    /*
     * --------------------------------
     * COMMERCIAL COST LEDGER
     * --------------------------------
     */

    const yearStart =
      new Date(
        currentYear,
        0,
        1,
        0,
        0,
        0,
        0
      );

    const ytdEnd =
      new Date(
        currentYear,
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
        999
      );

    commercialCostEntries =
      await prisma.customerCommercialCost.findMany({
        where: {
          customerId:
            customer.id,

          costDate: {
            gte: yearStart,
            lte: ytdEnd,
          },
        },

        select: {
          id: true,
          costDate: true,
          costType: true,
          description: true,
          amount: true,
          source: true,
          sourceReference: true,
          notes: true,
          isAutomatic: true,
        },

        orderBy: {
          costDate: "desc",
        },
      });

    const commercialCosts =
      calculateCommercialCosts(
        commercialCostEntries
      );

    /*
     * --------------------------------
     * AUTOMATIC REBATE
     * --------------------------------
     *
     * Customer-specific agreements take
     * priority over buying-group agreements.
     *
     * RebateScheme takes priority over the
     * agreement-level rebatePercent inside
     * the rebate calculation engine.
     */

    const agreementOrConditions:
      {
        customerId?: number;
        buyingGroup?: string;
      }[] = [
        {
          customerId:
            customer.id,
        },
      ];

    if (customer.buyingGroup) {
      agreementOrConditions.push({
        buyingGroup:
          customer.buyingGroup,
      });
    }

    const agreementCandidates =
      await prisma.commercialAgreement.findMany({
        where: {
          companyId:
            companyId,

          OR:
            agreementOrConditions,
        },

        include: {
          rebates: true,
        },

        orderBy: [
          {
            startDate: "desc",
          },

          {
            createdAt: "desc",
          },
        ],
      });

    const applicableAgreements =
      agreementCandidates.filter(
        (agreement) =>
          agreementOverlapsYtd(
            agreement,
            currentYear,
            today
          )
      );

    /*
     * Explicit customer agreement
     * overrides buying-group agreement.
     */

    const customerAgreement =
      applicableAgreements.find(
        (agreement) =>
          agreement.customerId ===
          customer.id
      );

    const buyingGroupAgreement =
      !customerAgreement &&
      customer.buyingGroup
        ? applicableAgreements.find(
            (agreement) =>
              agreement.customerId ==
                null &&
              normalizeAgreementText(
                agreement.buyingGroup
              ) ===
                normalizeAgreementText(
                  customer.buyingGroup
                )
          )
        : undefined;

    const rebateAgreement =
      customerAgreement ??
      buyingGroupAgreement ??
      null;

    let automaticRebate: {
      rebatePercent: number;
      rebateValue: number;

      source:
        | "NONE"
        | "CUSTOMER_AGREEMENT"
        | "BUYING_GROUP_AGREEMENT";

      agreementName:
        | string
        | null;

      qualifyingSales: number;
    } = {
      rebatePercent: 0,
      rebateValue: 0,
      source: "NONE",
      agreementName: null,
      qualifyingSales: 0,
    };

    if (rebateAgreement) {
      /*
       * Only sales inside the agreement
       * dates are eligible for rebate.
       */

      const rebateEligibleCustomerInvoices =
        invoices.filter(
          (invoice) =>
            transactionFallsWithinAgreement(
              invoice.invoiceDate,
              rebateAgreement,
              currentYear,
              today
            ) &&
            !isCancelledTransaction(
              invoice
            )
        );

      const customerRebateSales =
        calculateNetSales(
          rebateEligibleCustomerInvoices
        );

      let qualifyingSales =
        customerRebateSales;

      /*
       * If this is a buying-group agreement,
       * threshold qualification is based on
       * the total sales for the group.
       *
       * The individual customer is still only
       * charged its own share of the rebate.
       */

      if (
        buyingGroupAgreement &&
        customer.buyingGroup
      ) {
        const groupCustomers =
          await prisma.customer.findMany({
            where: {
              companyId:
                companyId,
            },

            select: {
              accountCode: true,
              buyingGroup: true,
            },
          });

        const groupAccountCodes =
          groupCustomers
            .filter(
              (
                groupCustomer
              ) =>
                normalizeAgreementText(
                  groupCustomer.buyingGroup
                ) ===
                normalizeAgreementText(
                  customer.buyingGroup
                )
            )
            .map(
              (
                groupCustomer
              ) =>
                groupCustomer.accountCode
            );

        const groupInvoices =
          groupAccountCodes.length >
          0
            ? await prisma.salesInvoice.findMany({
                where: {
                  companyId:
                    companyId,

                  customerAccountCode: {
                    in: groupAccountCodes,
                  },
                },

                select: {
                  invoiceType: true,
                  customerOrderNumber:
                    true,
                  netValue: true,
                  invoiceDate: true,
                },
              })
            : [];

        const eligibleGroupInvoices =
          groupInvoices.filter(
            (invoice) =>
              transactionFallsWithinAgreement(
                invoice.invoiceDate,
                rebateAgreement,
                currentYear,
                today
              ) &&
              !isCancelledTransaction(
                invoice
              )
          );

        qualifyingSales =
          calculateNetSales(
            eligibleGroupInvoices
          );
      }

      automaticRebate =
        calculateCustomerRebate({
          customerNetSales:
            customerRebateSales,

          qualifyingSales,

          agreement:
            rebateAgreement,

          source:
            customerAgreement
              ? "CUSTOMER_AGREEMENT"
              : "BUYING_GROUP_AGREEMENT",
        });
    }

    /*
     * Manual rebate costs and automatic
     * agreement rebate are shown together
     * in the rebate total.
     */

    const combinedRebate =
      commercialCosts.rebate +
      automaticRebate.rebateValue;

    const totalCommercialCosts =
      commercialCosts.totalCommercialCosts +
      automaticRebate.rebateValue;

    const trueProfit =
      calculateTrueProfit({
        grossProfit:
          gross.grossProfit,

        commercialCosts:
          totalCommercialCosts,

        netSales:
          currentYearSales,
      });

    profitability = {
      ...gross,

      normalCogs,

      creditCogsAdjustment,

      costedLines,

      uncostedLines,

      missingStockCodes: [
        ...missingStockCodes,
      ].sort(),

      creditNotesWithoutProductLines,

      ...commercialCosts,

      rebate:
        combinedRebate,

      totalCommercialCosts,

      automaticRebate:
        automaticRebate.rebateValue,

      automaticRebatePercent:
        automaticRebate.rebatePercent,

      rebateAgreementName:
        automaticRebate.agreementName,

      rebateSource:
        automaticRebate.source,

      rebateQualifyingSales:
        automaticRebate.qualifyingSales,

      trueProfit:
        trueProfit.trueProfit,

      trueMargin:
        trueProfit.trueMargin,
    };
  }

  function formatMoney(
    value: number
  ) {
    return value.toLocaleString(
      "en-GB",
      {
        style: "currency",
        currency: "GBP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  }

  function formatDate(
    value:
      | Date
      | null
      | undefined
  ) {
    if (!value) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      "en-GB",
      {
        dateStyle: "medium",
      }
    ).format(value);
  }

  const invoiceActivity =
    invoices
      .filter(
        (invoice) =>
          !isCancelledTransaction(
            invoice
          )
      )
      .map((invoice) => {
        const credit =
          isCreditNote(
            invoice
          );

        return {
          kind: credit
            ? "credit"
            : "invoice",

          date:
            invoice.invoiceDate,

          reference:
            invoice.invoiceNumber,

          value: credit
            ? -Math.abs(
                Number(
                  invoice.netValue ??
                    0
                )
              )
            : Number(
                invoice.netValue ??
                  0
              ),

          salesOrderNumber:
            invoice.salesOrderNumber,
        };
      });

  const cancelledActivity =
    cancelledOrders.map(
      (order) => {
        const gdns =
          cancelledOrderGdns.filter(
            (gdn) =>
              gdn.salesOrderNumber ===
              order.salesOrderNumber
          );

        return {
          kind: "cancelled",

          date:
            order.orderDate,

          reference:
            order.salesOrderNumber,

          value: Number(
            order.orderValue ?? 0
          ),

          salesOrderNumber:
            order.salesOrderNumber,

          gdns,
        };
      }
    );

  const allActivity = [
    ...invoiceActivity,
    ...cancelledActivity,
  ].sort((a, b) => {
    const aTime = a.date
      ? new Date(
          a.date
        ).getTime()
      : 0;

    const bTime = b.date
      ? new Date(
          b.date
        ).getTime()
      : 0;

    return bTime - aTime;
  });

  const periodActivity =
    allActivity.filter((item) => {
      if (invalidActivityDateRange) {
        return false;
      }

      if (activityStartDate || activityEndDate) {
        if (!item.date) {
          return false;
        }

        const itemDate = new Date(item.date);

        if (
          activityStartDate &&
          itemDate < activityStartDate
        ) {
          return false;
        }

        if (
          activityEndDate &&
          itemDate > activityEndDate
        ) {
          return false;
        }
      }

      return true;
    });

  const activityInvoiceCount =
    periodActivity.filter(
      (item) => item.kind === "invoice"
    ).length;

  const activityCreditCount =
    periodActivity.filter(
      (item) => item.kind === "credit"
    ).length;

  const activityCancelledCount =
    periodActivity.filter(
      (item) => item.kind === "cancelled"
    ).length;

  const activityInvoiceValue =
    periodActivity
      .filter((item) => item.kind === "invoice")
      .reduce(
        (total, item) => total + item.value,
        0
      );

  const activityCreditValue =
    periodActivity
      .filter((item) => item.kind === "credit")
      .reduce(
        (total, item) =>
          total + Math.abs(item.value),
        0
      );

  const activityNetSalesValue =
    periodActivity
      .filter(
        (item) =>
          item.kind === "invoice" ||
          item.kind === "credit"
      )
      .reduce(
        (total, item) => total + item.value,
        0
      );

  const activityCancelledValue =
    periodActivity
      .filter(
        (item) => item.kind === "cancelled"
      )
      .reduce(
        (total, item) => total + item.value,
        0
      );

  const filteredActivity =
    periodActivity.filter((item) => {
      if (activityFilter === "credits") {
        return item.kind === "credit";
      }

      if (activityFilter === "invoices") {
        return item.kind === "invoice";
      }

      if (activityFilter === "cancelled") {
        return item.kind === "cancelled";
      }

      return true;
    });

  function activityHref(options: {
    activity?: string;
    activityPeriod?: string;
    page?: number;
  } = {}) {
    const nextActivity =
      options.activity ?? activityFilter;

    const nextPeriod =
      options.activityPeriod ??
      selectedActivityPeriod;

    const query = new URLSearchParams();

    if (nextActivity !== "all") {
      query.set("activity", nextActivity);
    }

    if (nextPeriod !== "all") {
      query.set("activityPeriod", nextPeriod);
    }

    if (
      nextPeriod === "custom" &&
      activityFrom
    ) {
      query.set("activityFrom", activityFrom);
    }

    if (
      nextPeriod === "custom" &&
      activityTo
    ) {
      query.set("activityTo", activityTo);
    }

    if ((options.page ?? 1) > 1) {
      query.set(
        "page",
        String(options.page)
      );
    }
if (!customer) {
  return "/commercial/customers";
}
    const queryString = query.toString();

    return `/commercial/customers/${customer.id}${
      queryString ? `?${queryString}` : ""
    }#recent-sales-activity`;
  }

  const totalActivityPages =
    Math.max(
      1,

      Math.ceil(
        filteredActivity.length /
          activityPageSize
      )
    );

  const safeActivityPage =
    Math.min(
      activityPage,
      totalActivityPages
    );

  const paginatedActivity =
    filteredActivity.slice(
      (safeActivityPage - 1) *
        activityPageSize,

      safeActivityPage *
        activityPageSize
    );

  const addCommercialCostAction =
    addCustomerCommercialCost.bind(
      null,
      customer.id
    );

  return (
    <main className="space-y-6">
      <div>
        <Link
          href="/commercial/customers"
          className="text-sm font-semibold text-amber-600 hover:text-amber-700"
        >
          ← Back to Customer Performance
        </Link>

        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-amber-600">
          Customer Intelligence
        </p>

        <div className="mt-1 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">
              {customer.name}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Sage account{" "}
              {customer.accountCode}
            </p>
          </div>

          {!isAgent && (
            <Link
              href={`/commercial/customers/${customer.id}/edit`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Edit customer
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Net Sales
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {formatMoney(
              netSales
            )}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Invoices less credits
          </p>
        </div>

        <Link
          href={`/commercial/customers/${customer.id}?activity=invoices#recent-sales-activity`}
          className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-amber-300 hover:bg-amber-50"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Invoices
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {salesInvoices.length}
          </p>
        </Link>

        <Link
          href={`/commercial/customers/${customer.id}?activity=credits#recent-sales-activity`}
          className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-red-300 hover:bg-red-50"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Credits
          </p>

          <p className="mt-2 text-2xl font-bold text-red-700">
            {creditNotes.length}
          </p>
        </Link>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Credit Value
          </p>

          <p className="mt-2 text-2xl font-bold text-red-700">
            {formatMoney(
              creditValue
            )}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Last Invoice
          </p>

          <p className="mt-2 text-lg font-bold text-slate-950">
            {formatDate(
              latestSalesInvoice?.invoiceDate
            )}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Account Status
          </p>

          <p
            className={`mt-2 text-lg font-bold ${
              customer.accountOnHold
                ? "text-red-700"
                : "text-emerald-700"
            }`}
          >
            {customer.accountOnHold
              ? "ON HOLD"
              : customer.status}
          </p>
        </div>
      </div>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Sales Performance
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Year-to-date net sales compared with the same period last year.
          Credits reduce sales and cancelled transactions are excluded.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {currentYear} Sales
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
              {formatMoney(
                currentYearSales
              )}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {previousYear} Sales
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
              {formatMoney(
                previousYearSales
              )}
            </p>
          </div>

          <div
            className={`rounded-lg p-4 ${
              salesMovement === null
                ? "bg-slate-50"
                : salesMovement >= 0
                ? "bg-emerald-50"
                : "bg-red-50"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Movement
            </p>

            <p
              className={`mt-2 text-2xl font-bold ${
                salesMovement === null
                  ? "text-slate-700"
                  : salesMovement >= 0
                  ? "text-emerald-700"
                  : "text-red-700"
              }`}
            >
              {salesMovement === null
                ? "—"
                : `${
                    salesMovement >= 0
                      ? "+"
                      : ""
                  }${salesMovement.toFixed(
                    1
                  )}%`}
            </p>

<p
  className={`mt-1 text-sm font-semibold ${
    salesMovementValue >= 0
      ? "text-emerald-700"
      : "text-red-700"
  }`}
>
  {salesMovementValue >= 0
    ? "+"
    : ""}
  {formatMoney(
    salesMovementValue
  )} vs {previousYear}
</p>

          </div>
        </div>

        {hasSalesDecline &&
          salesMovement !== null && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-700">
                Sales Alert
              </p>

              <p className="mt-1 text-sm text-red-700">
                {customer.name} is{" "}
                <span className="font-bold">
                  {formatMoney(
                    Math.abs(
                      salesMovementValue
                    )
                  )}
                </span>{" "}
                behind the same period last year (
                {salesMovement.toFixed(
                  1
                )}
                %).
              </p>
            </div>
          )}
      </section>

      <section
  id="product-performance"
  className="rounded-xl border bg-white p-6 shadow-sm"
>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Product Performance
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Products bought YTD compared with the same period last year.
              Credits reduce quantity and sales.
            </p>
          </div>

          <div className="text-sm font-semibold text-slate-500">
            {currentYear} vs {previousYear}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link
  href={`/commercial/customers/${customer.id}?products=top#product-performance`}
  className={`rounded-lg p-4 transition ${
    productView === "top"
      ? "ring-2 ring-slate-950 bg-slate-100"
      : "bg-slate-50 hover:bg-slate-100"
  }`}
>
  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
    Products Bought YTD
  </p>

  <p className="mt-2 text-2xl font-bold text-slate-950">
    {productsBoughtYtd}
  </p>
</Link>

          <Link
  href={`/commercial/customers/${customer.id}?products=new#product-performance`}
  className={`rounded-lg p-4 transition ${
    productView === "new"
      ? "ring-2 ring-blue-700 bg-blue-100"
      : "bg-blue-50 hover:bg-blue-100"
  }`}
>
  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
    New Products This Year
  </p>

  <p className="mt-2 text-2xl font-bold text-blue-800">
    {newProductsYtd}
  </p>
</Link>

          <Link
  href={`/commercial/customers/${customer.id}?products=growth#product-performance`}
  className={`rounded-lg p-4 transition ${
    productView === "growth"
      ? "ring-2 ring-emerald-700 bg-emerald-100"
      : "bg-emerald-50 hover:bg-emerald-100"
  }`}
>
  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
    Biggest Growth
  </p>

  {biggestGrowthProduct ? (
    <>
      <p className="mt-2 font-bold text-emerald-800">
        {biggestGrowthProduct.stockCode}
      </p>

      <p className="mt-1 text-sm text-emerald-700">
        +
        {formatMoney(
          biggestGrowthProduct.salesChange
        )}
      </p>
    </>
  ) : (
    <p className="mt-2 text-lg font-bold text-slate-700">
      —
    </p>
  )}
</Link>

          <Link
  href={`/commercial/customers/${customer.id}?products=decline#product-performance`}
  className={`rounded-lg p-4 transition ${
    productView === "decline"
      ? "ring-2 ring-red-700 bg-red-100"
      : "bg-red-50 hover:bg-red-100"
  }`}
>
  <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
    Biggest Decline
  </p>

  {biggestDeclineProduct ? (
    <>
      <p className="mt-2 font-bold text-red-800">
        {biggestDeclineProduct.stockCode}
      </p>

      <p className="mt-1 text-sm text-red-700">
        {formatMoney(
          biggestDeclineProduct.salesChange
        )}
      </p>
    </>
  ) : (
    <p className="mt-2 text-lg font-bold text-slate-700">
      —
    </p>
  )}
</Link>
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Product
                </th>

                <th className="px-4 py-3 text-right font-semibold text-slate-600">
                  {currentYear} Qty
                </th>

                <th className="px-4 py-3 text-right font-semibold text-slate-600">
                  {currentYear} Sales
                </th>

                <th className="px-4 py-3 text-right font-semibold text-slate-600">
                  {previousYear} Qty
                </th>

                <th className="px-4 py-3 text-right font-semibold text-slate-600">
                  {previousYear} Sales
                </th>

                <th className="px-4 py-3 text-right font-semibold text-slate-600">
                  £ Change
                </th>

                <th className="px-4 py-3 text-right font-semibold text-slate-600">
                  % Change
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {displayedProductPerformance.map(
                (product) => (
                  <tr
                    key={
                      product.stockCode
                    }
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/products/${encodeURIComponent(
                          product.stockCode
                        )}`}
                        className="font-semibold text-slate-950 hover:text-amber-600 hover:underline"
                      >
                        {product.stockCode}
                      </Link>

                      {product.description && (
                        <p className="mt-1 max-w-md text-xs text-slate-500">
                          {
                            product.description
                          }
                        </p>
                      )}

                      {product.isNew && (
                        <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                          NEW
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-semibold text-slate-950">
                      {product.currentQty.toLocaleString(
                        "en-GB",
                        {
                          maximumFractionDigits: 2,
                        }
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-semibold text-slate-950">
                      {formatMoney(
                        product.currentSales
                      )}
                    </td>

                    <td className="px-4 py-3 text-right text-slate-700">
                      {product.previousQty.toLocaleString(
                        "en-GB",
                        {
                          maximumFractionDigits: 2,
                        }
                      )}
                    </td>

                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatMoney(
                        product.previousSales
                      )}
                    </td>

                    <td
                      className={`px-4 py-3 text-right font-bold ${
                        product.salesChange >
                        0
                          ? "text-emerald-700"
                          : product.salesChange <
                            0
                          ? "text-red-700"
                          : "text-slate-600"
                      }`}
                    >
                      {product.salesChange >
                      0
                        ? "+"
                        : ""}
                      {formatMoney(
                        product.salesChange
                      )}
                    </td>

                    <td
                      className={`px-4 py-3 text-right font-bold ${
                        product.isNew
                          ? "text-blue-700"
                          : product.percentageChange !==
                              null &&
                            product.percentageChange >
                              0
                          ? "text-emerald-700"
                          : product.percentageChange !==
                              null &&
                            product.percentageChange <
                              0
                          ? "text-red-700"
                          : "text-slate-600"
                      }`}
                    >
                      {product.isNew
                        ? "NEW"
                        : product.percentageChange ===
                          null
                        ? "—"
                        : `${
                            product.percentageChange >
                            0
                              ? "+"
                              : ""
                          }${product.percentageChange.toFixed(
                            1
                          )}%`}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

            <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
              OdinIQ Commercial Intelligence
            </p>

            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              Meeting Intelligence
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Commercial talking points generated from this customer&apos;s
              year-to-date performance.
            </p>
          </div>

          <div className="rounded-lg bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              YTD Movement
            </p>

            <p
              className={`mt-1 text-xl font-bold ${
                salesMovementValue >= 0
                  ? "text-emerald-700"
                  : "text-red-700"
              }`}
            >
              {salesMovementValue >= 0 ? "+" : ""}
              {formatMoney(salesMovementValue)}
            </p>

            <p className="text-xs text-slate-500">
              {salesMovement === null
                ? "No prior-year comparison"
                : `${salesMovement >= 0 ? "+" : ""}${salesMovement.toFixed(
                    1
                  )}% vs ${previousYear}`}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border bg-white p-5">
            <h3 className="font-semibold text-emerald-800">
              Growth Drivers
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Products contributing the largest £ increases.
            </p>

            <div className="mt-4 space-y-3">
              {meetingTopGrowth.map((product, index) => (
                <div
                  key={product.stockCode}
                  className="flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {index + 1}. {product.stockCode}
                    </p>

                    {product.description && (
                      <p className="text-xs text-slate-500">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <p className="whitespace-nowrap font-bold text-emerald-700">
                    +{formatMoney(product.salesChange)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <h3 className="font-semibold text-red-800">
              Areas to Discuss
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Products with the largest year-on-year reductions.
            </p>

            <div className="mt-4 space-y-3">
              {meetingTopDeclines.map((product, index) => (
                <div
                  key={product.stockCode}
                  className="flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {index + 1}. {product.stockCode}
                    </p>

                    {product.description && (
                      <p className="text-xs text-slate-500">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <p className="whitespace-nowrap font-bold text-red-700">
                    {formatMoney(product.salesChange)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <h3 className="font-semibold text-blue-800">
              New Product Adoption
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Highest-value products bought this year with no equivalent
              sales last year.
            </p>

            <div className="mt-4 space-y-3">
              {meetingNewProducts.map((product, index) => (
                <div
                  key={product.stockCode}
                  className="flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {index + 1}. {product.stockCode}
                    </p>

                    {product.description && (
                      <p className="text-xs text-slate-500">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <p className="whitespace-nowrap font-bold text-blue-700">
                    {formatMoney(product.currentSales)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase text-emerald-700">
              Positive Product Growth
            </p>

            <p className="mt-1 text-xl font-bold text-emerald-800">
              +{formatMoney(totalPositiveProductGrowth)}
            </p>
          </div>

          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-xs font-semibold uppercase text-red-700">
              Product Reductions
            </p>

            <p className="mt-1 text-xl font-bold text-red-800">
              -{formatMoney(totalProductDecline)}
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase text-blue-700">
              New Products
            </p>

            <p className="mt-1 text-xl font-bold text-blue-800">
              {newProductsYtd}
            </p>

            <p className="mt-1 text-xs text-blue-700">
              products adopted in {currentYear}
            </p>
          </div>
        </div>

        {odinTalkingPoints.length > 0 && (
          <div className="mt-6 rounded-xl border bg-white p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                Ask Odin
              </p>

              <h3 className="mt-1 text-lg font-semibold text-slate-950">
                Suggested Talking Points
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Commercial questions and opportunities identified from the
                customer&apos;s current performance.
              </p>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {odinTalkingPoints.map(
                (point, index) => (
                  <div
                    key={`${point.title}-${index}`}
                    className={`rounded-lg border p-4 ${
                      point.type === "positive"
                        ? "border-emerald-200 bg-emerald-50"
                        : point.type === "opportunity"
                        ? "border-amber-200 bg-amber-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <p
                      className={`font-bold ${
                        point.type === "positive"
                          ? "text-emerald-800"
                          : point.type === "opportunity"
                          ? "text-amber-800"
                          : "text-red-800"
                      }`}
                    >
                      {point.title}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {point.text}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

      </section>



      {canViewProfitability &&
        profitability && (
          <section className="rounded-xl border border-violet-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                  Restricted Commercial Information
                </p>

                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  {currentYear} YTD Profitability
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Product margin less customer-specific commercial investment.
                </p>
              </div>

              <span className="w-fit rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                ADMIN / ACCOUNTS
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Net Sales
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {formatMoney(
                    profitability.netSales
                  )}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  COGS
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {formatMoney(
                    profitability.cogs
                  )}
                </p>
              </div>

              <div className="rounded-lg bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Gross Profit
                </p>

                <p className="mt-2 text-2xl font-bold text-emerald-700">
                  {formatMoney(
                    profitability.grossProfit
                  )}
                </p>

                <p className="mt-1 text-xs text-emerald-700">
                  {profitability.grossMargin.toFixed(
                    1
                  )}
                  % margin
                </p>
              </div>

              <div className="rounded-lg bg-violet-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                  Commercial Costs
                </p>

                <p className="mt-2 text-2xl font-bold text-violet-700">
                  {formatMoney(
                    profitability.totalCommercialCosts
                  )}
                </p>
              </div>

              <div
                className={`rounded-lg p-4 ${
                  profitability.trueProfit >=
                  0
                    ? "bg-emerald-100"
                    : "bg-red-100"
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    profitability.trueProfit >=
                    0
                      ? "text-emerald-800"
                      : "text-red-800"
                  }`}
                >
                  True Profit
                </p>

                <p
                  className={`mt-2 text-2xl font-bold ${
                    profitability.trueProfit >=
                    0
                      ? "text-emerald-800"
                      : "text-red-800"
                  }`}
                >
                  {formatMoney(
                    profitability.trueProfit
                  )}
                </p>

                <p
                  className={`mt-1 text-xs ${
                    profitability.trueProfit >=
                    0
                      ? "text-emerald-800"
                      : "text-red-800"
                  }`}
                >
                  {profitability.trueMargin.toFixed(
                    1
                  )}
                  % true margin
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-lg border bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-950">
                Commercial Cost Breakdown
              </h3>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [
                    "Rebates",
                    profitability.rebate,
                  ],

                  [
                    "Agent Commission",
                    profitability.agentCommission,
                  ],

                  [
                    "Merchandise",
                    profitability.merchandise,
                  ],

                  [
                    "Entertainment",
                    profitability.entertainment,
                  ],

                  [
                    "Marketing",
                    profitability.marketing,
                  ],

                  [
                    "Carriage",
                    profitability.carriage,
                  ],

                  [
                    "Other",
                    profitability.other,
                  ],
                ].map(
                  ([label, value]) => (
                    <div
                      key={String(
                        label
                      )}
                      className="rounded-lg border bg-white p-3"
                    >
                      <p className="text-xs text-slate-500">
                        {label}
                      </p>

                      <p className="mt-1 font-bold text-slate-950">
                        {formatMoney(
                          Number(
                            value
                          )
                        )}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>

            {profitability.automaticRebate >
              0 && (
              <div className="mt-5 rounded-lg border border-violet-200 bg-violet-50 p-4">
                <p className="text-sm font-bold text-violet-800">
                  Automatic Rebate
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <div>
                    <p className="text-xs text-violet-700">
                      Agreement
                    </p>

                    <p className="mt-1 font-semibold text-violet-950">
                      {profitability.rebateAgreementName ??
                        "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-violet-700">
                      Rebate Rate
                    </p>

                    <p className="mt-1 font-semibold text-violet-950">
                      {profitability.automaticRebatePercent.toFixed(
                        2
                      )}
                      %
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-violet-700">
                      Qualifying Sales
                    </p>

                    <p className="mt-1 font-semibold text-violet-950">
                      {formatMoney(
                        profitability.rebateQualifyingSales
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-violet-700">
                      Rebate Cost
                    </p>

                    <p className="mt-1 font-bold text-red-700">
                      {formatMoney(
                        profitability.automaticRebate
                      )}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-violet-700">
                  {profitability.rebateSource ===
                  "BUYING_GROUP_AGREEMENT"
                    ? "Rebate tier qualified using total buying-group sales. Only this customer's share is included in this customer's true profit."
                    : "Rebate calculated from this customer's linked commercial agreement."}
                </p>
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Despatch COGS
                </p>

                <p className="mt-2 text-lg font-bold text-slate-950">
                  {formatMoney(
                    profitability.normalCogs
                  )}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Credit Cost Reversal
                </p>

                <p className="mt-2 text-lg font-bold text-red-700">
                  {formatMoney(
                    profitability.creditCogsAdjustment
                  )}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cost Coverage
                </p>

                <p className="mt-2 text-lg font-bold text-slate-950">
                  {
                    profitability.costedLines
                  }{" "}
                  lines costed
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {
                    profitability.uncostedLines
                  }{" "}
                  lines missing cost
                </p>
              </div>
            </div>

            {(profitability.uncostedLines >
              0 ||
              profitability
                .creditNotesWithoutProductLines >
                0) && (
              <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-800">
                  Profitability is provisional
                </p>

                {profitability.uncostedLines >
                  0 && (
                  <p className="mt-1 text-sm text-amber-800">
                    {
                      profitability.uncostedLines
                    }{" "}
                    product line(s) could not be costed.
                  </p>
                )}

                {profitability
                  .missingStockCodes
                  .length >
                  0 && (
                  <p className="mt-1 text-sm text-amber-800">
                    Missing stock codes:{" "}
                    {profitability.missingStockCodes.join(
                      ", "
                    )}
                  </p>
                )}

                {profitability
                  .creditNotesWithoutProductLines >
                  0 && (
                  <p className="mt-1 text-sm text-amber-800">
                    {
                      profitability.creditNotesWithoutProductLines
                    }{" "}
                    credit note(s) do not yet contain detailed product quantities.
                  </p>
                )}
              </div>
            )}

            {profitability.uncostedLines ===
              0 &&
              profitability
                .creditNotesWithoutProductLines ===
                0 && (
                <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-700">
                    All relevant product lines have a cost available.
                  </p>

                  <p className="mt-1 text-xs text-emerald-700">
                    Current product cost is used where no historical cost record exists.
                  </p>
                </div>
              )}

            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-semibold text-slate-950">
                Add Commercial Cost
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Record commission, merchandise, entertainment, marketing or other investment against this customer. Rebates linked through an agreement are calculated automatically.
              </p>

              <form
                action={
                  addCommercialCostAction
                }
                className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
              >
                <div>
                  <label
                    htmlFor="costDate"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Date
                  </label>

                  <input
                    id="costDate"
                    name="costDate"
                    type="date"
                    required
                    defaultValue={formatInputDate(
                      today
                    )}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="costType"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Type
                  </label>

                  <select
                    id="costType"
                    name="costType"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="REBATE">
                      Rebate
                    </option>

                    <option value="AGENT_COMMISSION">
                      Agent Commission
                    </option>

                    <option value="MERCHANDISE">
                      Merchandise
                    </option>

                    <option value="ENTERTAINMENT">
                      Entertainment
                    </option>

                    <option value="MARKETING">
                      Marketing
                    </option>

                    <option value="CARRIAGE">
                      Carriage
                    </option>

                    <option value="OTHER">
                      Other
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="amount"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Cost Amount
                  </label>

                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Description
                  </label>

                  <input
                    id="description"
                    name="description"
                    type="text"
                    placeholder="e.g. Customer golf day"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="md:col-span-2 xl:col-span-3">
                  <label
                    htmlFor="notes"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Notes
                  </label>

                  <input
                    id="notes"
                    name="notes"
                    type="text"
                    placeholder="Optional notes"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Add Cost
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-semibold text-slate-950">
                {currentYear} Commercial Cost Ledger
              </h3>

              <div className="mt-4 overflow-x-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        Date
                      </th>

                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        Type
                      </th>

                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        Description
                      </th>

                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        Source
                      </th>

                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        Amount
                      </th>

                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {commercialCostEntries.map(
                      (cost) => {
                        const deleteAction =
                          deleteCustomerCommercialCost.bind(
                            null,
                            customer.id,
                            cost.id
                          );

                        return (
                          <tr
                            key={
                              cost.id
                            }
                          >
                            <td className="px-4 py-3 text-slate-700">
                              {formatDate(
                                cost.costDate
                              )}
                            </td>

                            <td className="px-4 py-3 font-semibold text-slate-950">
                              {cost.costType.replaceAll(
                                "_",
                                " "
                              )}
                            </td>

                            <td className="px-4 py-3 text-slate-700">
                              {cost.description ??
                                "—"}
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              {cost.source ??
                                "—"}
                            </td>

                            <td className="px-4 py-3 text-right font-semibold text-red-700">
                              {formatMoney(
                                cost.amount
                              )}
                            </td>

                            <td className="px-4 py-3 text-right">
                              {cost.isAutomatic ? (
                                <span className="text-xs font-semibold text-slate-500">
                                  Automatic
                                </span>
                              ) : (
                                <form
                                  action={
                                    deleteAction
                                  }
                                >
                                  <button
                                    type="submit"
                                    className="text-sm font-semibold text-red-700 hover:underline"
                                  >
                                    Delete
                                  </button>
                                </form>
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}

                    {commercialCostEntries.length ===
                      0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          No commercial costs have been recorded for {currentYear}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

      <section
  id="product-performance"
  className="rounded-xl border bg-white p-6 shadow-sm"
>
        <h2 className="text-lg font-semibold text-slate-950">
          Full Year Sales History
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Net sales for the five most recent completed calendar years,
          including credit-note adjustments.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-5">
          {fullYearSales.map(
            (item) => (
              <div
                key={item.year}
                className="rounded-lg bg-slate-50 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {item.year}
                </p>

                <p className="mt-2 text-xl font-bold text-slate-950">
                  {formatMoney(
                    item.sales
                  )}
                </p>
              </div>
            )
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Account details
        </h2>

        <div className="mt-4 grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-3">
          <div>
            <p className="text-slate-500">
              Buying group
            </p>

            <p className="mt-1 font-semibold text-slate-950">
              {customer.buyingGroup ??
                "—"}
            </p>
          </div>

          <div>
            <p className="text-slate-500">
              Payment terms
            </p>

            <p className="mt-1 font-semibold text-slate-950">
              {customer.paymentTerms ??
                "—"}
            </p>
          </div>

          <div>
            <p className="text-slate-500">
              Discount
            </p>

            <p className="mt-1 font-semibold text-slate-950">
              {customer.discount !=
              null
                ? `${customer.discount}%`
                : "—"}
            </p>
          </div>

          {!isAgent && (
            <>
              <div>
                <p className="text-slate-500">
                  Credit limit
                </p>

                <p className="mt-1 font-semibold text-slate-950">
                  {customer.creditLimit !=
                  null
                    ? formatMoney(
                        customer.creditLimit
                      )
                    : "—"}
                </p>
              </div>

              <div>
                <p className="text-slate-500">
                  Current balance
                </p>

                <p className="mt-1 font-semibold text-slate-950">
                  {customer.currentBalance !=
                  null
                    ? formatMoney(
                        customer.currentBalance
                      )
                    : "—"}
                </p>
              </div>
            </>
          )}

          <div>
            <p className="text-slate-500">
              Last invoice
            </p>

            <p className="mt-1 font-semibold text-slate-950">
              {formatDate(
                latestSalesInvoice?.invoiceDate
              )}
            </p>
          </div>
        </div>
      </section>

      <section
        id="recent-sales-activity"
        className="rounded-xl border bg-white shadow-sm"
      >
        <div className="border-b px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Recent Sales Activity
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Filter activity by date and see the total number and value of transactions for the selected period.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                ["invoices", "Invoices"],
                ["credits", "Credits"],
                ["cancelled", "Cancelled"],
              ].map(([value, label]) => (
                <Link
                  key={value}
                  href={activityHref({
                    activity: value,
                    page: 1,
                  })}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    activityFilter === value
                      ? value === "credits"
                        ? "border-red-700 bg-red-700 text-white"
                        : value === "cancelled"
                        ? "border-slate-600 bg-slate-600 text-white"
                        : "border-slate-950 bg-slate-950 text-white"
                      : value === "credits"
                      ? "border-slate-300 bg-white text-red-700 hover:bg-red-50"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              ["all", "All Dates"],
              ["this-month", "This Month"],
              ["last-month", "Last Month"],
              ["ytd", "YTD"],
            ].map(([value, label]) => (
              <Link
                key={value}
                href={activityHref({
                  activityPeriod: value,
                  page: 1,
                })}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                  selectedActivityPeriod === value
                    ? "border-amber-500 bg-amber-50 text-amber-800"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <form
            method="get"
            action={`/commercial/customers/${customer.id}`}
            className="mt-4 flex flex-col gap-3 rounded-lg bg-slate-50 p-4 md:flex-row md:items-end"
          >
            {activityFilter !== "all" && (
              <input
                type="hidden"
                name="activity"
                value={activityFilter}
              />
            )}

            <input
              type="hidden"
              name="activityPeriod"
              value="custom"
            />

            <div>
              <label
                htmlFor="activityFrom"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                From
              </label>
              <input
                id="activityFrom"
                name="activityFrom"
                type="date"
                defaultValue={activityFrom ?? ""}
                className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
              />
            </div>

            <div>
              <label
                htmlFor="activityTo"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                To
              </label>
              <input
                id="activityTo"
                name="activityTo"
                type="date"
                defaultValue={activityTo ?? ""}
                className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
              />
            </div>

            <button
              type="submit"
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Apply Date Range
            </button>

            {selectedActivityPeriod !== "all" && (
              <Link
                href={activityHref({
                  activityPeriod: "all",
                  page: 1,
                })}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Clear Dates
              </Link>
            )}
          </form>

          {invalidActivityDateRange && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              The From date must be before the To date.
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Invoices
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-950">
                {activityInvoiceCount}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {formatMoney(activityInvoiceValue)}
              </p>
            </div>

            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Credits
              </p>
              <p className="mt-1 text-2xl font-bold text-red-700">
                {activityCreditCount}
              </p>
              <p className="mt-1 text-sm font-semibold text-red-700">
                {formatMoney(activityCreditValue)}
              </p>
            </div>

            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Net Sales
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">
                {formatMoney(activityNetSalesValue)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Invoices less credits
              </p>
            </div>

            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cancelled Orders
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-700">
                {activityCancelledCount}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                {formatMoney(activityCancelledValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">
                  Date
                </th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">
                  Type
                </th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">
                  Reference
                </th>
                <th className="px-6 py-3 text-right font-semibold text-slate-600">
                  Net Value
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {paginatedActivity.map((item) => {
                const credit =
                  item.kind === "credit";
                const cancelled =
                  item.kind === "cancelled";

                return (
                  <tr
                    key={`${item.kind}-${item.reference}`}
                  >
                    <td className="px-6 py-4 text-slate-700">
                      {formatDate(item.date)}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={
                          cancelled
                            ? "font-semibold text-slate-600"
                            : credit
                            ? "font-semibold text-red-700"
                            : "font-semibold text-emerald-700"
                        }
                      >
                        {cancelled
                          ? "Cancelled"
                          : credit
                          ? "Credit"
                          : "Invoice"}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-semibold">
                      {cancelled ? (
                        <Link
                          href={`/sales-orders/${item.salesOrderNumber}`}
                          className="text-slate-950 hover:text-amber-600 hover:underline"
                        >
                          SO {item.reference}
                        </Link>
                      ) : (
                        <Link
                          href={`/commercial/customers/${customer.id}/invoices/${item.reference}`}
                          className={
                            credit
                              ? "text-red-700 hover:text-red-800 hover:underline"
                              : "text-slate-950 hover:text-amber-600 hover:underline"
                          }
                        >
                          {item.reference}
                        </Link>
                      )}
                    </td>

                    <td
                      className={`px-6 py-4 text-right font-semibold ${
                        credit
                          ? "text-red-700"
                          : cancelled
                          ? "text-slate-600"
                          : "text-slate-950"
                      }`}
                    >
                      {formatMoney(item.value)}
                    </td>
                  </tr>
                );
              })}

              {paginatedActivity.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-sm text-slate-500"
                  >
                    No activity was found for this filter and date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalActivityPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-slate-500">
              Page {safeActivityPage} of{" "}
              {totalActivityPages}
            </p>

            <div className="flex gap-2">
              {safeActivityPage > 1 && (
                <Link
                  href={activityHref({
                    page: safeActivityPage - 1,
                  })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Previous
                </Link>
              )}

              {safeActivityPage <
                totalActivityPages && (
                <Link
                  href={activityHref({
                    page: safeActivityPage + 1,
                  })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

