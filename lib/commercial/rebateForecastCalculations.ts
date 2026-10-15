
import {
  commercialNetValue,
  type CommercialSalesTransaction,
} from "./salesCalculations";

export type RebateFrequency =
  | "MONTHLY"
  | "QUARTERLY"
  | "ANNUALLY";

export type RebateForecastInput = {
  frequency: RebateFrequency;
  rebatePercent: number;
  actualQualifyingSales: number;
  projectedQualifyingSales: number;
  settledAmount: number;
};

export type RebateForecastResult = {
  accruedRebate: number;
  forecastTotalRebate: number;
  additionalForecastRebate: number;
  outstandingRebate: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateRebateForecast({
  rebatePercent,
  actualQualifyingSales,
  projectedQualifyingSales,
  settledAmount,
}: RebateForecastInput): RebateForecastResult {
  if (
    !Number.isFinite(rebatePercent) ||
    rebatePercent < 0 ||
    rebatePercent > 100
  ) {
    throw new Error("Invalid rebate percentage.");
  }

  if (
    [actualQualifyingSales, projectedQualifyingSales, settledAmount]
      .some(value => !Number.isFinite(value) || value < 0)
  ) {
    throw new Error("Sales and settlement values must be non-negative.");
  }

  if (projectedQualifyingSales < actualQualifyingSales) {
    throw new Error("Projected sales cannot be below actual sales.");
  }

  const accruedRebate = roundMoney(
    actualQualifyingSales * rebatePercent / 100
  );

  const forecastTotalRebate = roundMoney(
    projectedQualifyingSales * rebatePercent / 100
  );

  return {
    accruedRebate,
    forecastTotalRebate,
    additionalForecastRebate: roundMoney(
      forecastTotalRebate - accruedRebate
    ),
    outstandingRebate: roundMoney(
      Math.max(0, accruedRebate - settledAmount)
    ),
  };
}

export type RebateTier = {
  thresholdFrom: number;
  rebatePercent: number;
};

export function calculateRetrospectiveRebate({
  qualifyingSales,
  tiers,
}: {
  qualifyingSales: number;
  tiers: RebateTier[];
}) {
  if (
    !Number.isFinite(qualifyingSales) ||
    qualifyingSales < 0
  ) {
    throw new Error("Invalid qualifying sales.");
  }

  for (const tier of tiers) {
    if (
      !Number.isFinite(tier.thresholdFrom) ||
      tier.thresholdFrom < 0 ||
      !Number.isFinite(tier.rebatePercent) ||
      tier.rebatePercent < 0 ||
      tier.rebatePercent > 100
    ) {
      throw new Error("Invalid rebate tier.");
    }
  }

  const applicableTier = [...tiers]
    .filter(tier => qualifyingSales >= tier.thresholdFrom)
    .sort((a, b) => b.thresholdFrom - a.thresholdFrom)[0];

  const rebatePercent = applicableTier?.rebatePercent ?? 0;

  return {
    rebatePercent,
    rebateValue: roundMoney(
      qualifyingSales * rebatePercent / 100
    ),
    nextThreshold: [...tiers]
      .filter(tier => tier.thresholdFrom > qualifyingSales)
      .sort((a, b) => a.thresholdFrom - b.thresholdFrom)[0]
      ?.thresholdFrom ?? null,
  };
}

export type RebateSalesPeriod = {
  periodStart: Date;
  periodEnd: Date;
  qualifyingSales: number;
  transactionCount: number;
};

export function calculateRebateSalesPeriods<
  T extends CommercialSalesTransaction
>(
  transactions: T[],
  frequency: RebateFrequency,
  year: number
): RebateSalesPeriod[] {
  if (!Number.isInteger(year) || year < 1900) {
    throw new Error("Invalid rebate year.");
  }

  const monthsPerPeriod =
    frequency === "MONTHLY"
      ? 1
      : frequency === "QUARTERLY"
        ? 3
        : frequency === "ANNUALLY"
          ? 12
          : null;

  if (monthsPerPeriod === null) {
    throw new Error("Invalid rebate frequency.");
  }

  const periods: RebateSalesPeriod[] = [];

  for (
    let month = 0;
    month < 12;
    month += monthsPerPeriod
  ) {
    const periodStart = new Date(
      year, month, 1
    );

    const periodEnd = new Date(
      year, month + monthsPerPeriod, 0,
      23, 59, 59, 999
    );

    let qualifyingSales = 0;
    let transactionCount = 0;

    for (const transaction of transactions) {
      if (!transaction.invoiceDate) {
        continue;
      }

      const date = new Date(transaction.invoiceDate);

      if (
        date < periodStart ||
        date > periodEnd
      ) {
        continue;
      }

      const value = commercialNetValue(transaction);

      if (value === 0) {
        continue;
      }

      qualifyingSales += value;
      transactionCount++;
    }

    periods.push({
      periodStart,
      periodEnd,
      qualifyingSales:
        Math.round(qualifyingSales * 100) / 100,
      transactionCount,
    });
  }

  return periods;
}
