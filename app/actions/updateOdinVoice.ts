"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";

const ALLOWED_ACCENTS = new Set([
  "british-deep",
  "northern",
  "manchester",
  "liverpool",
  "newcastle",
  "yorkshire",
  "midlands",
  "scottish",
  "welsh",
  "irish",
]);

function isAllowedOdinVoice(
  voiceId: string
) {
  const match = voiceId.match(
    /^odin-(.+)-(male|female)$/
  );

  if (!match) {
    return false;
  }

  return ALLOWED_ACCENTS.has(
    match[1]
  );
}

export async function updateOdinVoice(
  voiceId: string
) {
  const {
    user,
  } = await requireCompanyContext();

  if (!isAllowedOdinVoice(voiceId)) {
    throw new Error("Invalid Odin voice.");
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      odinVoiceId: voiceId,
    },
  });

  revalidatePath("/settings");

  return {
    success: true,
  };
}

