import { prisma } from "@/lib/prisma";

export type CommercialIntelligenceSignalType =
  | "SALES_DECLINE"
  | "SALES_GROWTH"
  | "STOPPED_BUYING"
  | "NET_CREDIT_POSITION"
  | "DORMANT_CUSTOMER";

export type CommercialIntelligenceSeverity =
  | "HIGH"
  | "MEDIUM"
  | "POSITIVE";

export type CommercialIntelligenceSignal = {
  id: string;
  type: CommercialIntelligenceSignalType;
  severity: CommercialIntelligenceSeverity;
  title: string;
  description: string;
  customerAccountCode: string;
  customerName: string;
  currentValue?: number;
  previousValue?: number;
  percentageChange?: number;
  valueChange?: number;
  lastInvoiceDate?: Date;
};

type CustomerSalesPeriod = {
  accountCode: string;
  customerName: string;
  currentSales: number;
  previousSales: number;
  lastInvoiceDate: Date | null;
};

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(
  date: Date,
  days: number
) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function subtractDays(
  date: Date,
  days: number
) {
  return addDays(date, -days);
}

function calculatePercentageChange(
  current: number,
  previous: number
) {
  if (previous === 0) {
    return null;
  }

  return (
    ((current - previous) / previous) *
    100
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercentage(value: number) {
  return `${Math.abs(value).toFixed(0)}%`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function sortByValueImpact(
  a: CommercialIntelligenceSignal,
  b: CommercialIntelligenceSignal
) {
  return (
    Math.abs(b.valueChange ?? 0) -
    Math.abs(a.valueChange ?? 0)
  );
}

export async function getCommercialIntelligence(
  companyId: number
): Promise<CommercialIntelligenceSignal[]> {
  if (
    !Number.isInteger(companyId) ||
    companyId <= 0
  ) {
    throw new Error(
      "A valid company ID is required."
    );
  }

  /*
   * Find the latest invoice date held by this
   * company.
   *
   * Odin anchors its analysis to the company's
   * actual data rather than assuming that the
   * database is current up to today's date.
   */

  const invoiceRange =
    await prisma.salesInvoice.aggregate({
      where: {
        companyId,
        invoiceDate: {
          not: null,
        },
      },
      _max: {
        invoiceDate: true,
      },
    });

  const latestInvoiceDate =
    invoiceRange._max.invoiceDate;

  if (!latestInvoiceDate) {
    return [];
  }

  /*
   * The latest invoice date is included in the
   * current 90-day period.
   *
   * Example:
   *
   * Current period:
   * latest date minus 89 days -> latest date
   *
   * Previous period:
   * 90 days immediately before current period
   */

  const analysisDate =
    startOfDay(latestInvoiceDate);

  const currentPeriodStart =
    subtractDays(analysisDate, 89);

  const previousPeriodEnd =
    subtractDays(currentPeriodStart, 1);

  const previousPeriodStart =
    subtractDays(currentPeriodStart, 90);

  const currentPeriodEndExclusive =
    addDays(analysisDate, 1);

  const invoices =
    await prisma.salesInvoice.findMany({
      where: {
        companyId,
        invoiceDate: {
          gte: previousPeriodStart,
          lt: currentPeriodEndExclusive,
        },
        customerAccountCode: {
          not: null,
        },
      },
      select: {
        customerAccountCode: true,
        customerName: true,
        invoiceDate: true,
        netValue: true,
      },
    });

  const salesByCustomer = new Map<
    string,
    CustomerSalesPeriod
  >();

  for (const invoice of invoices) {
    const accountCode =
      invoice.customerAccountCode?.trim();

    if (!accountCode) {
      continue;
    }

    const invoiceDate =
      invoice.invoiceDate;

    if (!invoiceDate) {
      continue;
    }

    const existing =
      salesByCustomer.get(accountCode) ?? {
        accountCode,
        customerName:
          invoice.customerName?.trim() ||
          accountCode,
        currentSales: 0,
        previousSales: 0,
        lastInvoiceDate: null,
      };

    const value =
      invoice.netValue ?? 0;

    if (
      invoiceDate >= currentPeriodStart
    ) {
      existing.currentSales += value;
    } else {
      existing.previousSales += value;
    }

    if (
      !existing.lastInvoiceDate ||
      invoiceDate >
        existing.lastInvoiceDate
    ) {
      existing.lastInvoiceDate =
        invoiceDate;
    }

    salesByCustomer.set(
      accountCode,
      existing
    );
  }

  const declineSignals: CommercialIntelligenceSignal[] =
    [];

  const stoppedSignals: CommercialIntelligenceSignal[] =
    [];

  const creditSignals: CommercialIntelligenceSignal[] =
    [];

  const growthSignals: CommercialIntelligenceSignal[] =
    [];

  for (const customer of salesByCustomer.values()) {
    /*
     * Ignore very small previous-period accounts
     * for movement analysis.
     */

    if (customer.previousSales < 1000) {
      continue;
    }

    const valueChange =
      customer.currentSales -
      customer.previousSales;

    /*
     * NET CREDIT POSITION
     *
     * Credits exceed invoices in the current
     * period.
     */

    if (customer.currentSales < 0) {
      creditSignals.push({
        id: `net-credit-${customer.accountCode}`,
        type: "NET_CREDIT_POSITION",
        severity: "HIGH",
        title:
          `${customer.customerName} is in a ` +
          `net credit position`,
        description:
          `Net sales for the current 90-day ` +
          `period are ${formatCurrency(
            customer.currentSales
          )}, compared with ` +
          `${formatCurrency(
            customer.previousSales
          )} in the previous period. ` +
          `Credits currently exceed invoiced ` +
          `sales for this customer.`,
        customerAccountCode:
          customer.accountCode,
        customerName:
          customer.customerName,
        currentValue:
          customer.currentSales,
        previousValue:
          customer.previousSales,
        valueChange,
        lastInvoiceDate:
          customer.lastInvoiceDate ??
          undefined,
      });

      continue;
    }

    /*
     * STOPPED BUYING
     *
     * Customer had meaningful sales in the
     * previous period but no net sales in the
     * current period.
     */

    if (customer.currentSales === 0) {
      stoppedSignals.push({
        id: `stopped-buying-${customer.accountCode}`,
        type: "STOPPED_BUYING",
        severity:
          customer.previousSales >= 5000
            ? "HIGH"
            : "MEDIUM",
        title:
          `${customer.customerName} has ` +
          `stopped buying`,
        description:
          `This customer generated ` +
          `${formatCurrency(
            customer.previousSales
          )} in the previous 90-day period ` +
          `but has recorded no net sales in ` +
          `the current period.`,
        customerAccountCode:
          customer.accountCode,
        customerName:
          customer.customerName,
        currentValue: 0,
        previousValue:
          customer.previousSales,
        percentageChange: -100,
        valueChange:
          -customer.previousSales,
        lastInvoiceDate:
          customer.lastInvoiceDate ??
          undefined,
      });

      continue;
    }

    const percentageChange =
      calculatePercentageChange(
        customer.currentSales,
        customer.previousSales
      );

    if (percentageChange === null) {
      continue;
    }

    /*
     * SALES DECLINE
     *
     * Customer is still buying but sales are
     * down at least 20%, with at least £500
     * of revenue reduction.
     */

    const revenueLost =
      customer.previousSales -
      customer.currentSales;

    if (
      percentageChange <= -20 &&
      revenueLost >= 500
    ) {
      declineSignals.push({
        id: `sales-decline-${customer.accountCode}`,
        type: "SALES_DECLINE",
        severity:
          revenueLost >= 5000 ||
          percentageChange <= -50
            ? "HIGH"
            : "MEDIUM",
        title:
          `${customer.customerName} sales ` +
          `are falling`,
        description:
          `${customer.customerName} is down ` +
          `${formatPercentage(
            percentageChange
          )}, from ` +
          `${formatCurrency(
            customer.previousSales
          )} to ` +
          `${formatCurrency(
            customer.currentSales
          )}. That represents ` +
          `${formatCurrency(
            revenueLost
          )} less net revenue.`,
        customerAccountCode:
          customer.accountCode,
        customerName:
          customer.customerName,
        currentValue:
          customer.currentSales,
        previousValue:
          customer.previousSales,
        percentageChange,
        valueChange,
        lastInvoiceDate:
          customer.lastInvoiceDate ??
          undefined,
      });

      continue;
    }

    /*
     * SALES GROWTH
     *
     * At least 25% growth and £500 additional
     * net revenue.
     */

    const revenueGrowth =
      customer.currentSales -
      customer.previousSales;

    if (
      percentageChange >= 25 &&
      revenueGrowth >= 500
    ) {
      growthSignals.push({
        id: `sales-growth-${customer.accountCode}`,
        type: "SALES_GROWTH",
        severity: "POSITIVE",
        title:
          `${customer.customerName} is ` +
          `growing`,
        description:
          `${customer.customerName} is up ` +
          `${formatPercentage(
            percentageChange
          )}, from ` +
          `${formatCurrency(
            customer.previousSales
          )} to ` +
          `${formatCurrency(
            customer.currentSales
          )}. That represents ` +
          `${formatCurrency(
            revenueGrowth
          )} additional net revenue.`,
        customerAccountCode:
          customer.accountCode,
        customerName:
          customer.customerName,
        currentValue:
          customer.currentSales,
        previousValue:
          customer.previousSales,
        percentageChange,
        valueChange,
        lastInvoiceDate:
          customer.lastInvoiceDate ??
          undefined,
      });
    }
  }

  /*
   * DORMANT CUSTOMERS
   *
   * Look further back than the two comparison
   * periods for customers that have meaningful
   * historical sales but have been inactive for
   * at least 180 days.
   */

  const dormantCutoff =
    subtractDays(analysisDate, 180);

  const historicalCustomers =
    await prisma.salesInvoice.groupBy({
      by: [
        "customerAccountCode",
        "customerName",
      ],
      where: {
        companyId,
        customerAccountCode: {
          not: null,
        },
        invoiceDate: {
          lt: dormantCutoff,
        },
      },
      _max: {
        invoiceDate: true,
      },
      _sum: {
        netValue: true,
      },
    });

  const recentCustomerCodes =
    await prisma.salesInvoice.groupBy({
      by: ["customerAccountCode"],
      where: {
        companyId,
        customerAccountCode: {
          not: null,
        },
        invoiceDate: {
          gte: dormantCutoff,
          lt: currentPeriodEndExclusive,
        },
      },
    });

  const recentlyActive = new Set(
    recentCustomerCodes
      .map(
        (row) =>
          row.customerAccountCode?.trim()
      )
      .filter(
        (value): value is string =>
          Boolean(value)
      )
  );

  const dormantSignals: CommercialIntelligenceSignal[] =
    [];

  for (const customer of historicalCustomers) {
    const accountCode =
      customer.customerAccountCode?.trim();

    if (!accountCode) {
      continue;
    }

    if (recentlyActive.has(accountCode)) {
      continue;
    }

    const historicalSales =
      customer._sum.netValue ?? 0;

    if (historicalSales < 2500) {
      continue;
    }

    const lastInvoiceDate =
      customer._max.invoiceDate;

    if (!lastInvoiceDate) {
      continue;
    }

    dormantSignals.push({
      id: `dormant-${accountCode}`,
      type: "DORMANT_CUSTOMER",
      severity:
        historicalSales >= 10000
          ? "HIGH"
          : "MEDIUM",
      title:
        `${
          customer.customerName?.trim() ||
          accountCode
        } is dormant`,
      description:
        `No invoice activity has been recorded ` +
        `for this customer during the last ` +
        `180 days. Historical net sales total ` +
        `${formatCurrency(
          historicalSales
        )}. Last invoice: ` +
        `${formatDate(lastInvoiceDate)}.`,
      customerAccountCode: accountCode,
      customerName:
        customer.customerName?.trim() ||
        accountCode,
      previousValue: historicalSales,
      valueChange: -historicalSales,
      lastInvoiceDate,
    });
  }

  /*
   * Rank each category by financial impact.
   */

  declineSignals.sort(sortByValueImpact);
  stoppedSignals.sort(sortByValueImpact);
  creditSignals.sort(sortByValueImpact);
  growthSignals.sort(sortByValueImpact);

  dormantSignals.sort(
    (a, b) =>
      (b.previousValue ?? 0) -
      (a.previousValue ?? 0)
  );

  /*
   * Balanced dashboard.
   *
   * We deliberately avoid filling all eight
   * positions with one type of signal.
   */

  const selected: CommercialIntelligenceSignal[] =
    [];

  selected.push(
    ...creditSignals.slice(0, 1)
  );

  selected.push(
    ...declineSignals.slice(0, 3)
  );

  selected.push(
    ...stoppedSignals.slice(0, 2)
  );

  selected.push(
    ...growthSignals.slice(0, 2)
  );

  /*
   * Fill unused slots with dormant customers,
   * then the strongest remaining signals.
   */

  const selectedIds = new Set(
    selected.map((signal) => signal.id)
  );

  const remaining = [
    ...dormantSignals,
    ...creditSignals,
    ...declineSignals,
    ...stoppedSignals,
    ...growthSignals,
  ].filter(
    (signal) =>
      !selectedIds.has(signal.id)
  );

  for (const signal of remaining) {
    if (selected.length >= 8) {
      break;
    }

    selected.push(signal);
    selectedIds.add(signal.id);
  }

  return selected.slice(0, 8);
}