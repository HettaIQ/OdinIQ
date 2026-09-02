"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/requireAuth";
import { redirect } from "next/navigation";

export async function updateCustomer(formData: FormData) {
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
    "You do not have permission to manage customer ownership or buying groups."
  );
}
  const customerId = Number(formData.get("customerId"));
  const assignedMembershipIdValue = String(
    formData.get("assignedMembershipId") ?? ""
  );
  const buyingGroup = String(formData.get("buyingGroup") ?? "").trim();

  const name = String(formData.get("name") ?? "").trim();

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

  if (!customerId) {
    throw new Error("Customer ID is required.");
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

  const assignedMembershipId = assignedMembershipIdValue
    ? Number(assignedMembershipIdValue)
    : null;

    const selectedAgent = assignedMembershipId
  ? await prisma.companyMembership.findFirst({
      where: {
        id: assignedMembershipId,
        companyId: membership.companyId,
      },
      include: {
        user: true,
      },
    })
  : null;

  const agentEffectiveFrom = agentEffectiveFromValue
    ? new Date(agentEffectiveFromValue)
    : new Date();

  const buyingGroupEffectiveFrom = buyingGroupEffectiveFromValue
    ? new Date(buyingGroupEffectiveFromValue)
    : new Date();

  await prisma.$transaction(async (tx) => {
    const agentChanged =
      customer.assignedMembershipId !== assignedMembershipId;

    const buyingGroupChanged =
      (customer.buyingGroup ?? "") !== buyingGroup;

    if (agentChanged) {
      await tx.customerAgentHistory.updateMany({
        where: {
          customerId,
          effectiveTo: null,
        },
        data: {
          effectiveTo: agentEffectiveFrom,
        },
      });

      if (assignedMembershipId) {
        await tx.customerAgentHistory.create({
  data: {
    customerId,
    membershipId: assignedMembershipId,
    agentName:
      selectedAgent?.user.name ??
      selectedAgent?.user.email ??
      "Unknown agent",
    effectiveFrom: agentEffectiveFrom,
  },
});
      }
    }

    if (buyingGroupChanged) {
      await tx.customerBuyingGroupHistory.updateMany({
        where: {
          customerId,
          effectiveTo: null,
        },
        data: {
          effectiveTo: buyingGroupEffectiveFrom,
        },
      });

      if (buyingGroup) {
        await tx.customerBuyingGroupHistory.create({
          data: {
            customerId,
            buyingGroup,
            effectiveFrom: buyingGroupEffectiveFrom,
          },
        });
      }
    }

    await tx.customer.update({
      where: {
        id: customerId,
      },
      data: {
  assignedMembershipId,
  buyingGroup: buyingGroup || null,
  name,
  paymentTerms: paymentTerms || null,
  discount: discountValue ? Number(discountValue) : null,
  creditLimit: creditLimitValue
  ? Number(creditLimitValue.replace(/,/g, ""))
  : null,

currentBalance: currentBalanceValue
  ? Number(currentBalanceValue.replace(/,/g, ""))
  : null,
  status,
},
    });
  });

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  revalidatePath(`/commercial/customers/${customerId}`);
revalidatePath(`/commercial/customers/${customerId}/edit`);
revalidatePath("/commercial/customers");
revalidatePath("/commercial");
redirect(`/commercial/customers/${customerId}`);
}