import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";

export async function GET() {
  try {
    const companyContext =
      await getApiCompanyContext();

    if (
      companyContext.status ===
      "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        {
          error:
            "You must be signed in.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      companyContext.status ===
      "NO_COMPANY"
    ) {
      return NextResponse.json(
        {
          error:
            "No active company membership found.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      companyId,
    } = companyContext;

    const agents =
      await prisma.companyMembership.findMany({
        where: {
          companyId,
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
      agents: agents.map(
        (agent) => ({
          membershipId:
            agent.id,
          name:
            agent.user.name,
        })
      ),
    });
  } catch (error) {
    console.error(
      "Load OdinIQ agents failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "OdinIQ could not load the sales agents.",
      },
      {
        status: 500,
      }
    );
  }
}