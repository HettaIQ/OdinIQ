import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const membership = user.memberships[0];

    if (!membership) {
      throw new Error("No active company membership found.");
    }

    const canManage =
      membership.role?.name === "Company Admin" ||
      membership.role?.name === "Accounts";

    if (!canManage) {
      return NextResponse.json(
        {
          error: "You do not have permission to create sales agents.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();
    const agentName = String(body?.agentName ?? "").trim();

    if (!agentName) {
      return NextResponse.json(
        {
          error: "Agent name is required.",
        },
        {
          status: 400,
        }
      );
    }

    const salesAgentRole = await prisma.role.findFirst({
      where: {
        companyId: membership.companyId,
        name: "Sales Agent",
      },
    });

    if (!salesAgentRole) {
      return NextResponse.json(
        {
          error: "Sales Agent role could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    const existingMemberships = await prisma.companyMembership.findMany({
  where: {
    companyId: membership.companyId,
    active: true,
  },
  include: {
    user: true,
    agentAliases: true,
  },
});

    const existingMatch = existingMemberships.find((item) => {
  const existingName = item.user.name.trim().toLowerCase();
  const existingAgentCode = item.agentCode?.trim().toLowerCase();
  const wanted = agentName.toLowerCase();

  const aliasMatch = item.agentAliases.some(
    (agentAlias) => agentAlias.alias.trim().toLowerCase() === wanted
  );

  return (
    existingName === wanted ||
    existingAgentCode === wanted ||
    aliasMatch
  );
});

    if (existingMatch) {
      return NextResponse.json({
        success: true,
        created: false,
        membershipId: existingMatch.id,
        name: existingMatch.user.name,
      });
    }

    const safeEmailName = agentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "");

    const generatedEmail = `${safeEmailName}.${Date.now()}@odiniq.local`;

    const createdUser = await prisma.user.create({
      data: {
        name: agentName,
        email: generatedEmail,
        active: true,
        memberships: {
          create: {
            companyId: membership.companyId,
            roleId: salesAgentRole.id,
            agentCode: agentName,
            active: true,
          },
        },
      },
      include: {
        memberships: true,
      },
    });

    const createdMembership = createdUser.memberships.find(
      (item) => item.companyId === membership.companyId
    );

    if (!createdMembership) {
      throw new Error("Created user membership could not be found.");
    }
await prisma.agentAlias.create({
  data: {
    companyId: membership.companyId,
    membershipId: createdMembership.id,
    alias: agentName,
  },
});
    return NextResponse.json({
      success: true,
      created: true,
      membershipId: createdMembership.id,
      name: createdUser.name,
    });
  } catch (error) {
    console.error("Create Sage agent failed:", error);

    return NextResponse.json(
      {
        error: "OdinIQ could not create this sales agent.",
      },
      {
        status: 500,
      }
    );
  }
}