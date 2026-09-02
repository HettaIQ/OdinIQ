"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";

export async function completeTask(taskId: number) {
  const user = await requireAuth();
  const membership = user.memberships[0];

  if (!membership) {
    throw new Error("No active company membership found.");
  }

  const task = await prisma.commercialTask.findFirst({
    where: {
      id: taskId,
      companyId: membership.companyId,
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

  const user = await requireAuth();

  const membership = await prisma.companyMembership.findFirst({
    where: {
      userId: user.id,
    },
  });

  if (!membership) {
    throw new Error("Company membership not found.");
  }

  const voiceNote = await prisma.customerVoiceNote.findFirst({
    where: {
      id: voiceNoteId,
      companyId: membership.companyId,
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
      companyId: membership.companyId,
      customerId: voiceNote.customerId,
      title: voiceNote.suggestedTaskTitle,
      status: "OPEN",
    },
  });

  if (!existingTask) {
    await prisma.commercialTask.create({
      data: {
        companyId: membership.companyId,
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
        companyId: membership.companyId,
        customerId: voiceNote.customerId,
        title: voiceNote.opportunitySummary,
        status: "OPEN",
      },
    });

  if (!existingOpportunity) {
    await prisma.commercialOpportunity.create({
      data: {
        companyId: membership.companyId,
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

    

 