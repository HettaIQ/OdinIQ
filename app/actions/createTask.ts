"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/requireAuth";
import { revalidatePath } from "next/cache";

export async function createTask(formData: FormData) {
  const user = await requireAuth();

  const customerId = Number(formData.get("customerId"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "GENERAL");
  const priority = String(formData.get("priority") ?? "MEDIUM");
  const dueDateValue = String(formData.get("dueDate") ?? "");

  if (!customerId || !title) {
    throw new Error("Customer and task title are required.");
  }

  const membership = await prisma.companyMembership.findFirst({
    where: {
      userId: user.id,
    },
  });

  if (!membership) {
    throw new Error("Company membership could not be found.");
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      companyId: membership.companyId,
    },
  });

  if (!customer) {
    throw new Error("Customer could not be found.");
  }

  await prisma.commercialTask.create({
    data: {
      companyId: membership.companyId,
      customerId: customer.id,
      assignedMembershipId: membership.id,
      title,
      description: description || null,
      type,
      priority,
      status: "OPEN",
      dueDate: dueDateValue
        ? new Date(`${dueDateValue}T12:00:00`)
        : null,
    },
  });

  await prisma.customerTimelineEntry.create({
    data: {
      customerId: customer.id,
      type: "TASK",
      title: "Commercial task created",
      description: title,
      reference: type,
      createdBy: user.name ?? user.email,
    },
  });

  revalidatePath(`/customers/${customer.id}`);
  revalidatePath("/dashboard");
}