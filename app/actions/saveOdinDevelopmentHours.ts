"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";

export async function saveOdinDevelopmentHours(
  formData: FormData
) {
  const user = await requireAuth();

  if (user.platformRole !== "SUPER_ADMIN") {
    notFound();
  }

  const week = String(formData.get("week") ?? "");
  const hours = Number(formData.get("hours"));
  const description = String(
    formData.get("description") ?? ""
  ).trim();

  // Validate the week commencing date.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    throw new Error("Invalid week commencing date.");
  }

  const workDate = new Date(`${week}T12:00:00Z`);

  if (
    Number.isNaN(workDate.getTime()) ||
    workDate.toISOString().slice(0, 10) !== week ||
    workDate.getUTCDay() !== 1
  ) {
    throw new Error("Select a valid Monday.");
  }

  // Validate hours.
  if (
    !Number.isFinite(hours) ||
    hours <= 0 ||
    hours > 168
  ) {
    throw new Error("Enter valid weekly hours.");
  }

  const settings =
    await prisma.odinCostSettings.findFirst();

  if (!settings) {
    throw new Error("Odin Cost settings not found.");
  }

  // Prevent duplicate weekly records.
  const existing =
    await prisma.odinDevelopmentTime.findFirst({
      where: {
        workDate,
      },
    });

  if (existing) {
    throw new Error(
      "Hours have already been recorded for this week."
    );
  }

  await prisma.odinDevelopmentTime.create({
    data: {
      workDate,
      hours,
      hourlyRate: settings.hourlyRate,
      description:
        description || "OdinIQ platform development",
    },
  });

  revalidatePath("/odin-costs");
}