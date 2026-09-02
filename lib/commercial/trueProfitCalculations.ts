export type CommercialCostEntry = {
  costDate: Date;
  costType: string;
  amount: number;
};

export type CommercialCostSummary = {
  rebate: number;
  agentCommission: number;
  merchandise: number;
  entertainment: number;
  marketing: number;
  carriage: number;
  other: number;
  totalCommercialCosts: number;
};

export function calculateCommercialCosts(
  costs: CommercialCostEntry[]
): CommercialCostSummary {
  let rebate = 0;
  let agentCommission = 0;
  let merchandise = 0;
  let entertainment = 0;
  let marketing = 0;
  let carriage = 0;
  let other = 0;

  for (const cost of costs) {
    const amount = Math.abs(Number(cost.amount ?? 0));

    switch (
      String(cost.costType ?? "")
        .trim()
        .toUpperCase()
    ) {
      case "REBATE":
        rebate += amount;
        break;

      case "AGENT_COMMISSION":
        agentCommission += amount;
        break;

      case "MERCHANDISE":
        merchandise += amount;
        break;

      case "ENTERTAINMENT":
        entertainment += amount;
        break;

      case "MARKETING":
        marketing += amount;
        break;

      case "CARRIAGE":
        carriage += amount;
        break;

      default:
        other += amount;
        break;
    }
  }

  const totalCommercialCosts =
    rebate +
    agentCommission +
    merchandise +
    entertainment +
    marketing +
    carriage +
    other;

  return {
    rebate,
    agentCommission,
    merchandise,
    entertainment,
    marketing,
    carriage,
    other,
    totalCommercialCosts,
  };
}

export function calculateTrueProfit({
  grossProfit,
  commercialCosts,
  netSales,
}: {
  grossProfit: number;
  commercialCosts: number;
  netSales: number;
}) {
  const trueProfit =
    grossProfit - commercialCosts;

  const trueMargin =
    netSales !== 0
      ? (trueProfit / netSales) * 100
      : 0;

  return {
    grossProfit,
    commercialCosts,
    trueProfit,
    trueMargin,
  };
}