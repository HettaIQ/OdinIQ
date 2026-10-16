import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";

const MAX_HEARTBEAT_SECONDS = 30;
const MAX_HEARTBEAT_GAP_MS = 45_000;

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorised" },
      { status: 401 }
    );
  }

  const companyId = session.activeCompanyId;

  if (!companyId) {
    return NextResponse.json(
      { error: "No active company" },
      { status: 403 }
    );
  }

  const membership =
    await prisma.companyMembership.findFirst({
      where: {
        userId: session.userId,
        companyId,
        active: true,
      },
      select: { id: true },
    });

  if (!membership) {
    return NextResponse.json(
      { error: "Company access denied" },
      { status: 403 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("active" in body) ||
    typeof body.active !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Invalid activity status" },
      { status: 400 }
    );
  }

  const active = body.active;
  const now = new Date();
console.log("[ODIN ACTIVITY]", {
  userId: session.userId,
  sessionId: session.id,
  active,
  time: now.toISOString(),
});
  const result = await prisma.$transaction(
    async (tx) => {
      const existing =
        await tx.odinUserActivity.findFirst({
          where: {
            sessionId: session.id,
            userId: session.userId,
            companyId,
            endedAt: null,
          },
          orderBy: { id: "desc" },
        });

      if (!existing) {
        await tx.odinUserActivity.create({
          data: {
            sessionId: session.id,
            userId: session.userId,
            companyId,
            startedAt: now,
            lastActivityAt: now,
          },
        });

        return { addedSeconds: 0, active };
      }

      const elapsedMs =
        now.getTime() -
        existing.lastActivityAt.getTime();

      const addedSeconds =
  active &&
  existing.wasActive &&
  elapsedMs > 0 &&
  elapsedMs <= MAX_HEARTBEAT_GAP_MS
    ? Math.min(
        MAX_HEARTBEAT_SECONDS,
        Math.floor(elapsedMs / 1000)
      )
    : 0;

      await tx.odinUserActivity.update({
        where: { id: existing.id },
        data: {
  lastActivityAt: now,
  wasActive: active,
  activeSeconds: {
    increment: addedSeconds,
  },
},
      });

      const activityDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate()
        )
      );

      await tx.odinUserActivityDaily.upsert({
        where: {
          userId_companyId_activityDate: {
            userId: session.userId,
            companyId,
            activityDate,
          },
        },
        create: {
          userId: session.userId,
          companyId,
          activityDate,
          activeSeconds: addedSeconds,
          lastActivityAt: now,
        },
        update: {
          activeSeconds: {
            increment: addedSeconds,
          },
          lastActivityAt: now,
        },
      });

      return { addedSeconds, active };
    }
  );

  return NextResponse.json({
    success: true,
    ...result,
  });
}