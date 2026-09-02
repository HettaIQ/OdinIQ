"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";

export async function updateOpportunity(
  opportunityId: number,
  formData: FormData,
) {
  const user = await requireAuth();
  const membership = user.memberships[0];

  if (!membership) {
    throw new Error("No active company membership found.");
  }

  const opportunity = await prisma.commercialOpportunity.findFirst({
    where: {
      id: opportunityId,
      companyId: membership.companyId,
    },
  });

  if (!opportunity) {
    throw new Error("Opportunity not found.");
  }

  const stage = String(formData.get("stage") ?? "QUALIFY");
  const valueInput = String(formData.get("value") ?? "").trim();
  const probabilityInput = String(formData.get("probability") ?? "").trim();
  const expectedCloseDateInput = String(
    formData.get("expectedCloseDate") ?? "",
  ).trim();

  const agentMembershipIdInput = String(
  formData.get("agentMembershipId") ?? "",
).trim();

const quoterMembershipIdInput = String(
  formData.get("quoterMembershipId") ?? "",
).trim();

  await prisma.commercialOpportunity.update({
    where: {
      id: opportunity.id,
    },
    data: {
      stage,
      value: valueInput ? Number(valueInput) : null,
      probability: probabilityInput ? Number(probabilityInput) : null,
      expectedCloseDate: expectedCloseDateInput
        ? new Date(`${expectedCloseDateInput}T12:00:00`)
        : null,

        agentMembershipId: agentMembershipIdInput
  ? Number(agentMembershipIdInput)
  : null,

quoterMembershipId: quoterMembershipIdInput
  ? Number(quoterMembershipIdInput)
  : null,
    },
  });

  revalidatePath(`/opportunities/${opportunity.id}`);
  revalidatePath("/opportunities");
  revalidatePath("/dashboard");
}