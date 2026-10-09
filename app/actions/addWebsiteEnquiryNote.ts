
"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { prisma } from "@/lib/prisma";

export async function addWebsiteEnquiryNote(
  enquiryId: number,
  formData: FormData
) {
  await requireSuperAdmin();

  if (!Number.isSafeInteger(enquiryId) || enquiryId <= 0) {
    throw new Error("Invalid enquiry reference.");
  }

  const note = String(formData.get("note") ?? "").trim();

  if (!note || note.length > 5000) {
    throw new Error("Note must contain between 1 and 5000 characters.");
  }

  const enquiry = await prisma.websiteEnquiry.findUnique({
    where: { id: enquiryId },
    select: { id: true },
  });

  if (!enquiry) {
    throw new Error("Enquiry not found.");
  }

  await prisma.websiteEnquiryNote.create({
    data: {
      enquiryId,
      note,
    },
  });

  revalidatePath(`/website-enquiries/${enquiryId}`);
}
