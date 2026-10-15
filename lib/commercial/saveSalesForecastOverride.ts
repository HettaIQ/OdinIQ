
import { prisma } from "@/lib/prisma";

import {
  requireForecastPermission,
} from "@/lib/commercial/forecastPermissions";

import {
  getCustomerRebateSales,
} from "@/lib/commercial/customerRebateForecast";

type Input = {
  companyId: number;
  customerId: number;
  businessUnitId: number;
  year: number;
  projectedAnnualSales: number;
  reason: string;
  userId: number;
};

export async function saveSalesForecastOverride({
  companyId,
  customerId,
  businessUnitId,
  year,
  projectedAnnualSales,
  reason,
  userId,
}: Input) {
  await requireForecastPermission({
    companyId,
    userId,
    permission: "commercial.forecast.manage",
  });

  if (
    !Number.isSafeInteger(customerId) ||
    customerId <= 0 ||
    !Number.isSafeInteger(businessUnitId) ||
    businessUnitId <= 0 ||
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 9998 ||
    !Number.isFinite(projectedAnnualSales) ||
    projectedAnnualSales < 0
  ) {
    throw new Error("Invalid manual forecast.");
  }

  const cleanReason = reason.trim();

  if (cleanReason.length < 10 || cleanReason.length > 1000) {
    throw new Error(
      "A reason between 10 and 1000 characters is required."
    );
  }

  const businessUnit = await prisma.businessUnit.findFirst({
    where: {
      id: businessUnitId,
      companyId,
    },
    select: {
      id: true,
    },
  });

  if (!businessUnit) {
    throw new Error("Business unit not found.");
  }

  const sales = await getCustomerRebateSales({
    companyId,
    customerId,
    businessUnitId,
    year,
    frequency: "ANNUALLY",
  });

  if (projectedAnnualSales < sales.totalNetSales) {
    throw new Error(
      "Manual forecast cannot be lower than actual annual sales."
    );
  }

  const parentCustomerId = sales.customerId;

  return prisma.$transaction(async (tx) => {
    await tx.salesForecastOverride.updateMany({
  where: {
    companyId,
    customerId: parentCustomerId,
    businessUnitId,
    forecastYear: year,
    isActive: true,
  },
  data: {
    isActive: false,
    deactivatedByUserId: userId,
    deactivatedAt: new Date(),
    deactivationReason:
      "Replaced by a new management forecast.",
  },
});

    return tx.salesForecastOverride.create({
      data: {
        companyId,
        customerId: parentCustomerId,
        businessUnitId,
        forecastYear: year,
        projectedAnnualSales,
        reason: cleanReason,
        createdByUserId: userId,
        isActive: true,
      },
    });
  });
}
