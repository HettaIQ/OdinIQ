import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function GET() {
  try {
    const user = await requireAuth();
    const membership = user.memberships[0];

    if (!membership) {
      throw new Error("No active company membership found.");
    }

    const agents = await prisma.companyMembership.findMany({
      where: {
        companyId: membership.companyId,
        active: true,
        role: {
          name: "Sales Agent",
        },
        user: {
          active: true,
        },
      },
      include: {
        user: true,
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    return NextResponse.json({
      success: true,
      agents: agents.map((agent) => ({
        membershipId: agent.id,
        name: agent.user.name,
      })),
    });
  } catch (error) {
    console.error("Load OdinIQ agents failed:", error);

    return NextResponse.json(
      {
        error: "OdinIQ could not load the sales agents.",
      },
      {
        status: 500,
      }
    );
  }
}