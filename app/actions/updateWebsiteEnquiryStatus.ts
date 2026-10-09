
"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { prisma } from "@/lib/prisma";

const ALLOWED_STATUSES = new Set([
  "NEW",
  "CONTACTED",
  "QUOTED",
  "WON",
  "LOST",
]);

export async function updateWebsiteEnquiryStatus(
  enquiryId: number,
  formData: FormData
) {
  await requireSuperAdmin();

  if (!Number.isSafeInteger(enquiryId) || enquiryId <= 0) {
    throw new Error("Invalid enquiry reference.");
  }

  const status = String(
    formData.get("status") ?? ""
  )
    .trim()
    .toUpperCase();

  if (!ALLOWED_STATUSES.has(status)) {
    throw new Error("Invalid enquiry status.");
  }

  const existingEnquiry = await prisma.websiteEnquiry.findUnique({
    where: { id: enquiryId },
    select: { id: true },
  });

  if (!existingEnquiry) {
    throw new Error("Enquiry not found.");
  }

  await prisma.websiteEnquiry.update({
    where: { id: enquiryId },
    data: { status },
  });

  revalidatePath("/website-enquiries");
  revalidatePath(`/website-enquiries/${enquiryId}`);
}
