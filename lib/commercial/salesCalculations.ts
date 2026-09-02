export type CommercialSalesTransaction = {
  invoiceType: string | null;
  customerOrderNumber: string | null;
  netValue: number | null;
  invoiceDate?: Date | null;
};

export function normalizeInvoiceType(
  value: string | null | undefined
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export function isCreditNote(
  transaction: Pick<CommercialSalesTransaction, "invoiceType">
) {
  const type = normalizeInvoiceType(transaction.invoiceType);

  return (
    type === "CRD" ||
    type === "CREDIT" ||
    type.includes("CREDIT NOTE")
  );
}

export function isCancelledTransaction(
  transaction: Pick<
    CommercialSalesTransaction,
    "customerOrderNumber"
  >
) {
  return (
    String(transaction.customerOrderNumber ?? "")
      .trim()
      .toLowerCase() === "cancelled"
  );
}

export function isSalesInvoice(
  transaction: Pick<
    CommercialSalesTransaction,
    "invoiceType" | "customerOrderNumber"
  >
) {
  if (isCancelledTransaction(transaction)) {
    return false;
  }

  if (isCreditNote(transaction)) {
    return false;
  }

  const type = normalizeInvoiceType(transaction.invoiceType);

  return (
    !type ||
    type === "INV" ||
    type === "INVOICE" ||
    type.includes("INVOICE")
  );
}

/*
 * This is OdinIQ's single rule for commercial sales:
 *
 * Invoice      = positive net sales
 * Credit       = negative net sales
 * Cancellation = zero
 *
 * Math.abs() protects us if Sage supplies a credit
 * as either a positive or negative value.
 */
export function commercialNetValue(
  transaction: CommercialSalesTransaction
) {
  if (isCancelledTransaction(transaction)) {
    return 0;
  }

  const value = Number(transaction.netValue ?? 0);

  if (isCreditNote(transaction)) {
    return -Math.abs(value);
  }

  if (isSalesInvoice(transaction)) {
    return value;
  }

  return 0;
}

export function calculateNetSales<
  T extends CommercialSalesTransaction
>(transactions: T[]) {
  return transactions.reduce(
    (total, transaction) =>
      total + commercialNetValue(transaction),
    0
  );
}

export function calculateCreditValue<
  T extends CommercialSalesTransaction
>(transactions: T[]) {
  return transactions
    .filter(isCreditNote)
    .reduce(
      (total, transaction) =>
        total + Math.abs(Number(transaction.netValue ?? 0)),
      0
    );
}

export function calculateNetSalesForYear<
  T extends CommercialSalesTransaction
>(
  transactions: T[],
  year: number
) {
  return transactions.reduce((total, transaction) => {
    if (!transaction.invoiceDate) {
      return total;
    }

    if (transaction.invoiceDate.getFullYear() !== year) {
      return total;
    }

    return total + commercialNetValue(transaction);
  }, 0);
}

export function calculateNetSalesYTD<
  T extends CommercialSalesTransaction
>(
  transactions: T[],
  year: number,
  comparisonDate: Date
) {
  const periodEnd = new Date(
    year,
    comparisonDate.getMonth(),
    comparisonDate.getDate(),
    23,
    59,
    59,
    999
  );

  return transactions.reduce((total, transaction) => {
    if (!transaction.invoiceDate) {
      return total;
    }

    const transactionDate = new Date(transaction.invoiceDate);

    if (transactionDate.getFullYear() !== year) {
      return total;
    }

    if (transactionDate > periodEnd) {
      return total;
    }

    return total + commercialNetValue(transaction);
  }, 0);
}