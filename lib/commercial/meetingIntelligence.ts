import { prisma } from "@/lib/prisma";

import {
  calculateNetSalesYTD,
  isCancelledTransaction,
  isCreditNote,
} from "@/lib/commercial/salesCalculations";

type ProductPerformance = {
  productCode: string;
  description: string;

  currentQty: number;
  currentSales: number;

  previousQty: number;
  previousSales: number;

  difference: number;
  percentageChange: number | null;
  isNew: boolean;
};

export type MeetingTalkingPoint = {
  title: string;
  text: string;
  type:
    | "positive"
    | "opportunity"
    | "watch";
};

export type MeetingPriority = {
  title: string;
  text: string;
  type:
    | "positive"
    | "opportunity"
    | "watch";
};

export type MeetingIntelligence = {
  customer: {
    id: number;
    accountCode: string;
    name: string;
    buyingGroup: string | null;
  };

  sales: {
    currentYear: number;
    previousYear: number;

    currentYearSales: number;
    previousYearSales: number;

    difference: number;
    percentageChange: number | null;
  };

  products: {
    currentYearCount: number;
    previousYearCount: number;

    newProductsCount: number;
    stoppedProductsCount: number;

    stoppedProductsSalesValue: number;

    totalPositiveProductGrowth: number;
    totalProductDecline: number;

    topGrowth: ProductPerformance[];
    topDeclines: ProductPerformance[];
    stopped: ProductPerformance[];
    newProducts: ProductPerformance[];
  };

    opportunities: {
    id: number;
    title: string;
    description: string | null;
    stage: string;
    status: string;
    value: number | null;
    probability: number | null;
    expectedCloseDate: Date | null;
    source: string | null;
  }[];

  talkingPoints: string[];

  detailedTalkingPoints: MeetingTalkingPoint[];

  priorities: MeetingPriority[];
};

