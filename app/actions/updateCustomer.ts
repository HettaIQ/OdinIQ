"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

export async function updateCustomer(
  formData: FormData
) {
  const {
    user,
    membership,
    companyId,
  } = await requireCompanyContext();

  const canManageCustomers =
    user.platformRole === "SUPER_ADMIN" ||
    Boolean(
      membership.role?.permissions.some(
        ({ permission }) =>
          permission.key === "customers.manage"
      )
    );

  if (!canManageCustomers) {
    throw new Error(
      "You do not have permission to manage customer account details."
    );
  }

  const customerId = Number(
    formData.get("customerId")
  );

  const assignedMembershipIdValue = String(
    formData.get("assignedMembershipId") ?? ""
  );

  const buyingGroup = String(
    formData.get("buyingGroup") ?? ""
  ).trim();

  const name = String(
    formData.get("name") ?? ""
  ).trim();

  const paymentTerms = String(
    formData.get("paymentTerms") ?? ""
  ).trim();

  const discountValue = String(
    formData.get("discount") ?? ""
  ).trim();

  const creditLimitValue = String(
    formData.get("creditLimit") ?? ""
  ).trim();

  const currentBalanceValue = String(
    formData.get("currentBalance") ?? ""
  ).trim();

  const status = String(
    formData.get("status") ?? "ACTIVE"
  ).trim();

  const agentEffectiveFromValue = String(
    formData.get("agentEffectiveFrom") ?? ""
  );

  const buyingGroupEffectiveFromValue = String(
    formData.get("buyingGroupEffectiveFrom") ?? ""
  );

  if (!Number.isInteger(customerId)) {
    throw new Error(
      "A valid customer ID is required."
    );
  }

  /*
   * The customer must belong to the
   * currently selected company.
   */
  const customer =
    await prisma.customer.findFirst({
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

  const assignedMembershipId =
    assignedMembershipIdValue
      ? Number(assignedMembershipIdValue)
      : null;

  if (
    assignedMembershipId !== null &&
    !Number.isInteger(assignedMembershipId)
  ) {
    throw new Error(
      "A valid team member is required."
    );
  }

  /*
   * If an owner has been selected, they must
   * be an active membership of the same
   * company as the customer.
   */
  const selectedAgent =
    assignedMembershipId !== null
      ? await prisma.companyMembership.findFirst({
          where: {
            id: assignedMembershipId,
            companyId,
            active: true,
          },
          include: {
            user: true,
          },
        })
      : null;

  if (
    assignedMembershipId !== null &&
    !selectedAgent
  ) {
    throw new Error(
      "Selected team member was not found in the active company."
    );
  }

  const agentEffectiveFrom =
    agentEffectiveFromValue
      ? new Date(agentEffectiveFromValue)
      : new Date();

  const buyingGroupEffectiveFrom =
    buyingGroupEffectiveFromValue
      ? new Date(buyingGroupEffectiveFromValue)
      : new Date();

  await prisma.$transaction(async (tx) => {
    const agentChanged =
      customer.assignedMembershipId !==
      assignedMembershipId;

    const buyingGroupChanged =
      (customer.buyingGroup ?? "") !==
      buyingGroup;

    if (agentChanged) {
      /*
       * History records are reached through
       * the customer we already proved belongs
       * to the active company.
       */
      await tx.customerAgentHistory.updateMany({
        where: {
          customerId: customer.id,
          effectiveTo: null,
        },
        data: {
          effectiveTo: agentEffectiveFrom,
        },
      });

      if (
        assignedMembershipId !== null &&
        selectedAgent
      ) {
        await tx.customerAgentHistory.create({
          data: {
            customerId: customer.id,
            membershipId: selectedAgent.id,
            agentName:
              selectedAgent.user.name ??
              selectedAgent.user.email ??
              "Unknown agent",
            effectiveFrom: agentEffectiveFrom,
          },
        });
      }
    }

    if (buyingGroupChanged) {
      await tx.customerBuyingGroupHistory.updateMany({
        where: {
          customerId: customer.id,
          effectiveTo: null,
        },
        data: {
          effectiveTo:
            buyingGroupEffectiveFrom,
        },
      });

      if (buyingGroup) {
        await tx.customerBuyingGroupHistory.create({
          data: {
            customerId: customer.id,
            buyingGroup,
            effectiveFrom:
              buyingGroupEffectiveFrom,
          },
        });
      }
    }

    /*
     * Update the exact customer that has
     * already been validated against the
     * active company.
     */
    await tx.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        assignedMembershipId:
          selectedAgent?.id ?? null,

        buyingGroup:
          buyingGroup || null,

        name,

        paymentTerms:
          paymentTerms || null,

        discount:
          discountValue
            ? Number(discountValue)
            : null,

        creditLimit:
          creditLimitValue
            ? Number(
                creditLimitValue.replace(
                  /,/g,
                  ""
                )
              )
            : null,

        currentBalance:
          currentBalanceValue
            ? Number(
                currentBalanceValue.replace(
                  /,/g,
                  ""
                )
              )
            : null,

        status,
      },
    });
  });

  revalidatePath(
    `/customers/${customer.id}`
  );

  revalidatePath("/customers");

  revalidatePath(
    `/commercial/customers/${customer.id}`
  );

  revalidatePath(
    `/commercial/customers/${customer.id}/edit`
  );

  revalidatePath(
    "/commercial/customers"
  );

  revalidatePath("/commercial");

  redirect(
    `/commercial/customers/${customer.id}`
  );
}