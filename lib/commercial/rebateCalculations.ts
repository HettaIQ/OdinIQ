export type RebateSchemeEntry = {
  rebateType: string | null;
  rebatePercent: number | null;
  thresholdFrom: number | null;
  thresholdTo: number | null;
};

export type RebateAgreement = {
  rebatePercent: number | null;
  rebates: RebateSchemeEntry[];
};

function normalizeRebateType(
  value: string | null | undefined
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function fallsWithinThreshold({
  sales,
  thresholdFrom,
  thresholdTo,
}: {
  sales: number;
  thresholdFrom: number | null;
  thresholdTo: number | null;
}) {
  const from =
    thresholdFrom == null
      ? null
      : Number(thresholdFrom);

  const to =
    thresholdTo == null
      ? null
      : Number(thresholdTo);

  if (
    from != null &&
    sales < from
  ) {
    return false;
  }

  if (
    to != null &&
    sales > to
  ) {
    return false;
  }

  return true;
}

export function calculateAgreementRebate({
  netSales,
  agreement,
}: {
  netSales: number;
  agreement: RebateAgreement;
}) {
  if (netSales <= 0) {
    return {
      rebatePercent: 0,
      rebateValue: 0,
      source: "NONE" as const,
    };
  }

  const schemes = agreement.rebates ?? [];

  const applicableSchemes = schemes.filter((scheme) =>
    fallsWithinThreshold({
      sales: netSales,
      thresholdFrom: scheme.thresholdFrom,
      thresholdTo: scheme.thresholdTo,
    })
  );

  if (applicableSchemes.length > 0) {
    // Different rebate types are additional.
    // Within each type, only the highest applicable tier wins.
    const highestByType = new Map<string, number>();

    for (const scheme of applicableSchemes) {
      const type =
        normalizeRebateType(scheme.rebateType) ||
        "STANDARD";

      const percent = Math.max(
        0,
        Number(scheme.rebatePercent ?? 0)
      );

      highestByType.set(
        type,
        Math.max(highestByType.get(type) ?? 0, percent)
      );
    }

    const rebatePercent = Array.from(
      highestByType.values()
    ).reduce((total, percent) => total + percent, 0);

    return {
      rebatePercent,
      rebateValue: netSales * (rebatePercent / 100),
      source: "REBATE_SCHEME" as const,
      rebateType:
        highestByType.size === 1
          ? Array.from(highestByType.keys())[0]
          : "COMBINED",
    };
  }

  const rebatePercent = Math.max(
    0,
    Number(agreement.rebatePercent ?? 0)
  );

  return {
    rebatePercent,
    rebateValue: netSales * (rebatePercent / 100),
    source:
      rebatePercent > 0
        ? ("AGREEMENT" as const)
        : ("NONE" as const),
  };
}

 