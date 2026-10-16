import { commercialNetValue } from "./salesCalculations";

export type PeriodRebateScheme = {
  rebateType: string | null;
  rebatePercent: number | null;
  thresholdFrom: number | null;
  thresholdTo: number | null;
  calculationFrequency: string | null;
  tierMethod: string | null;
  isActive: boolean;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
};

export type RebateTransaction = {
  invoiceDate: Date | null;
  invoiceType: string | null;
  customerOrderNumber: string | null;
  netValue: number | null;
};

export type RebatePeriodResult = {
  period: string;
  netSales: number;
  rebatePercent: number;
  rebateValue: number;
};

export function getCalendarQuarter(date: Date): number {
  return Math.floor(date.getUTCMonth() / 3) + 1;
}

export function calculateQuarterlyRebates({
  transactions,
  schemes,
  year,
}: {
  transactions: RebateTransaction[];
  schemes: PeriodRebateScheme[];
  year: number;
}): RebatePeriodResult[] {
  const results: RebatePeriodResult[] = [];

  for (let quarter = 1; quarter <= 4; quarter++) {
    const quarterTransactions = transactions.filter(
      (transaction) =>
        transaction.invoiceDate &&
        transaction.invoiceDate.getUTCFullYear() === year &&
        getCalendarQuarter(transaction.invoiceDate) === quarter
    );

    const netSales = quarterTransactions.reduce(
  (total, transaction) =>
    total + commercialNetValue(transaction),
  0
);

        const quarterStart = new Date(
      Date.UTC(year, (quarter - 1) * 3, 1)
    );

    const quarterEnd = new Date(
      Date.UTC(year, quarter * 3, 0, 23, 59, 59)
    );

    const applicableSchemes = schemes.filter(
      (scheme) =>
        scheme.isActive &&
        scheme.calculationFrequency?.toUpperCase() === "QUARTERLY" &&
        (!scheme.effectiveFrom ||
          scheme.effectiveFrom <= quarterEnd) &&
        (!scheme.effectiveTo ||
          scheme.effectiveTo >= quarterStart)
    );

    const rebatePercent = applicableSchemes.reduce(
      (highest, scheme) =>
        Math.max(
          highest,
          Number(scheme.rebatePercent ?? 0)
        ),
      0
    );

    results.push({
      period: `${year}-Q${quarter}`,
      netSales,
      rebatePercent,
      rebateValue: netSales * (rebatePercent / 100),
    });
  }

  return results;
}
export function calculateAnnualRetrospectiveRebate({
  quarterlyResults,
  schemes,
  year,
}: {
  quarterlyResults: RebatePeriodResult[];
  schemes: PeriodRebateScheme[];
  year: number;
}): RebatePeriodResult {
  const annualSales = quarterlyResults
    .filter((result) => result.period.startsWith(`${year}-Q`))
    .reduce((total, result) => total + result.netSales, 0);

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1) - 1);

  const applicableSchemes = schemes.filter((scheme) => {
    if (!scheme.isActive) return false;
    if (scheme.calculationFrequency?.toUpperCase() !== "ANNUALLY") {
      return false;
    }
    if (scheme.rebateType?.toUpperCase() !== "ANNUAL_RETROSPECTIVE") {
      return false;
    }
    if (scheme.effectiveFrom && scheme.effectiveFrom > yearEnd) {
      return false;
    }
    if (scheme.effectiveTo && scheme.effectiveTo < yearStart) {
      return false;
    }

    const from = scheme.thresholdFrom ?? 0;
    const to = scheme.thresholdTo ?? Infinity;

    return annualSales >= from && annualSales <= to;
  });

  const rebatePercent = applicableSchemes.reduce(
    (highest, scheme) =>
      Math.max(highest, Number(scheme.rebatePercent ?? 0)),
    0
  );

  return {
    period: `${year}-ANNUAL`,
    netSales: annualSales,
    rebatePercent,
    rebateValue: annualSales * (rebatePercent / 100),
  };
}