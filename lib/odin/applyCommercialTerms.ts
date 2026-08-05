import { prisma } from "@/lib/prisma";

type ApplyCommercialTermsInput = {
  agreementId: number;
  discount: string;
  rebate: string;
  paymentTerms: string;
  renewalDate: string;
  noticePeriod: string;
};

function parsePercentage(value: string): number {
  return Number(value.replace("%", "").trim());
}

function parseUkDate(value: string): Date {
  const [day, month, year] = value.split("/").map(Number);

  if (!day || !month || !year) {
    throw new Error("Invalid renewal date.");
  }

  return new Date(Date.UTC(year, month - 1, day));
}

export async function applyCommercialTerms({
  agreementId,
  discount,
  rebate,
  paymentTerms,
  renewalDate,
  noticePeriod,
}: ApplyCommercialTermsInput) {
  return prisma.commercialAgreement.update({
    where: {
      id: agreementId,
    },
    data: {
      standardDiscount: parsePercentage(discount),
      rebatePercent: parsePercentage(rebate),
      paymentTerms,
      renewalDate: parseUkDate(renewalDate),
      noticePeriod,
    },
  });
}