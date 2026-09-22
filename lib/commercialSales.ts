export function normalizeInvoiceType(
  value: string | null | undefined
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export function isCreditNote(invoice: {
  invoiceType: string | null;
}) {
  const type = normalizeInvoiceType(
    invoice.invoiceType
  );

  return (
    type === "CRD" ||
    type === "CREDIT" ||
    type.includes("CREDIT NOTE")
  );
}

export function isCancelledInvoice(invoice: {
  customerOrderNumber: string | null;
}) {
  return (
    String(invoice.customerOrderNumber ?? "")
      .trim()
      .toLowerCase() === "cancelled"
  );
}

export function isSalesInvoice(invoice: {
  invoiceType: string | null;
  customerOrderNumber: string | null;
}) {
  if (isCancelledInvoice(invoice)) {
    return false;
  }

  if (isCreditNote(invoice)) {
    return false;
  }

  const type = normalizeInvoiceType(
    invoice.invoiceType
  );

  return (
    !type ||
    type === "INV" ||
    type === "INVOICE" ||
    type.includes("INVOICE")
  );
}

/*
 * Commercial net sales:
 *
 * Sales invoices increase sales.
 * Credit notes reduce sales.
 * Cancelled invoices contribute £0.
 * Unknown invoice types contribute £0.
 */
export function commercialNetValue(invoice: {
  invoiceType: string | null;
  customerOrderNumber: string | null;
  netValue: number | null;
}) {
  if (isCancelledInvoice(invoice)) {
    return 0;
  }

  const value = Number(
    invoice.netValue ?? 0
  );

  if (isCreditNote(invoice)) {
    return -Math.abs(value);
  }

  if (isSalesInvoice(invoice)) {
    return value;
  }

  return 0;
}