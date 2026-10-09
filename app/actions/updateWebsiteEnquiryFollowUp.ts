
"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { prisma } from "@/lib/prisma";

export async function updateWebsiteEnquiryFollowUp(
  enquiryId: number,
  formData: FormData
) {
  await requireSuperAdmin();

  if (!Number.isSafeInteger(enquiryId) || enquiryId <= 0) {
    throw new Error("Invalid enquiry reference.");
  }

  const rawDate = String(
    formData.get("nextFollowUpAt") ?? ""
  ).trim();

  let nextFollowUpAt: Date | null = null;

  if (rawDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      throw new Error("Invalid follow-up date.");
    }

    const date = new Date(`${rawDate}T12:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== rawDate
    ) {
      throw new Error("Invalid follow-up date.");
    }

    nextFollowUpAt = date;
  }

  const enquiry = await prisma.websiteEnquiry.findUnique({
    where: { id: enquiryId },
    select: { id: true },
  });

  if (!enquiry) {
    throw new Error("Enquiry not found.");
  }

  await prisma.websiteEnquiry.update({
    where: { id: enquiryId },
    data: { nextFollowUpAt },
  });

  revalidatePath("/website-enquiries");
  revalidatePath(`/website-enquiries/${enquiryId}`);
}
