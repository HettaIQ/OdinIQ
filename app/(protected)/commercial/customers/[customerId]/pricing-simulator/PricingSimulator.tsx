"use client";

import { useState } from "react";
import { calculatePricingScenario } from "./calculations";

type Props = {
  customerName: string;
  actualAnnualSales?: number;
  actualProductCosts?: number;
};
export default function PricingSimulator({
  customerName,
  actualAnnualSales = 320000,
  actualProductCosts,
}: Props) {
  const [currentDiscount, setCurrentDiscount] = useState(50);
  const [proposedDiscount, setProposedDiscount] = useState(52.5);
  const [quarterlyRebate, setQuarterlyRebate] = useState(16);
  const [annualRebate, setAnnualRebate] = useState(2);
  const [marketingContribution, setMarketingContribution] = useState(2);
  const [annualSales, setAnnualSales] = useState(
  Math.round(actualAnnualSales * 100) / 100
);
  const [productCosts, setProductCosts] = useState(
  actualProductCosts ?? 200000
);
  const [otherCommercialCosts, setOtherCommercialCosts] = useState(3000);

  const result = calculatePricingScenario({
    currentDiscount,
    proposedDiscount,
    quarterlyRebate,
    annualRebate,
    marketingContribution,
    annualSales,
    productCosts,
    otherCommercialCosts,
  });

  const money = (value: number) =>
    value.toLocaleString("en-GB", {
      style: "currency",
      currency: "GBP",
    });

  const numberField = (
    label: string,
    value: number,
    onChange: (value: number) => void,
    step = 0.5
  ) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(event) =>
          onChange(Number(event.target.value))
        }
        className="rounded-lg border p-2 text-black"
      />
    </label>
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">
          Pricing Simulator
        </h1>
        <p className="text-sm opacity-70">
          {customerName} — Commercial Pricing Analysis
        </p>
      </div>

      <div className="grid gap-4 rounded-xl border p-5 md:grid-cols-3">
        {numberField(
          "Current list discount (%)",
          currentDiscount,
          setCurrentDiscount
        )}
        {numberField(
          "Proposed list discount (%)",
          proposedDiscount,
          setProposedDiscount
        )}
        {numberField(
          "Quarterly rebate (%)",
          quarterlyRebate,
          setQuarterlyRebate
        )}
        {numberField(
          "Annual rebate (%)",
          annualRebate,
          setAnnualRebate
        )}
        {numberField(
          "Marketing contribution (%)",
          marketingContribution,
          setMarketingContribution
        )}
        {numberField(
          "2026 YTD sales (£)",
          annualSales,
          setAnnualSales,
          1000
        )}
        {numberField(
          "Product costs (£)",
          productCosts,
          setProductCosts,
          1000
        )}
        {numberField(
          "Other commercial costs (£)",
          otherCommercialCosts,
          setOtherCommercialCosts,
          100
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-5">
          <p className="text-sm opacity-70">
            Current profit
          </p>
          <p className="text-2xl font-bold">
            {money(result.currentTrueProfit)}
          </p>
          <p className="text-sm">
            Margin: {result.currentMargin.toFixed(2)}%
          </p>
        </div>

        <div className="rounded-xl border p-5">
          <p className="text-sm opacity-70">
            Proposed profit
          </p>
          <p className="text-2xl font-bold">
            {money(result.proposedTrueProfit)}
          </p>
          <p className="text-sm">
            Margin: {result.proposedMargin.toFixed(2)}%
          </p>
        </div>

        <div className="rounded-xl border p-5">
          <p className="text-sm opacity-70">
            Profit difference
          </p>
          <p className="text-2xl font-bold">
            {money(result.profitDifference)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border p-5">
        <h2 className="text-lg font-semibold">
          Break-even analysis
        </h2>
        <p className="mt-2">
          Additional turnover required to recover lost profit:
        </p>
        <p className="text-2xl font-bold">
          {money(result.additionalSalesRequired)}
        </p>
      </div>

      <p className="text-xs opacity-60">
        Illustrative scenario only. Annual rebates are
        modelled as flat percentages; tiered thresholds,
        eligible sales and actual customer costs are not
        yet connected.
      </p>
    </div>
  );
}
