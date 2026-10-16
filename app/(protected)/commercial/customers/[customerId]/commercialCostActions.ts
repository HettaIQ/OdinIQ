
"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyWriteContext } from "@/lib/auth/requireCompanyWriteContext";
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
  const {
    membership,
    companyId,
   } = await requireCompanyWriteContext();

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

  return {
    membership,
    companyId,
  };
}

export async function addCustomerCommercialCost(
  customerId: number,
  formData: FormData
) {
  const {
    companyId,
  } = await requireProfitabilityAccess();

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      companyId,
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
  const rebateCategory = String(
    formData.get("rebateCategory") ?? ""
  )
    .trim()
    .toUpperCase();

  const ALLOWED_REBATE_CATEGORIES = new Set([
    "QUARTERLY",
    "ANNUAL_RETROSPECTIVE",
    "OTHER",
  ]);

  const description = String(
    formData.get("description") ?? ""
  ).trim();

  const notes = String(
    formData.get("notes") ?? ""
  ).trim();

  const sourceReference = String(
  formData.get("sourceReference") ?? ""
).trim();

  const rawAmount = String(
    formData.get("amount") ?? ""
  ).trim();

  const rawDate = String(
    formData.get("costDate") ?? ""
  ).trim();

const rawPeriodStart = String(
  formData.get("periodStart") ?? ""
).trim();

const rawPeriodEnd = String(
  formData.get("periodEnd") ?? ""
).trim();

  const amount = Number(rawAmount);

  if (!ALLOWED_COST_TYPES.has(costType)) {
    throw new Error("Invalid commercial cost type.");
  }
  if (
    costType === "REBATE" &&
    !ALLOWED_REBATE_CATEGORIES.has(rebateCategory)
  ) {
    throw new Error("Select a valid rebate category.");
  }

  if (costType !== "REBATE" && rebateCategory) {
    throw new Error(
      "Rebate category is only applicable to rebate costs."
    );
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

if (sourceReference) {
  const existingReference =
    await prisma.customerCommercialCost.findFirst({
      where: {
        customerId: customer.id,
        sourceReference: {
          equals: sourceReference,
        },
      },
      select: {
        id: true,
      },
    });

  if (existingReference) {
    throw new Error(
      `Commercial cost reference ${sourceReference} has already been recorded for this customer.`
    );
  }
}

if (Boolean(rawPeriodStart) !== Boolean(rawPeriodEnd)) {
  throw new Error(
    "Enter both period dates or leave both blank."
  );
}

const periodStart = rawPeriodStart
  ? new Date(`${rawPeriodStart}T12:00:00`)
  : null;

const periodEnd = rawPeriodEnd
  ? new Date(`${rawPeriodEnd}T12:00:00`)
  : null;

if (
  (periodStart && Number.isNaN(periodStart.getTime())) ||
  (periodEnd && Number.isNaN(periodEnd.getTime()))
) {
  throw new Error("Invalid commercial cost period.");
}

if (periodStart && periodEnd && periodEnd < periodStart) {
  throw new Error(
    "Period End cannot be earlier than Period Start."
  );
}

  await prisma.customerCommercialCost.create({
    data: {
      customerId: customer.id,
      costDate,
            rebateCategory:
        costType === "REBATE" ? rebateCategory : null,
periodStart,
periodEnd,
costType,
      description: description || null,
      amount,
      source: "MANUAL",
sourceReference: sourceReference || null,
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
  const {
    companyId,
  } = await requireProfitabilityAccess();

  const existingCost =
    await prisma.customerCommercialCost.findFirst({
      where: {
        id: costId,
        customerId,
        customer: {
          companyId,
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
