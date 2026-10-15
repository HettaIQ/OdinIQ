export type PricingScenario = {
  currentDiscount: number;
  proposedDiscount: number;
  quarterlyRebate: number;
  annualRebate: number;
  marketingContribution: number;
  annualSales: number;
  productCosts: number;
  otherCommercialCosts: number;
};

export function calculatePricingScenario(
  scenario: PricingScenario
) {
  const {
    currentDiscount,
    proposedDiscount,
    quarterlyRebate,
    annualRebate,
    marketingContribution,
    annualSales,
    productCosts,
    otherCommercialCosts,
  } = scenario;

  const currentPriceFactor =
    1 - currentDiscount / 100;

  const proposedPriceFactor =
    1 - proposedDiscount / 100;

  if (currentPriceFactor <= 0) {
    throw new Error(
      "Current discount must be below 100%."
    );
  }

  const proposedSales =
    annualSales *
    (proposedPriceFactor / currentPriceFactor);

  const totalRebateRate =
    (quarterlyRebate +
      annualRebate +
      marketingContribution) / 100;

  const currentRebates =
    annualSales * totalRebateRate;

  const proposedRebates =
    proposedSales * totalRebateRate;

  const currentGrossProfit =
    annualSales - productCosts;

  const proposedGrossProfit =
    proposedSales - productCosts;

  const currentTrueProfit =
    currentGrossProfit -
    currentRebates -
    otherCommercialCosts;

  const proposedTrueProfit =
    proposedGrossProfit -
    proposedRebates -
    otherCommercialCosts;

  const currentMargin =
    annualSales !== 0
      ? (currentTrueProfit / annualSales) * 100
      : 0;

  const proposedMargin =
    proposedSales !== 0
      ? (proposedTrueProfit / proposedSales) * 100
      : 0;

  const profitDifference =
    proposedTrueProfit - currentTrueProfit;

  const proposedContributionRate =
    1 -
    totalRebateRate -
    (productCosts /
      (annualSales || 1)) /
      (proposedPriceFactor / currentPriceFactor);

  const additionalSalesRequired =
    profitDifference < 0 &&
    proposedContributionRate > 0
      ? Math.abs(profitDifference) /
        proposedContributionRate
      : 0;

  return {
    proposedSales,
    currentGrossProfit,
    proposedGrossProfit,
    currentRebates,
    proposedRebates,
    currentTrueProfit,
    proposedTrueProfit,
    currentMargin,
    proposedMargin,
    profitDifference,
    additionalSalesRequired,
  };
}


