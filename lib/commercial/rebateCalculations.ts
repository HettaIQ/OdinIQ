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

  /*
   * Detailed rebate schemes take
   * priority over the simple agreement
   * rebatePercent field.
   */
  const schemes =
    agreement.rebates ?? [];

  const applicableSchemes =
    schemes.filter((scheme) =>
      fallsWithinThreshold({
        sales: netSales,
        thresholdFrom:
          scheme.thresholdFrom,
        thresholdTo:
          scheme.thresholdTo,
      })
    );

  if (
    applicableSchemes.length > 0
  ) {
    /*
     * For now we choose the highest
     * applicable percentage.
     *
     * This supports schemes such as:
     *
     * £0-£100k       5%
     * £100k-£250k    7%
     * £250k+         10%
     *
     * without adding multiple tiers
     * together.
     */
    const bestScheme =
      [...applicableSchemes].sort(
        (a, b) =>
          Number(
            b.rebatePercent ?? 0
          ) -
          Number(
            a.rebatePercent ?? 0
          )
      )[0];

    const rebatePercent =
      Math.max(
        0,
        Number(
          bestScheme.rebatePercent ??
            0
        )
      );

    return {
      rebatePercent,

      rebateValue:
        netSales *
        (rebatePercent / 100),

      source: "REBATE_SCHEME" as const,

      rebateType:
        normalizeRebateType(
          bestScheme.rebateType
        ),
    };
  }

  const rebatePercent =
    Math.max(
      0,
      Number(
        agreement.rebatePercent ??
          0
      )
    );

  return {
    rebatePercent,

    rebateValue:
      netSales *
      (rebatePercent / 100),

    source:
      rebatePercent > 0
        ? ("AGREEMENT" as const)
        : ("NONE" as const),
  };
}