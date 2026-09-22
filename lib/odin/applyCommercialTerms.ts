import { prisma } from "@/lib/prisma";

type ApplyCommercialTermsInput = {
  agreementId: number;
  companyId: number;

  discount: string;
  rebate: string;
  paymentTerms: string;
  renewalDate: string;
  noticePeriod: string;

  buyingGroup?: string;
};

function parsePercentage(
  value: string
): number {
  return Number(
    value
      .replace("%", "")
      .trim()
  );
}

function parseUkDate(
  value: string
): Date | null {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return null;
  }

  const [day, month, year] =
    trimmed
      .split("/")
      .map(Number);

  if (
    !day ||
    !month ||
    !year
  ) {
    throw new Error(
      "Invalid renewal date."
    );
  }

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );
}

export async function applyCommercialTerms({
  agreementId,
  companyId,
  discount,
  rebate,
  paymentTerms,
  renewalDate,
  noticePeriod,
  buyingGroup,
}: ApplyCommercialTermsInput) {
  const parsedDiscount =
    parsePercentage(
      discount
    );

  const parsedRebate =
    parsePercentage(
      rebate
    );

  if (
    !Number.isFinite(
      parsedDiscount
    )
  ) {
    throw new Error(
      "Invalid discount percentage."
    );
  }

  if (
    !Number.isFinite(
      parsedRebate
    )
  ) {
    throw new Error(
      "Invalid rebate percentage."
    );
  }

  const agreement =
    await prisma.commercialAgreement.findFirst({
      where: {
        id: agreementId,
        companyId,
      },

      select: {
        id: true,
      },
    });

  if (!agreement) {
    throw new Error(
      "Agreement not found for this company."
    );
  }

  return prisma.commercialAgreement.update({
    where: {
      id: agreement.id,
    },

    data: {
      standardDiscount:
        parsedDiscount,

      rebatePercent:
        parsedRebate,

      paymentTerms:
        paymentTerms.trim() ||
        null,

      renewalDate:
        parseUkDate(
          renewalDate
        ),

      noticePeriod:
        noticePeriod.trim() ||
        null,

      buyingGroup:
        buyingGroup?.trim() ||
        null,
    },
  });
}