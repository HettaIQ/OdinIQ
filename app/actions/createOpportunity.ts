"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCompanyWriteContext } from "@/lib/auth/requireCompanyWriteContext";
import { prisma } from "@/lib/prisma";

const ALLOWED_STATUSES = new Set([
  "OPEN",
  "WON",
  "LOST",
  "CANCELLED",
]);

const ALLOWED_STAGES = new Set([
  "QUALIFY",
  "DEVELOP",
  "PROPOSE",
  "NEGOTIATE",
  "CLOSE",
]);

function parseOptionalMembershipId(
  value: FormDataEntryValue | null
) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return null;
  }

  const id = Number(rawValue);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(
      "Invalid team member selected."
    );
  }

  return id;
}

export async function createOpportunity(
  formData: FormData
) {
  const { companyId } =
    await requireCompanyWriteContext();

  const customerId = Number(
    formData.get("customerId")
  );

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const description = String(
    formData.get("description") ?? ""
  ).trim();

  const stage = String(
    formData.get("stage") ?? "QUALIFY"
  )
    .trim()
    .toUpperCase();

  const status = String(
    formData.get("status") ?? "OPEN"
  )
    .trim()
    .toUpperCase();

  const rawValue = String(
    formData.get("value") ?? ""
  ).trim();

  const rawProbability = String(
    formData.get("probability") ?? ""
  ).trim();

  const rawExpectedCloseDate = String(
    formData.get("expectedCloseDate") ?? ""
  ).trim();

  const source = String(
    formData.get("source") ?? ""
  ).trim();

  const ownerMembershipId =
    parseOptionalMembershipId(
      formData.get("ownerMembershipId")
    );

  const agentMembershipId =
    parseOptionalMembershipId(
      formData.get("agentMembershipId")
    );

  const quoterMembershipId =
    parseOptionalMembershipId(
      formData.get("quoterMembershipId")
    );

  if (
    !Number.isInteger(customerId) ||
    customerId <= 0
  ) {
    throw new Error(
      "A customer must be selected."
    );
  }

  if (!title) {
    throw new Error(
      "Opportunity title is required."
    );
  }

  if (!ALLOWED_STAGES.has(stage)) {
    throw new Error(
      "Invalid opportunity stage."
    );
  }

  if (!ALLOWED_STATUSES.has(status)) {
    throw new Error(
      "Invalid opportunity status."
    );
  }

  const customer =
    await prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId,
      },
      select: {
        id: true,
      },
    });

  if (!customer) {
    throw new Error(
      "Customer not found."
    );
  }

  let value: number | null = null;

  if (rawValue) {
    value = Number(rawValue);

    if (
      !Number.isFinite(value) ||
      value < 0
    ) {
      throw new Error(
        "Opportunity value must be zero or greater."
      );
    }
  }

  let probability: number | null = null;

  if (rawProbability) {
    probability = Number(rawProbability);

    if (
      !Number.isInteger(probability) ||
      probability < 0 ||
      probability > 100
    ) {
      throw new Error(
        "Probability must be a whole number between 0 and 100."
      );
    }
  }

  let expectedCloseDate: Date | null = null;

  if (rawExpectedCloseDate) {
    expectedCloseDate = new Date(
      `${rawExpectedCloseDate}T12:00:00`
    );

    if (
      Number.isNaN(
        expectedCloseDate.getTime()
      )
    ) {
      throw new Error(
        "Invalid expected close date."
      );
    }
  }

  const selectedMembershipIds = [
    ownerMembershipId,
    agentMembershipId,
    quoterMembershipId,
  ].filter(
    (membershipId): membershipId is number =>
      membershipId !== null
  );

  if (selectedMembershipIds.length > 0) {
    const uniqueMembershipIds = [
      ...new Set(selectedMembershipIds),
    ];

    const validMemberships =
      await prisma.companyMembership.findMany({
        where: {
          id: {
            in: uniqueMembershipIds,
          },
          companyId,
          active: true,
          user: {
            active: true,
          },
        },
        select: {
          id: true,
        },
      });

    if (
      validMemberships.length !==
      uniqueMembershipIds.length
    ) {
      throw new Error(
        "One or more selected team members are invalid."
      );
    }
  }

  const opportunity =
    await prisma.commercialOpportunity.create({
      data: {
        companyId,
        customerId: customer.id,
        title,
        description:
          description || null,
        stage,
        status,
        value,
        probability,
        expectedCloseDate,
        source: source || "MANUAL",
        ownerMembershipId,
        agentMembershipId,
        quoterMembershipId,
      },
      select: {
        id: true,
      },
    });

  revalidatePath(
    "/commercial/opportunities"
  );

  revalidatePath(
    `/commercial/customers/${customer.id}`
  );

  revalidatePath(
    "/commercial/meetings"
  );

  redirect(
    `/commercial/opportunities/${opportunity.id}`
  );
}
