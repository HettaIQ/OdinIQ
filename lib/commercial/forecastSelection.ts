
export type ForecastSelectionInput = {
  actualSales: number;
  automaticForecast: number;
  manualForecast: number | null;
};

export function selectSalesForecast({
  actualSales,
  automaticForecast,
  manualForecast,
}: ForecastSelectionInput) {
  if (
    !Number.isFinite(actualSales) ||
    !Number.isFinite(automaticForecast) ||
    actualSales < 0 ||
    automaticForecast < actualSales
  ) {
    throw new Error("Invalid sales forecast values.");
  }

  if (
    manualForecast !== null &&
    (
      !Number.isFinite(manualForecast) ||
      manualForecast < actualSales
    )
  ) {
    throw new Error(
      "Manual forecast cannot be lower than actual sales."
    );
  }

  return {
    selectedForecast: manualForecast ?? automaticForecast,
    forecastMethod:
      manualForecast === null
        ? ("AUTOMATIC" as const)
        : ("MANUAL" as const),
  };
}
 