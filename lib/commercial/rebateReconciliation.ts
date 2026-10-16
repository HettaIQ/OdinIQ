export type RebateCostRecord = {
  costDate: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
  costType: string;
  amount: number;
};

export function rebateBelongsToYear(
  cost: RebateCostRecord,
  year: number
): boolean {
  if (cost.costType.trim().toUpperCase() !== "REBATE") {
    return false;
  }

  // Do not allocate rebates using invoice date alone.
  if (!cost.periodStart || !cost.periodEnd) {
    return false;
  }

  if (cost.periodEnd < cost.periodStart) {
    return false;
  }

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const nextYearStart = new Date(Date.UTC(year + 1, 0, 1));

  return (
    cost.periodStart >= yearStart &&
    cost.periodEnd < nextYearStart
  );
}