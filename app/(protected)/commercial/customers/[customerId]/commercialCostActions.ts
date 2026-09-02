"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";

const ALLOWED_COST_TYPES = new Set([
  "REBATE",
  "AGENT_COMMISSION",
  "MERCHANDISE",
  "ENTERTAINMENT",
  "MARKETING",
  "CARRIAGE",
  "OTHER",
]);

async function requireProfitabilityAccess() {
  const user = await requireAuth();
  const membership = user.memberships[0];

  if (!membership) {
    throw new Error("No active company membership found.");
  }

  if (!membership.role?.id) {
    throw new Error("No role found for this user.");
  }

  const permission = await prisma.rolePermission.findFirst({
    where: {
      roleId: membership.role.id,
      permission: {
        key: "commercial.profitability.view",
      },
    },
    select: {
      roleId: true,
    },
  });

  if (!permission) {
    throw new Error(
      "You do not have permission to manage profitability data."
    );
  }

  return membership;
}

export async function addCustomerCommercialCost(
  customerId: number,
  formData: FormData
) {
  const membership = await requireProfitabilityAccess();

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      companyId: membership.companyId,
    },
    select: {
      id: true,
    },
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const costType = String(
    formData.get("costType") ?? ""
  )
    .trim()
    .toUpperCase();

  const description = String(
    formData.get("description") ?? ""
  ).trim();

  const notes = String(
    formData.get("notes") ?? ""
  ).trim();

  const rawAmount = String(
    formData.get("amount") ?? ""
  ).trim();

  const rawDate = String(
    formData.get("costDate") ?? ""
  ).trim();

  const amount = Number(rawAmount);

  if (!ALLOWED_COST_TYPES.has(costType)) {
    throw new Error("Invalid commercial cost type.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(
      "Commercial cost must be greater than zero."
    );
  }

  if (!rawDate) {
    throw new Error("A cost date is required.");
  }

  const costDate = new Date(`${rawDate}T12:00:00`);

  if (Number.isNaN(costDate.getTime())) {
    throw new Error("Invalid cost date.");
  }

  await prisma.customerCommercialCost.create({
    data: {
      customerId: customer.id,
      costDate,
      costType,
      description: description || null,
      amount,
      source: "MANUAL",
      notes: notes || null,
      isAutomatic: false,
    },
  });

  revalidatePath(
    `/commercial/customers/${customer.id}`
  );
}

export async function deleteCustomerCommercialCost(
  customerId: number,
  costId: number
) {
  const membership = await requireProfitabilityAccess();

  const existingCost =
    await prisma.customerCommercialCost.findFirst({
      where: {
        id: costId,
        customerId,
        customer: {
          companyId: membership.companyId,
        },
      },
      select: {
        id: true,
        isAutomatic: true,
      },
    });

  if (!existingCost) {
    throw new Error("Commercial cost not found.");
  }

  /*
   * Automatically generated costs should eventually
   * be removed from their source module rather than
   * manually deleted from Profitability.
   */
  if (existingCost.isAutomatic) {
    throw new Error(
      "Automatic commercial costs cannot be deleted manually."
    );
  }

  await prisma.customerCommercialCost.delete({
    where: {
      id: existingCost.id,
    },
  });

  revalidatePath(
    `/commercial/customers/${customerId}`
  );
}