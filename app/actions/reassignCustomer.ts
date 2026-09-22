"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

export async function reassignCustomer(formData: FormData) {
  const {
    user,
    membership,
    companyId,
  } = await requireCompanyContext();

  const canReassignCustomers =
    user.platformRole === "SUPER_ADMIN" ||
    Boolean(
      membership.role?.permissions.some(
        ({ permission }) =>
          permission.key === "customers.reassign"
      )
    );

  if (!canReassignCustomers) {
    throw new Error(
      "You do not have permission to reassign customer accounts."
    );
  }

  const customerId = Number(
    formData.get("customerId")
  );

  const assignedMembershipId = Number(
    formData.get("assignedMembershipId")
  );

  if (!Number.isInteger(customerId)) {
    throw new Error(
      "A valid customer ID is required."
    );
  }

  if (!Number.isInteger(assignedMembershipId)) {
    throw new Error(
      "A valid team member is required."
    );
  }

  /*
   * The customer must belong to the
   * currently selected company.
   */
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      companyId,
    },
  });

  if (!customer) {
    throw new Error(
      "Customer not found."
    );
  }

  /*
   * The new owner must be an active
   * membership of the same company.
   *
   * This prevents a membership ID from
   * another OdinIQ tenant being submitted.
   */
  const newOwner =
    await prisma.companyMembership.findFirst({
      where: {
        id: assignedMembershipId,
        companyId,
        active: true,
      },
      include: {
        user: true,
      },
    });

  if (!newOwner) {
    throw new Error(
      "Selected team member was not found."
    );
  }

  if (
    customer.assignedMembershipId ===
    assignedMembershipId
  ) {
    return;
  }

  const effectiveFrom = new Date();

  await prisma.$transaction(async (tx) => {
    /*
     * CustomerAgentHistory is reached through
     * the already validated customer ID.
     */
    await tx.customerAgentHistory.updateMany({
      where: {
        customerId: customer.id,
        effectiveTo: null,
      },
      data: {
        effectiveTo: effectiveFrom,
      },
    });

    await tx.customerAgentHistory.create({
      data: {
        customerId: customer.id,
        membershipId: newOwner.id,
        agentName:
          newOwner.user.name ??
          newOwner.user.email ??
          "Unknown agent",
        effectiveFrom,
      },
    });

    /*
     * Update the customer we already proved
     * belongs to the active company.
     */
    await tx.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        assignedMembershipId: newOwner.id,
      },
    });
  });

  revalidatePath(
    `/commercial/customers/${customer.id}`
  );

  revalidatePath(
    "/commercial/customers"
  );

  revalidatePath("/team");

  if (customer.assignedMembershipId) {
    revalidatePath(
      `/team/${customer.assignedMembershipId}`
    );
  }

  revalidatePath(
    `/team/${newOwner.id}`
  );
}