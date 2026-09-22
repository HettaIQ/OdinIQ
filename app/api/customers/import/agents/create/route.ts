import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";

export async function POST(request: Request) {
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
  user,
  membership,
  companyId,
} = companyContext;

const canManage =
  user.platformRole === "SUPER_ADMIN" ||
  Boolean(
    membership.role?.permissions.some(
      ({ permission }) =>
        permission.key === "users.manage",
    ),
  );

    if (!canManage) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to create sales agents.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const agentName =
      String(
        body?.agentName ?? ""
      ).trim();

    if (!agentName) {
      return NextResponse.json(
        {
          error:
            "Agent name is required.",
        },
        {
          status: 400,
        }
      );
    }

    const salesAgentRole =
      await prisma.role.findFirst({
        where: {
          companyId,
          name: "Sales Agent",
        },
      });

    if (!salesAgentRole) {
      return NextResponse.json(
        {
          error:
            "Sales Agent role could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    const existingMemberships =
      await prisma.companyMembership.findMany({
        where: {
          companyId,
          active: true,
        },
        include: {
          user: true,
          agentAliases: true,
        },
      });

    const existingMatch =
      existingMemberships.find(
        (item) => {
          const existingName =
            item.user.name
              .trim()
              .toLowerCase();

          const existingAgentCode =
            item.agentCode
              ?.trim()
              .toLowerCase();

          const wanted =
            agentName.toLowerCase();

          const aliasMatch =
            item.agentAliases.some(
              (agentAlias) =>
                agentAlias.alias
                  .trim()
                  .toLowerCase() ===
                wanted
            );

          return (
            existingName ===
              wanted ||
            existingAgentCode ===
              wanted ||
            aliasMatch
          );
        }
      );

    if (existingMatch) {
      return NextResponse.json({
        success: true,
        created: false,
        membershipId:
          existingMatch.id,
        name:
          existingMatch.user.name,
      });
    }

    const safeEmailName =
      agentName
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          "."
        )
        .replace(
          /^\.+|\.+$/g,
          ""
        );

    const generatedEmail =
      `${safeEmailName}.${Date.now()}@odiniq.local`;

    const createdUser =
      await prisma.user.create({
        data: {
          name: agentName,
          email: generatedEmail,
          active: true,

          memberships: {
            create: {
              companyId,
              roleId:
                salesAgentRole.id,
              agentCode:
                agentName,
              active: true,
            },
          },
        },
        include: {
          memberships: true,
        },
      });

    const createdMembership =
      createdUser.memberships.find(
        (item) =>
          item.companyId ===
          companyId
      );

    if (!createdMembership) {
      throw new Error(
        "Created user membership could not be found."
      );
    }

    await prisma.agentAlias.create({
      data: {
        companyId,
        membershipId:
          createdMembership.id,
        alias: agentName,
      },
    });

    return NextResponse.json({
      success: true,
      created: true,
      membershipId:
        createdMembership.id,
      name:
        createdUser.name,
    });
  } catch (error) {
    console.error(
      "Create Sage agent failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "OdinIQ could not create this sales agent.",
      },
      {
        status: 500,
      }
    );
  }
}