function normalizeProductCode(
  value: string | null | undefined
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
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

function calculatePercentageChange(
  current: number,
  previous: number
) {
  if (previous === 0) {
    return current > 0
      ? null
      : 0;
  }

  return (
    ((current - previous) /
      Math.abs(previous)) *
    100
  );
}

export async function getMeetingIntelligence({
  companyId,
  customerId,
}: {
  companyId: number;
  customerId: number;
}): Promise<MeetingIntelligence> {
  const customer =
    await prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId,
      },

      select: {
        id: true,
        accountCode: true,
        name: true,
        buyingGroup: true,
      },
    });

  if (!customer) {
    throw new Error(
      "Customer not found for meeting intelligence."
    );
  }
  const opportunities =
    await prisma.commercialOpportunity.findMany({
      where: {
        companyId,
        customerId,
        status: "OPEN",
      },

      select: {
        id: true,
        title: true,
        description: true,
        stage: true,
        status: true,
        value: true,
        probability: true,
        expectedCloseDate: true,
        source: true,
      },

      orderBy: [
        {
          expectedCloseDate: "asc",
        },
        {
          value: "desc",
        },
      ],
    });

  const invoices =
    await prisma.salesInvoice.findMany({
      where: {
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

  const today = new Date();

  const currentYear =
    today.getFullYear();

  const previousYear =
    currentYear - 1;

  /*
   * --------------------------------
   * SALES PERFORMANCE
   * --------------------------------
   */

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

  const salesDifference =
    currentYearSales -
    previousYearSales;

  const salesPercentageChange =
    previousYearSales !== 0
      ? (salesDifference /
          Math.abs(
            previousYearSales
          )) *
        100
      : null;

  /*
   * --------------------------------
   * PRODUCT PERFORMANCE
   * --------------------------------
   *
   * This intentionally follows the
   * same rules as Customer Performance:
   *
   * - Same-period YTD comparison
   * - Cancelled transactions excluded
   * - Credit notes reduce quantity
   *   and sales
   * - Non-product transaction codes
   *   excluded
   */

  const productPerformanceMap =
    new Map<
      string,
      {
        productCode: string;
        description: string;

        currentQty: number;
        currentSales: number;

        previousQty: number;
        previousSales: number;
      }
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
      const productCode =
        normalizeProductCode(
          line.stockCode
        );

      if (
        !productCode ||
        nonProductCodes.has(
          productCode
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
          productCode
        ) ?? {
          productCode,

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
        productCode,
        existing
      );
    }
  }

  const productPerformance: ProductPerformance[] =
    [
      ...productPerformanceMap.values(),
    ]
      .map((product) => {
        const difference =
          product.currentSales -
          product.previousSales;

        const percentageChange =
          calculatePercentageChange(
            product.currentSales,
            product.previousSales
          );

        const isNew =
          product.previousSales ===
            0 &&
          product.currentSales > 0;

        return {
          ...product,
          difference,
          percentageChange,
          isNew,
        };
      })
      .sort(
        (a, b) =>
          b.currentSales -
          a.currentSales
      );

  /*
   * Same Products Bought YTD rule
   * used on Customer Performance.
   */

  const currentYearCount =
    productPerformance.filter(
      (product) =>
        product.currentQty > 0 ||
        product.currentSales > 0
    ).length;

  const previousYearCount =
    productPerformance.filter(
      (product) =>
        product.previousQty > 0 ||
        product.previousSales > 0
    ).length;

  const newProducts =
    productPerformance
      .filter(
        (product) =>
          product.isNew
      )
      .sort(
        (a, b) =>
          b.currentSales -
          a.currentSales
      );

  const newProductsCount =
    newProducts.length;

  const stoppedProducts =
    productPerformance
      .filter(
        (product) =>
          product.previousSales >
            0 &&
          product.currentSales ===
            0
      )
      .sort(
        (a, b) =>
          b.previousSales -
          a.previousSales
      );

  const stoppedProductsCount =
    stoppedProducts.length;

  const activeDecliningProducts =
    productPerformance
      .filter(
        (product) =>
          product.currentSales > 0 &&
          product.previousSales > 0 &&
          product.difference < 0
      )
      .sort(
        (a, b) =>
          a.difference -
          b.difference
      );

  /*
   * Customer Performance's meeting
   * growth list includes every
   * positive movement, including
   * newly adopted products.
   */

  const meetingTopGrowth =
    [...productPerformance]
      .filter(
        (product) =>
          product.difference > 0
      )
      .sort(
        (a, b) =>
          b.difference -
          a.difference
      )
      .slice(0, 5);

  const meetingTopDeclines =
    [...productPerformance]
      .filter(
        (product) =>
          product.difference < 0
      )
      .sort(
        (a, b) =>
          a.difference -
          b.difference
      )
      .slice(0, 5);

  const meetingNewProducts =
    newProducts.slice(0, 5);

  const topStoppedProducts =
    stoppedProducts.slice(0, 5);

  const topActiveDecliningProducts =
    activeDecliningProducts.slice(
      0,
      3
    );

  const totalPositiveProductGrowth =
    productPerformance
      .filter(
        (product) =>
          product.difference > 0
      )
      .reduce(
        (total, product) =>
          total +
          product.difference,
        0
      );

  const totalProductDecline =
    Math.abs(
      productPerformance
        .filter(
          (product) =>
            product.difference < 0
        )
        .reduce(
          (total, product) =>
            total +
            product.difference,
          0
        )
    );

  const stoppedProductsSalesValue =
    stoppedProducts.reduce(
      (total, product) =>
        total +
        product.previousSales,
      0
    );

  /*
   * --------------------------------
   * ODIN TALKING POINTS
   * --------------------------------
   */

  const detailedTalkingPoints:
    MeetingTalkingPoint[] = [];

  /*
   * Products stopped completely.
   */

  if (stoppedProductsCount > 0) {
    detailedTalkingPoints.push({
      title:
        "Ask — Lost Product Lines",

      text: `${
        customer.name
      } has stopped buying ${
        stoppedProductsCount
      } ${
        stoppedProductsCount === 1
          ? "product"
          : "products"
      } that generated ${formatMoney(
        stoppedProductsSalesValue
      )} in ${previousYear}. Ask whether these lines have moved to another supplier, been replaced by alternative products, or whether customer demand has changed.`,

      type: "watch",
    });
  }

  /*
   * Products still active but
   * declining.
   */

  if (
    topActiveDecliningProducts.length >
    0
  ) {
    const leadingDecline =
      topActiveDecliningProducts[0];

    detailedTalkingPoints.push({
      title:
        "Ask — Active Product Decline",

      text: `${
        leadingDecline.productCode
      } is still being purchased but is down ${formatMoney(
        Math.abs(
          leadingDecline.difference
        )
      )} (${Math.abs(
        leadingDecline.percentageChange ??
          0
      ).toFixed(
        1
      )}%) versus ${previousYear}. Ask whether demand has reduced, the customer has moved some volume to another product or supplier, or whether there is an opportunity to recover the lost volume.`,

      type: "watch",
    });
  }

  /*
   * Overall account performance.
   */

  if (
    salesPercentageChange !== null &&
    salesPercentageChange > 0
  ) {
    detailedTalkingPoints.push({
      title:
        "Strong Account Growth",

      text: `${
        customer.name
      } is ${salesPercentageChange.toFixed(
        1
      )}% ahead YTD, representing an increase of ${formatMoney(
        salesDifference
      )} versus the same period in ${previousYear}. Discuss what is driving the growth and how it can be sustained.`,

      type: "positive",
    });
  } else if (
    salesPercentageChange !== null &&
    salesPercentageChange < 0
  ) {
    detailedTalkingPoints.push({
      title:
        "Account Performance",

      text: `${
        customer.name
      } is ${Math.abs(
        salesPercentageChange
      ).toFixed(
        1
      )}% behind YTD, representing a reduction of ${formatMoney(
        Math.abs(
          salesDifference
        )
      )} versus ${previousYear}. Identify which areas of the account can be recovered.`,

      type: "watch",
    });
      }
      
 /*
 * Open commercial opportunities
 */
for (const opportunity of opportunities) {
  const probabilityText =
    opportunity.probability !== null
      ? `${opportunity.probability}% probability`
      : "probability not set";

  const valueText =
    opportunity.value !== null
      ? `The opportunity is valued at ${formatMoney(
          opportunity.value
        )}`
      : "No opportunity value has been set yet";

  const closeDateText =
    opportunity.expectedCloseDate
      ? ` The current expected close date is ${new Date(
          opportunity.expectedCloseDate
        ).toLocaleDateString("en-GB")}.`
      : "";

  let nextStepText =
    "Confirm the current position and agree the next action required to progress the opportunity.";

  if (opportunity.stage === "QUALIFY") {
    nextStepText =
      "Establish the customer's requirement, potential value and decision process before progressing the opportunity.";
  } else if (opportunity.stage === "DEVELOP") {
    nextStepText =
      "Establish what is required to move the opportunity forward, identify the key products or branches involved and agree a clear next action.";
  } else if (opportunity.stage === "PROPOSE") {
    nextStepText =
      "Confirm the proposal, commercial position, decision makers and what is required to secure the business.";
  } else if (opportunity.stage === "NEGOTIATE") {
    nextStepText =
      "Confirm the remaining commercial objections, decision process and actions required to close the opportunity.";
  }

  const descriptionText =
    opportunity.description?.trim()
      ? ` ${opportunity.description.trim()}`
      : "";

  detailedTalkingPoints.push({
    title: "Open Commercial Opportunity",

    text: `${customer.name} has an open opportunity: "${opportunity.title}".${descriptionText} It is currently at ${opportunity.stage} stage with ${probabilityText}. ${valueText}.${closeDateText} ${nextStepText}`,

    type: "opportunity",
  });
}

  let productShiftDeclineCode:
    string | null = null;

  let productShiftGrowthCode:
    string | null = null;

  for (
    const decline of meetingTopDeclines
  ) {
    if (
      decline.previousSales <= 0
    ) {
      continue;
    }

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
        decline.productCode;

      productShiftGrowthCode =
        possibleSwitch.productCode;

      detailedTalkingPoints.push({
        title:
          "Possible Product Shift",

        text: `${
          decline.productCode
        } has reduced by ${formatMoney(
          Math.abs(
            decline.difference
          )
        )}, while ${
          possibleSwitch.productCode
        } has increased by ${formatMoney(
          possibleSwitch.difference
        )}. The products appear related, so establish whether this represents a specification or product-mix change rather than lost business.`,

        type: "opportunity",
      });

      break;
    }
  }

  /*
   * New product adoption.
   */

  if (newProductsCount > 0) {
    detailedTalkingPoints.push({
      title:
        "Range Expansion",

      text: `${
        customer.name
      } has bought ${
        newProductsCount
      } products this year that had no equivalent sales in ${previousYear}. Discuss which successful new lines could be expanded further across the account.`,

      type: "positive",
    });
  }

  /*
   * Largest genuine decline that
   * wasn't already identified as
   * the declining side of a likely
   * product shift.
   */

  const recoveryOpportunity =
    [...productPerformance]
      .filter(
        (product) =>
          product.difference < 0 &&
          product.productCode !==
            productShiftDeclineCode
      )
      .sort(
        (a, b) =>
          a.difference -
          b.difference
      )[0] ?? null;

  if (recoveryOpportunity) {
    detailedTalkingPoints.push({
      title:
        "Recovery Opportunity",

      text: `${
        recoveryOpportunity.productCode
      } is down ${formatMoney(
        Math.abs(
          recoveryOpportunity.difference
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
   * Largest growth product that
   * wasn't already identified as
   * the growing side of a likely
   * product shift.
   */

  const growthOpportunity =
    [...productPerformance]
      .filter(
        (product) =>
          product.difference > 0 &&
          product.productCode !==
            productShiftGrowthCode
      )
      .sort(
        (a, b) =>
          b.difference -
          a.difference
      )[0] ?? null;

  if (growthOpportunity) {
    detailedTalkingPoints.push({
      title:
        "Growth Opportunity",

      text: `${
        growthOpportunity.productCode
      } is a major product growth driver, up ${formatMoney(
        growthOpportunity.difference
      )} versus ${previousYear}. Explore whether this success can be replicated across more of the customer's business.`,

      type: "positive",
    });
  }

  /*
   * --------------------------------
   * MEETING PRIORITIES
   * --------------------------------
   */

  const priorities: MeetingPriority[] =
    [];

  if (
    productShiftDeclineCode &&
    productShiftGrowthCode
  ) {
    priorities.push({
      title:
        "Product Shift",

      text: `${productShiftDeclineCode} ↓ / ${productShiftGrowthCode} ↑`,

      type: "opportunity",
    });
  }

  if (stoppedProductsCount > 0) {
    priorities.push({
      title:
        "Recovery",

      text: `${stoppedProductsCount} stopped ${
        stoppedProductsCount === 1
          ? "product"
          : "products"
      } · ${formatMoney(
        stoppedProductsSalesValue
      )} prior-year sales`,

      type: "watch",
    });
  }

  if (
    topActiveDecliningProducts[0]
  ) {
    const activeDecline =
      topActiveDecliningProducts[0];

    priorities.push({
      title:
        "Active Decline",

      text: `${
        activeDecline.productCode
      } ${formatMoney(
        activeDecline.difference
      )} · ${
        activeDecline.percentageChange !==
        null
          ? `${activeDecline.percentageChange.toFixed(
              1
            )}%`
          : "—"
      }`,

      type: "watch",
    });
  }

  /*
   * Keep the simple talkingPoints
   * array for the existing Meeting
   * page while also returning the
   * richer structured version.
   */

  const talkingPoints =
    detailedTalkingPoints.map(
      (point) =>
        `${point.title}: ${point.text}`
    );

  return {
    customer,

    sales: {
      currentYear,
      previousYear,

      currentYearSales,
      previousYearSales,

      difference:
        salesDifference,

      percentageChange:
        salesPercentageChange,
    },

    products: {
      currentYearCount,
      previousYearCount,

      newProductsCount,
      stoppedProductsCount,

      stoppedProductsSalesValue,

      totalPositiveProductGrowth,
      totalProductDecline,

      topGrowth:
        meetingTopGrowth,

      topDeclines:
        meetingTopDeclines,

      stopped:
        topStoppedProducts,

      newProducts:
        meetingNewProducts,
       },

    opportunities,

    talkingPoints,

    detailedTalkingPoints,

    priorities,
  };
}