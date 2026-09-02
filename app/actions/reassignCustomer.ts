"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";

export async function reassignCustomer(formData: FormData) {
  const user = await requireAuth();
  const membership = user.memberships[0];

  if (!membership) {
    throw new Error("No active company membership found.");
  }

  if (
    membership.role?.name !== "Company Admin" &&
    membership.role?.name !== "Accounts"
  ) {
    throw new Error(
      "You do not have permission to reassign customer accounts."
    );
  }

  const customerId = Number(formData.get("customerId"));
  const assignedMembershipId = Number(
    formData.get("assignedMembershipId")
  );

  if (!Number.isInteger(customerId)) {
    throw new Error("A valid customer ID is required.");
  }

  if (!Number.isInteger(assignedMembershipId)) {
    throw new Error("A valid team member is required.");
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      companyId: membership.companyId,
    },
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const newOwner = await prisma.companyMembership.findFirst({
    where: {
      id: assignedMembershipId,
      companyId: membership.companyId,
      active: true,
    },
    include: {
      user: true,
    },
  });

  if (!newOwner) {
    throw new Error("Selected team member was not found.");
  }

  if (customer.assignedMembershipId === assignedMembershipId) {
    return;
  }

  const effectiveFrom = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.customerAgentHistory.updateMany({
      where: {
        customerId,
        effectiveTo: null,
      },
      data: {
        effectiveTo: effectiveFrom,
      },
    });

    await tx.customerAgentHistory.create({
      data: {
        customerId,
        membershipId: assignedMembershipId,
        agentName:
          newOwner.user.name ??
          newOwner.user.email ??
          "Unknown agent",
        effectiveFrom,
      },
    });

    await tx.customer.update({
      where: {
        id: customerId,
      },
      data: {
        assignedMembershipId,
      },
    });
  });

  revalidatePath(`/commercial/customers/${customerId}`);
  revalidatePath("/commercial/customers");
  revalidatePath("/team");
  revalidatePath(`/team/${customer.assignedMembershipId}`);
  revalidatePath(`/team/${assignedMembershipId}`);
}