
import { prisma } from "@/lib/prisma";
import { requireForecastPermission } from "@/lib/commercial/forecastPermissions";
import { getCustomerRebateSales } from "@/lib/commercial/customerRebateForecast";

type Input = {
  companyId: number;
  customerId: number;
  businessUnitId: number;
  year: number;
  reason: string;
  userId: number;
};

export async function restoreAutomaticSalesForecast({
  companyId,
  customerId,
  businessUnitId,
  year,
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
    year > 9998
  ) {
    throw new Error("Invalid forecast details.");
  }

  if (typeof reason !== "string") {
    throw new Error("A reason is required.");
  }

  const cleanReason = reason.trim();

  if (
    cleanReason.length < 10 ||
    cleanReason.length > 1000
  ) {
    throw new Error(
      "A reason between 10 and 1000 characters is required."
    );
  }

  const businessUnit =
    await prisma.businessUnit.findFirst({
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

  // Resolve linked customer accounts to the
  // same parent used by the forecast engine.
  const sales = await getCustomerRebateSales({
    companyId,
    customerId,
    businessUnitId,
    year,
    frequency: "ANNUALLY",
  });

  const result =
    await prisma.salesForecastOverride.updateMany({
      where: {
        companyId,
        customerId: sales.customerId,
        businessUnitId,
        forecastYear: year,
        isActive: true,
      },
      data: {
        isActive: false,
        deactivatedByUserId: userId,
        deactivatedAt: new Date(),
        deactivationReason: cleanReason,
      },
    });

  return {
    restored: result.count > 0,
    deactivatedCount: result.count,
    customerId: sales.customerId,
    businessUnitId,
    year,
  };
}
