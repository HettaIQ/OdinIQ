"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

export async function updateOpportunity(
  opportunityId: number,
  formData: FormData,
) {
  const {
    user,
    membership,
    companyId,
  } = await requireCompanyContext();

  const canManageOpportunities =
    user.platformRole === "SUPER_ADMIN" ||
    Boolean(
      membership.role?.permissions.some(
        ({ permission }) =>
          permission.key === "opportunities.manage"
      )
    );

  if (!canManageOpportunities) {
    throw new Error(
      "You do not have permission to manage commercial opportunities."
    );
  }

  const opportunity =
    await prisma.commercialOpportunity.findFirst({
      where: {
        id: opportunityId,
        companyId,
      },
    });

  if (!opportunity) {
    throw new Error("Opportunity not found.");
  }

  const stage = String(
    formData.get("stage") ?? "QUALIFY",
  );

  const valueInput = String(
    formData.get("value") ?? "",
  ).trim();

  const probabilityInput = String(
    formData.get("probability") ?? "",
  ).trim();

  const expectedCloseDateInput = String(
    formData.get("expectedCloseDate") ?? "",
  ).trim();

  const agentMembershipIdInput = String(
    formData.get("agentMembershipId") ?? "",
  ).trim();

  const quoterMembershipIdInput = String(
    formData.get("quoterMembershipId") ?? "",
  ).trim();

  const agentMembershipId =
    agentMembershipIdInput
      ? Number(agentMembershipIdInput)
      : null;

  const quoterMembershipId =
    quoterMembershipIdInput
      ? Number(quoterMembershipIdInput)
      : null;

  if (
    agentMembershipId !== null &&
    !Number.isInteger(agentMembershipId)
  ) {
    throw new Error("Invalid agent.");
  }

  if (
    quoterMembershipId !== null &&
    !Number.isInteger(quoterMembershipId)
  ) {
    throw new Error("Invalid quoter.");
  }

  if (agentMembershipId !== null) {
    const agent =
      await prisma.companyMembership.findFirst({
        where: {
          id: agentMembershipId,
          companyId,
          active: true,
        },
        select: {
          id: true,
        },
      });

    if (!agent) {
      throw new Error(
        "Selected agent does not belong to this company.",
      );
    }
  }

  if (quoterMembershipId !== null) {
    const quoter =
      await prisma.companyMembership.findFirst({
        where: {
          id: quoterMembershipId,
          companyId,
          active: true,
        },
        select: {
          id: true,
        },
      });

    if (!quoter) {
      throw new Error(
        "Selected quoter does not belong to this company.",
      );
    }
  }

  await prisma.commercialOpportunity.update({
    where: {
      id: opportunity.id,
    },
    data: {
      stage,

      value: valueInput
        ? Number(valueInput)
        : null,

      probability: probabilityInput
        ? Number(probabilityInput)
        : null,

      expectedCloseDate:
        expectedCloseDateInput
          ? new Date(
              `${expectedCloseDateInput}T12:00:00`,
            )
          : null,

      agentMembershipId,
      quoterMembershipId,
    },
  });

  revalidatePath(
    `/opportunities/${opportunity.id}`,
  );
  revalidatePath("/opportunities");
  revalidatePath("/dashboard");
}