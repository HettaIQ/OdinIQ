import {
  calculateAgreementRebate,
  type RebateAgreement,
} from "@/lib/commercial/rebateCalculations";

export type CustomerRebateResult = {
  rebatePercent: number;
  rebateValue: number;
  source:
    | "NONE"
    | "CUSTOMER_AGREEMENT"
    | "BUYING_GROUP_AGREEMENT";
  agreementName: string | null;
  qualifyingSales: number;
};

type AgreementForCustomerRebate = RebateAgreement & {
  agreementName: string;
};

export function calculateCustomerRebate({
  customerNetSales,
  qualifyingSales,
  agreement,
  source,
}: {
  customerNetSales: number;
  qualifyingSales: number;
  agreement:
    | AgreementForCustomerRebate
    | null;
  source:
    | "CUSTOMER_AGREEMENT"
    | "BUYING_GROUP_AGREEMENT";
}): CustomerRebateResult {
  if (
    !agreement ||
    customerNetSales <= 0 ||
    qualifyingSales <= 0
  ) {
    return {
      rebatePercent: 0,
      rebateValue: 0,
      source: "NONE",
      agreementName: null,
      qualifyingSales: 0,
    };
  }

  /*
   * Threshold qualification may be based
   * on the whole buying group's sales,
   * while the monetary rebate attributed
   * to this customer is based only on the
   * customer's own sales.
   */
  const qualifyingResult =
    calculateAgreementRebate({
      netSales: qualifyingSales,
      agreement,
    });

  const rebatePercent =
    qualifyingResult.rebatePercent;

  const rebateValue =
    customerNetSales *
    (rebatePercent / 100);

  return {
    rebatePercent,
    rebateValue,
    source:
      rebatePercent > 0
        ? source
        : "NONE",
    agreementName:
      rebatePercent > 0
        ? agreement.agreementName
        : null,
    qualifyingSales,
  };
}