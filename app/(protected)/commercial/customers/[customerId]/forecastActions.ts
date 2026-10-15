
"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyWriteContext } from "@/lib/auth/requireCompanyWriteContext";
import { saveSalesForecastOverride } from "@/lib/commercial/saveSalesForecastOverride";
import { restoreAutomaticSalesForecast } from "@/lib/commercial/restoreAutomaticSalesForecast";

function parsePositiveInteger(
  value: FormDataEntryValue | null,
  fieldName: string
): number {
  const raw = typeof value === "string"
    ? value.trim()
    : "";

  if (!/^[0-9]+$/.test(raw)) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  const parsed = Number(raw);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return parsed;
}

function parseForecastYear(
  value: FormDataEntryValue | null
): number {
  const year = parsePositiveInteger(
    value,
    "forecast year"
  );

  if (year < 1900 || year > 9998) {
    throw new Error("Invalid forecast year.");
  }

  return year;
}

function parseReason(formData: FormData): string {
  const value = formData.get("reason");

  if (typeof value !== "string") {
    throw new Error("A reason is required.");
  }

  const reason = value.trim();

  if (reason.length < 10 || reason.length > 1000) {
    throw new Error(
      "A reason between 10 and 1000 characters is required."
    );
  }

  return reason;
}

export async function saveCustomerForecastAction(
  customerId: number,
  formData: FormData
) {
  const { user, companyId } =
    await requireCompanyWriteContext();

  if (!Number.isSafeInteger(customerId) || customerId <= 0) {
    throw new Error("Invalid customer.");
  }

  const businessUnitId = parsePositiveInteger(
    formData.get("businessUnitId"),
    "business unit"
  );

  const year = parseForecastYear(
    formData.get("year")
  );

  const rawAmount = formData.get(
    "projectedAnnualSales"
  );

  if (
    typeof rawAmount !== "string" ||
    !/^\d+(?:\.\d{1,2})?$/.test(rawAmount.trim())
  ) {
    throw new Error(
      "Enter a valid annual forecast amount."
    );
  }

  const projectedAnnualSales = Number(
    rawAmount.trim()
  );

  if (!Number.isFinite(projectedAnnualSales)) {
    throw new Error("Invalid forecast amount.");
  }

  await saveSalesForecastOverride({
    companyId,
    customerId,
    businessUnitId,
    year,
    projectedAnnualSales,
    reason: parseReason(formData),
    userId: user.id,
  });

  revalidatePath(
    `/commercial/customers/${customerId}`
  );
}

export async function restoreCustomerForecastAction(
  customerId: number,
  formData: FormData
) {
  const { user, companyId } =
    await requireCompanyWriteContext();

  if (!Number.isSafeInteger(customerId) || customerId <= 0) {
    throw new Error("Invalid customer.");
  }

  const businessUnitId = parsePositiveInteger(
    formData.get("businessUnitId"),
    "business unit"
  );

  const year = parseForecastYear(
    formData.get("year")
  );

  await restoreAutomaticSalesForecast({
    companyId,
    customerId,
    businessUnitId,
    year,
    reason: parseReason(formData),
    userId: user.id,
  });

  revalidatePath(
    `/commercial/customers/${customerId}`
  );
}
