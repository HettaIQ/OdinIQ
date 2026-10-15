
import { prisma } from "@/lib/prisma";

import {
  getCustomerRebateSales,
} from "@/lib/commercial/customerRebateForecast";

import {
  calculateRebateForecast,
  calculateRetrospectiveRebate,
} from "@/lib/commercial/rebateForecastCalculations";

type Input = {
  companyId: number;
  agreementId: number;
  businessUnitId: number;
  year: number;
};

export async function getAgreementRebateForecast({
  companyId,
  agreementId,
  businessUnitId,
  year,
}: Input) {
  const agreement = await prisma.commercialAgreement.findFirst({
    where: {
      id: agreementId,
      companyId,
    },
    include: {
      rebates: {
        where: { isActive: true },
      },
    },
  });

  if (!agreement || !agreement.customerId) {
    throw new Error("Agreement or linked customer not found.");
  }

  const schemes = agreement.rebates.filter((scheme) => {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    return (
      (!scheme.effectiveFrom ||
        scheme.effectiveFrom < yearEnd) &&
      (!scheme.effectiveTo ||
        scheme.effectiveTo >= yearStart)
    );
  });

  for (const scheme of schemes) {
    if (
      scheme.calculationBasis !== "NET_EX_VAT" ||
      scheme.rebatePercent == null ||
      !Number.isFinite(scheme.rebatePercent) ||
      scheme.rebatePercent < 0 ||
      scheme.rebatePercent > 100
    ) {
      throw new Error(
        `Unsupported or incomplete rebate scheme: ${scheme.name}`
      );
    }
  }

  const quarterlySchemes = schemes.filter(
    (scheme) =>
      scheme.calculationFrequency === "QUARTERLY" &&
      !scheme.retrospective
  );

  const annualSchemes = schemes.filter(
    (scheme) =>
      scheme.rebateType === "ANNUAL_RETROSPECTIVE" &&
      scheme.calculationFrequency === "ANNUALLY" &&
      scheme.retrospective &&
      scheme.tierMethod === "HIGHEST_APPLICABLE"
  );

  const unsupported = schemes.filter(
    (scheme) =>
      !quarterlySchemes.includes(scheme) &&
      !annualSchemes.includes(scheme)
  );

  if (unsupported.length) {
    throw new Error(
      "Unsupported rebate schemes: " +
        unsupported.map((s) => s.name).join(", ")
    );
  }

  const sales = await getCustomerRebateSales({
    companyId,
    customerId: agreement.customerId,
    businessUnitId,
    year,
    frequency: "QUARTERLY",
  });

  const quarterly = quarterlySchemes.map((scheme) => {
    const periods = sales.periods.map((period, index) => {
      const calculation = calculateRebateForecast({
  frequency: "QUARTERLY",
  rebatePercent: scheme.rebatePercent!,
        actualQualifyingSales: Math.max(
          0,
          period.qualifyingSales
        ),
        projectedQualifyingSales: Math.max(
          0,
          period.qualifyingSales
        ),
        settledAmount: 0,
      });

      return {
        quarter: index + 1,
        netSales: period.qualifyingSales,
        rebate: calculation.accruedRebate,
      };
    });

    const total = Math.round(
      periods.reduce((sum, period) => sum + period.rebate, 0) *
        100
    ) / 100;

    return {
      schemeId: scheme.id,
      schemeName: scheme.name,
      rebatePercent: scheme.rebatePercent,
      periods,
      total,
    };
  });

  const annual =
    annualSchemes.length > 0
      ? calculateRetrospectiveRebate({
          qualifyingSales: Math.max(0, sales.totalNetSales),
          tiers: annualSchemes.map((scheme) => ({
            thresholdFrom: scheme.thresholdFrom ?? 0,
            rebatePercent: scheme.rebatePercent!,
          })),
        })
      : null;

  const quarterlyTotal = Math.round(
    quarterly.reduce((sum, scheme) => sum + scheme.total, 0) *
      100
  ) / 100;

  const annualTotal = annual?.rebateValue ?? 0;

  return {
    agreementId: agreement.id,
    agreementName: agreement.agreementName,
    customerId: sales.customerId,
    customerName: sales.customerName,
    year,
    businessUnitId,
    totalNetSales: sales.totalNetSales,
    quarterly,
    annual,
    quarterlyTotal,
    annualTotal,
    combinedTotal:
      Math.round((quarterlyTotal + annualTotal) * 100) / 100,
  };
}
