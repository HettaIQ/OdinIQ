type ProductCostHistoryEntry = {
  costPrice: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
};

export type ProfitabilityProduct = {
  productCode: string;
  costPrice: number | null;
  costHistory?: ProductCostHistoryEntry[];
};

export type ProfitabilityGdnLine = {
  stockCode: string | null;
  partNumber?: string | null;
  quantityDespatched: number | null;
};

export type ProfitabilityCreditLine = {
  stockCode: string | null;
  quantity: number | null;
};

function normalizeStockCode(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function isRealStockCode(value: string | null | undefined) {
  const code = normalizeStockCode(value);

  if (!code) {
    return false;
  }

  const nonStockCodes = new Set([
    "M",
    "LAYOUT",
    "PLTDELIVERY",
    "STDELIVERY",
  ]);

  if (nonStockCodes.has(code)) {
    return false;
  }

  return true;
}

export function findApplicableProductCost(
  product: ProfitabilityProduct | undefined,
  transactionDate: Date | null | undefined
) {
  if (!product) {
    return null;
  }

  const history = [...(product.costHistory ?? [])].sort(
    (a, b) =>
      b.effectiveFrom.getTime() -
      a.effectiveFrom.getTime()
  );

  if (transactionDate && history.length > 0) {
    const timestamp = transactionDate.getTime();

    const historicalCost = history.find((entry) => {
      const startsBeforeTransaction =
        entry.effectiveFrom.getTime() <= timestamp;

      const hasNotEnded =
        !entry.effectiveTo ||
        entry.effectiveTo.getTime() >= timestamp;

      return startsBeforeTransaction && hasNotEnded;
    });

    if (historicalCost) {
      return Number(historicalCost.costPrice);
    }
  }

  if (product.costPrice == null) {
    return null;
  }

  return Number(product.costPrice);
}

export function buildProductCostMap(
  products: ProfitabilityProduct[]
) {
  const map = new Map<string, ProfitabilityProduct>();

  for (const product of products) {
    const code = normalizeStockCode(product.productCode);

    if (!code) {
      continue;
    }

    map.set(code, product);
  }

  return map;
}

export function calculateDespatchCogs({
  lines,
  transactionDate,
  productMap,
}: {
  lines: ProfitabilityGdnLine[];
  transactionDate: Date | null | undefined;
  productMap: Map<string, ProfitabilityProduct>;
}) {
  let cogs = 0;
  let costedLines = 0;
  let uncostedLines = 0;

  const missingStockCodes = new Set<string>();

  for (const line of lines) {
    const stockCode =
      normalizeStockCode(line.stockCode) ||
      normalizeStockCode(line.partNumber);

    if (!isRealStockCode(stockCode)) {
      continue;
    }

    const quantity = Math.abs(
      Number(line.quantityDespatched ?? 0)
    );

    if (quantity === 0) {
      continue;
    }

    const product = productMap.get(stockCode);

    const unitCost = findApplicableProductCost(
      product,
      transactionDate
    );

    if (unitCost == null) {
      uncostedLines += 1;
      missingStockCodes.add(stockCode);
      continue;
    }

    cogs += quantity * unitCost;
    costedLines += 1;
  }

  return {
    cogs,
    costedLines,
    uncostedLines,
    missingStockCodes: [...missingStockCodes],
  };
}

export function calculateCreditCogsAdjustment({
  lines,
  transactionDate,
  productMap,
}: {
  lines: ProfitabilityCreditLine[];
  transactionDate: Date | null | undefined;
  productMap: Map<string, ProfitabilityProduct>;
}) {
  let cogsAdjustment = 0;
  let costedLines = 0;
  let uncostedLines = 0;

  const missingStockCodes = new Set<string>();

  for (const line of lines) {
    const stockCode = normalizeStockCode(line.stockCode);

    if (!isRealStockCode(stockCode)) {
      continue;
    }

    const quantity = Number(line.quantity ?? 0);

    // A credit with no product quantity is treated as
    // a financial credit only and does not alter COGS.
    if (quantity === 0) {
      continue;
    }

    const product = productMap.get(stockCode);

    const unitCost = findApplicableProductCost(
      product,
      transactionDate
    );

    if (unitCost == null) {
      uncostedLines += 1;
      missingStockCodes.add(stockCode);
      continue;
    }

    /*
      Sage credit quantities are normally negative.

      Example:
      quantity -4 × £20 cost = £80 of stock cost reversed.

      We return a NEGATIVE COGS adjustment so this can be
      added to normal despatch COGS.
    */
    cogsAdjustment -= Math.abs(quantity) * unitCost;
    costedLines += 1;
  }

  return {
    cogsAdjustment,
    costedLines,
    uncostedLines,
    missingStockCodes: [...missingStockCodes],
  };
}

export function calculateGrossProfit({
  netSales,
  cogs,
}: {
  netSales: number;
  cogs: number;
}) {
  const grossProfit = netSales - cogs;

  const grossMargin =
    netSales !== 0
      ? (grossProfit / netSales) * 100
      : 0;

  return {
    netSales,
    cogs,
    grossProfit,
    grossMargin,
  };
}