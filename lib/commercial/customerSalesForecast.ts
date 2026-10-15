
import { prisma } from "@/lib/prisma";

import {
  calculateAutomaticSalesForecast,
} from "@/lib/commercial/automaticSalesForecast";

import {
  getCustomerRebateSales,
} from "@/lib/commercial/customerRebateForecast";

import {
  selectSalesForecast,
} from "@/lib/commercial/forecastSelection";

type Input = {
  companyId: number;
  customerId: number;
  businessUnitId: number;
  year: number;
  asOfDate: Date;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function getCustomerSalesForecast({
  companyId,
  customerId,
  businessUnitId,
  year,
  asOfDate,
}: Input) {
  if (
    !(asOfDate instanceof Date) ||
    !Number.isFinite(asOfDate.getTime())
  ) {
    throw new Error("Invalid forecast date.");
  }

  const sales = await getCustomerRebateSales({
  companyId,
  customerId,
  businessUnitId,
  year,
  frequency: "QUARTERLY",
  asOfDate,
});

  const parentCustomerId = sales.customerId;

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      companyId,
    },
    select: {
      id: true,
      parentCustomerId: true,
    },
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const override = await prisma.salesForecastOverride.findFirst({
    where: {
      companyId,
      customerId: parentCustomerId,
      businessUnitId,
      forecastYear: year,
      isActive: true,
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
  });

  const automatic = calculateAutomaticSalesForecast({
    actualSales: sales.totalNetSales,
    year,
    asOfDate,
  });

  if (
    override &&
    (
      !Number.isFinite(override.projectedAnnualSales) ||
      override.projectedAnnualSales < 0
    )
  ) {
    throw new Error("Invalid manual forecast override.");
  }

  const manualForecast =
    override?.projectedAnnualSales ?? null;

  const selection = selectSalesForecast({
  actualSales: sales.totalNetSales,
  automaticForecast: automatic.projectedAnnualSales,
  manualForecast,
});

const selectedForecast = selection.selectedForecast;

  return {
    companyId,
    customerId: parentCustomerId,
    customerName: sales.customerName,
    businessUnitId,
    year,
    asOfDate,
    actualSales: sales.totalNetSales,
    automaticForecast: automatic.projectedAnnualSales,
    manualForecast,
    selectedForecast: roundMoney(selectedForecast),
    projectedRemainingSales: roundMoney(
      selectedForecast - sales.totalNetSales
    ),
      forecastMethod: selection.forecastMethod,
    overrideId: override?.id ?? null,
    overrideReason: override?.reason ?? null,
    elapsedDays: automatic.elapsedDays,
    totalDays: automatic.totalDays,
  };
}
