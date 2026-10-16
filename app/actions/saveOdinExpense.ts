"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";

export async function saveOdinExpense(formData: FormData) {
  const user = await requireAuth();

  if (user.platformRole !== "SUPER_ADMIN") {
    notFound();
  }

  const expenseDate = String(
    formData.get("expenseDate") ?? ""
  );

  const supplier = String(
    formData.get("supplier") ?? ""
  ).trim();

  const description = String(
    formData.get("description") ?? ""
  ).trim();

  const category = String(
    formData.get("category") ?? ""
  ).trim();

  const grossInput = String(
    formData.get("grossAmount") ?? ""
  ).trim();

  const vatRateInput = String(
    formData.get("vatRate") ?? ""
  ).trim();

  const paymentMethod = String(
    formData.get("paymentMethod") ?? ""
  ).trim();

  const fundedBy = String(
    formData.get("fundedBy") ?? "PERSONAL"
  );

  const frequency = String(
    formData.get("frequency") ?? "ONE_OFF"
  );

  const notes = String(
    formData.get("notes") ?? ""
  ).trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)
  ) {
    throw new Error("Invalid expense date.");
  }

  const date = new Date(
    `${expenseDate}T12:00:00Z`
  );

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== expenseDate
  ) {
    throw new Error("Invalid expense date.");
  }

  if (
    !supplier ||
    !description ||
    !category ||
    supplier.length > 200 ||
    description.length > 1000 ||
    category.length > 100 ||
    notes.length > 5000
  ) {
    throw new Error("Invalid expense details.");
  }

  if (
    !/^\d+(\.\d{1,2})?$/.test(grossInput)
  ) {
    throw new Error("Enter a valid amount.");
  }

  const grossAmount = Number(grossInput);

  const vatRate = Number(vatRateInput);

  if (
    !Number.isFinite(grossAmount) ||
    grossAmount <= 0 ||
    grossAmount > 10000000 ||
    !["0", "5", "20"].includes(vatRateInput) ||
    !Number.isFinite(vatRate)
  ) {
    throw new Error("Invalid amount or VAT rate.");
  }

  if (
    !["PERSONAL", "COMPANY"].includes(fundedBy)
  ) {
    throw new Error("Invalid funding source.");
  }

  if (
    !["ONE_OFF", "MONTHLY", "ANNUAL"].includes(frequency)
  ) {
    throw new Error("Invalid payment frequency.");
  }

  if (paymentMethod.length > 100) {
    throw new Error("Invalid payment method.");
  }

  // Calculate amounts in pennies to reduce
  // floating-point rounding differences.
  const grossPence = Math.round(grossAmount * 100);

  const netPence = Math.round(
    grossPence / (1 + vatRate / 100)
  );

  const vatPence = grossPence - netPence;

  await prisma.odinExpense.create({
    data: {
      expenseDate: date,
      supplier,
      description,
      category,
      netAmount: netPence / 100,
      vatAmount: vatPence / 100,
      grossAmount: grossPence / 100,
      paymentMethod: paymentMethod || null,
      fundedBy,
      recurring: frequency !== "ONE_OFF",
      recurringFrequency:
        frequency === "ONE_OFF" ? null : frequency,
      notes: notes || null,
    },
  });

  revalidatePath("/odin-costs");
}