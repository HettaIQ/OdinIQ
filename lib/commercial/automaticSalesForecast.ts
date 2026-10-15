
export type AutomaticSalesForecastInput = {
  actualSales: number;
  year: number;
  asOfDate: Date;
};

export type AutomaticSalesForecastResult = {
  actualSales: number;
  projectedAnnualSales: number;
  projectedRemainingSales: number;
  elapsedDays: number;
  totalDays: number;
  progressPercent: number;
  method: "YTD_RUN_RATE";
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateAutomaticSalesForecast({
  actualSales,
  year,
  asOfDate,
}: AutomaticSalesForecastInput): AutomaticSalesForecastResult {
  if (
    !Number.isFinite(actualSales) ||
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 9998 ||
    !(asOfDate instanceof Date) ||
    !Number.isFinite(asOfDate.getTime())
  ) {
    throw new Error("Invalid automatic sales forecast input.");
  }

  const yearStart = Date.UTC(year, 0, 1);
  const nextYearStart = Date.UTC(year + 1, 0, 1);

  const asOfDay = Date.UTC(
    asOfDate.getFullYear(),
    asOfDate.getMonth(),
    asOfDate.getDate()
  );

  const millisecondsPerDay = 86400000;

  const totalDays =
    (nextYearStart - yearStart) / millisecondsPerDay;

  const elapsedDays = Math.max(
    0,
    Math.min(
      totalDays,
      (asOfDay - yearStart) / millisecondsPerDay + 1
    )
  );

  if (elapsedDays === 0) {
    return {
      actualSales,
      projectedAnnualSales: 0,
      projectedRemainingSales: 0,
      elapsedDays,
      totalDays,
      progressPercent: 0,
      method: "YTD_RUN_RATE",
    };
  }

  const projectedAnnualSales =
    elapsedDays >= totalDays
      ? actualSales
      : roundMoney((actualSales / elapsedDays) * totalDays);

  return {
    actualSales,
    projectedAnnualSales,
    projectedRemainingSales: roundMoney(
      projectedAnnualSales - actualSales
    ),
    elapsedDays,
    totalDays,
    progressPercent: Math.round(
      (elapsedDays / totalDays) * 10000
    ) / 100,
    method: "YTD_RUN_RATE",
  };
}
