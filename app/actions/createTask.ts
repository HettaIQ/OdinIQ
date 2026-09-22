"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

export async function createTask(
  formData: FormData
) {
  const {
    user,
    membership,
    companyId,
  } = await requireCompanyContext();

  const canCreateTasks =
    user.platformRole === "SUPER_ADMIN" ||
    Boolean(
      membership.role?.permissions.some(
        ({ permission }) =>
          permission.key === "tasks.create"
      )
    );

  if (!canCreateTasks) {
    throw new Error(
      "You do not have permission to create commercial tasks."
    );
  }

  const customerId = Number(
    formData.get("customerId")
  );

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const description = String(
    formData.get("description") ?? ""
  ).trim();

  const type = String(
    formData.get("type") ?? "GENERAL"
  );

  const priority = String(
    formData.get("priority") ?? "MEDIUM"
  );

  const dueDateValue = String(
    formData.get("dueDate") ?? ""
  );

  if (
    !Number.isInteger(customerId) ||
    !title
  ) {
    throw new Error(
      "Customer and task title are required."
    );
  }

  /*
   * The customer must belong to the
   * currently selected OdinIQ company.
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
      "Customer could not be found in the active company."
    );
  }

  /*
   * The task is explicitly owned by the
   * active company and assigned to the
   * current user's membership in that company.
   */
  await prisma.commercialTask.create({
    data: {
      companyId,
      customerId: customer.id,
      assignedMembershipId: membership.id,
      title,
      description:
        description || null,
      type,
      priority,
      status: "OPEN",
      dueDate: dueDateValue
        ? new Date(
            `${dueDateValue}T12:00:00`
          )
        : null,
    },
  });

  /*
   * Timeline entry is linked only to the
   * customer already validated above.
   */
  await prisma.customerTimelineEntry.create({
    data: {
      customerId: customer.id,
      type: "TASK",
      title:
        "Commercial task created",
      description: title,
      reference: type,
      createdBy:
        user.name ?? user.email,
    },
  });

  revalidatePath(
    `/customers/${customer.id}`
  );

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}