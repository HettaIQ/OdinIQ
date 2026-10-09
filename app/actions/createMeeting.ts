"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCompanyWriteContext } from "@/lib/auth/requireCompanyWriteContext";
import { prisma } from "@/lib/prisma";

export async function createMeeting(
  formData: FormData
) {
  const {
    membership,
    companyId,
  } = await requireCompanyWriteContext();

  if (!membership) {
    throw new Error(
      "No active company membership found."
    );
  }

const organiser =
  await prisma.companyMembership.findFirst({
    where: {
      id: membership.id,
      companyId,
      active: true,
    },
    include: {
      user: true,
    },
  });

if (!organiser) {
  throw new Error(
    "Meeting organiser was not found."
  );
}

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const customerIdValue = String(
    formData.get("customerId") ?? ""
  ).trim();

  const meetingType = String(
    formData.get("meetingType") ?? ""
  ).trim();

  const location = String(
    formData.get("location") ?? ""
  ).trim();

  const scheduledDate = String(
    formData.get("scheduledDate") ?? ""
  ).trim();

  const scheduledTime = String(
    formData.get("scheduledTime") ?? ""
  ).trim();

  const notes = String(
    formData.get("notes") ?? ""
  ).trim();

  const externalAttendeeNames = formData
    .getAll("externalAttendeeName")
    .map((value) =>
      String(value).trim()
    );

  const externalAttendeeEmails = formData
    .getAll("externalAttendeeEmail")
    .map((value) =>
      String(value).trim()
    );

  const internalMembershipIds = formData
    .getAll("internalMembershipId")
    .map((value) => Number(value))
    .filter((value) =>
      Number.isInteger(value)
    );

  if (!title) {
    throw new Error(
      "Meeting title is required."
    );
  }

  let customerId: number | null = null;

  if (customerIdValue) {
    const parsedCustomerId =
      Number(customerIdValue);

    if (
      !Number.isInteger(parsedCustomerId)
    ) {
      throw new Error(
        "A valid customer is required."
      );
    }

    const customer =
      await prisma.customer.findFirst({
        where: {
          id: parsedCustomerId,
          companyId,
        },
        select: {
          id: true,
        },
      });

    if (!customer) {
      throw new Error(
        "Selected customer was not found in the active company."
      );
    }

    customerId = customer.id;
  }

  let scheduledAt: Date | null = null;

  if (scheduledDate) {
    const dateTimeValue = scheduledTime
      ? `${scheduledDate}T${scheduledTime}:00`
      : `${scheduledDate}T09:00:00`;

    const parsedDate =
      new Date(dateTimeValue);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      throw new Error(
        "A valid meeting date and time is required."
      );
    }

    scheduledAt = parsedDate;
  }

  const uniqueInternalMembershipIds = [
    ...new Set(internalMembershipIds),
  ];

  const validInternalMemberships =
    uniqueInternalMembershipIds.length > 0
      ? await prisma.companyMembership.findMany({
          where: {
            id: {
              in: uniqueInternalMembershipIds,
            },
            companyId,
            active: true,
          },
          include: {
            user: true,
          },
        })
      : [];

  if (
    validInternalMemberships.length !==
    uniqueInternalMembershipIds.length
  ) {
    throw new Error(
      "One or more selected internal attendees are invalid."
    );
  }

  const externalAttendees =
    externalAttendeeNames
      .map((name, index) => ({
        name,
        email:
          externalAttendeeEmails[index] ??
          "",
      }))
      .filter(
        (attendee) =>
          Boolean(attendee.name)
      );

  const meeting =
    await prisma.meeting.create({
      data: {
        companyId,
        customerId,

        organisedByMembershipId:
          membership.id,

        title,

        meetingType:
          meetingType || null,

        location:
          location || null,

        status: "PLANNED",

        scheduledAt,

        notes: notes || null,

        attendees: {
          create: [
           {
  membershipId: organiser.id,
  name:
    organiser.user.name ||
    organiser.user.email,
  email: organiser.user.email,
  role: "Organiser",
  internal: true,
},

            ...validInternalMemberships
              .filter(
                (teamMember) =>
                  teamMember.id !==
                  membership.id
              )
              .map(
                (teamMember) => ({
                  membershipId:
                    teamMember.id,
                  name:
                    teamMember.user
                      .name ||
                    teamMember.user
                      .email,
                  email:
                    teamMember.user
                      .email,
                  role: null,
                  internal: true,
                })
              ),

            ...externalAttendees.map(
              (attendee) => ({
                membershipId: null,
                name: attendee.name,
                email:
                  attendee.email ||
                  null,
                role: null,
                internal: false,
              })
            ),
          ],
        },
      },
    });

  revalidatePath(
    "/commercial/meetings"
  );

  revalidatePath("/commercial");

  redirect(
    `/commercial/meetings/${meeting.id}`
  );
}
