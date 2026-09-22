"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

export async function completeTask(taskId: number) {
  const {
    user,
    membership,
    companyId,
  } = await requireCompanyContext();

  const canCompleteTasks =
    user.platformRole === "SUPER_ADMIN" ||
    Boolean(
      membership.role?.permissions.some(
        ({ permission }) =>
          permission.key === "tasks.complete"
      )
    );

  if (!canCompleteTasks) {
    throw new Error(
      "You do not have permission to complete commercial tasks."
    );
  }

  const task = await prisma.commercialTask.findFirst({
    where: {
      id: taskId,
      companyId,
      status: "OPEN",
    },
    include: {
      customer: true,
    },
  });

  if (!task) {
    throw new Error("Task could not be found.");
  }

  await prisma.$transaction([
    prisma.commercialTask.update({
      where: {
        id: task.id,
      },
      data: {
        status: "COMPLETED",
      },
    }),

    prisma.customerTimelineEntry.create({
      data: {
        customerId: task.customerId,
        type: "TASK",
        title: "Commercial task completed",
        description: task.title,
        reference: task.type,
        createdBy: user.name,
      },
    }),
  ]);

  revalidatePath(`/customers/${task.customerId}`);
  revalidatePath("/dashboard");

  return {
    success: true,
  };
}

export async function createTaskFromVoiceNote(voiceNoteId: number) {
  "use server";

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

  const canCreateOpportunities =
    user.platformRole === "SUPER_ADMIN" ||
    Boolean(
      membership.role?.permissions.some(
        ({ permission }) =>
          permission.key === "opportunities.create"
      )
    );

  const voiceNote = await prisma.customerVoiceNote.findFirst({
    where: {
      id: voiceNoteId,
      companyId,
    },
  });

  if (!voiceNote) {
    throw new Error("Voice note not found.");
  }

  if (!voiceNote.suggestedTaskTitle) {
    throw new Error("This voice note does not contain a suggested task.");
  }

  const existingTask = await prisma.commercialTask.findFirst({
    where: {
      companyId,
      customerId: voiceNote.customerId,
      title: voiceNote.suggestedTaskTitle,
      status: "OPEN",
    },
  });

    if (!existingTask) {
    if (!canCreateTasks) {
      throw new Error(
        "You do not have permission to create commercial tasks."
      );
    }

    await prisma.commercialTask.create({
      data: {
        companyId,
        customerId: voiceNote.customerId,
        assignedMembershipId: membership.id,
        title: voiceNote.suggestedTaskTitle,
        description: voiceNote.suggestedTaskDescription,
        type: "VOICE_NOTE_FOLLOW_UP",
        priority: voiceNote.suggestedTaskPriority ?? "MEDIUM",
        status: "OPEN",
        dueDate: voiceNote.suggestedTaskDueDate,
      },
    });


    await prisma.customerTimelineEntry.create({
      data: {
        customerId: voiceNote.customerId,
        type: "TASK",
        title: "Commercial task created from voice note",
        description: voiceNote.suggestedTaskTitle,
        reference: `VOICE-${voiceNote.id}`,
        createdBy: user.name ?? user.email,
      },
    });
    }

if (voiceNote.opportunitySummary) {
  const existingOpportunity =
    await prisma.commercialOpportunity.findFirst({
      where: {
        companyId,
        customerId: voiceNote.customerId,
        title: voiceNote.opportunitySummary,
        status: "OPEN",
      },
    });

    if (!existingOpportunity) {
    if (!canCreateOpportunities) {
      throw new Error(
        "You do not have permission to create commercial opportunities."
      );
    }

    await prisma.commercialOpportunity.create({
      data: {
        companyId,
        customerId: voiceNote.customerId,
        ownerMembershipId: membership.id,
        title: voiceNote.opportunitySummary,
        stage: "QUALIFY",
        status: "OPEN",
        source: "VOICE_NOTE",
      },
    });
  }
}

  await prisma.customerVoiceNote.update({
    where: {
      id: voiceNote.id,
    },
    data: {
      taskApprovedAt: new Date(),
    },
  });

  revalidatePath(`/customers/${voiceNote.customerId}`);
  revalidatePath("/dashboard");
  revalidatePath("/opportunities");
}

    

 

