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
        permission.key === "imports.manage",
    ),
  );

    if (!canManage) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to match sales agents.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const sageAgentName =
      String(
        body?.sageAgentName ?? ""
      ).trim();

    const membershipId =
      Number(
        body?.membershipId
      );

    if (!sageAgentName) {
      return NextResponse.json(
        {
          error:
            "Sage agent name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(
        membershipId
      ) ||
      membershipId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Please select an existing OdinIQ sales agent.",
        },
        {
          status: 400,
        }
      );
    }

    const selectedMembership =
      await prisma.companyMembership.findFirst({
        where: {
          id: membershipId,
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
      });

    if (!selectedMembership) {
      return NextResponse.json(
        {
          error:
            "The selected OdinIQ sales agent could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    const existingAlias =
      await prisma.agentAlias.findFirst({
        where: {
          companyId,
          alias: sageAgentName,
        },
        include: {
          membership: {
            include: {
              user: true,
            },
          },
        },
      });

    if (
      existingAlias &&
      existingAlias.membershipId !==
        selectedMembership.id
    ) {
      return NextResponse.json(
        {
          error:
            `${sageAgentName} is already matched to ${existingAlias.membership.user.name}.`,
        },
        {
          status: 409,
        }
      );
    }

    if (!existingAlias) {
      await prisma.agentAlias.create({
        data: {
          companyId,
          membershipId:
            selectedMembership.id,
          alias:
            sageAgentName,
        },
      });
    }

    return NextResponse.json({
      success: true,
      sageAgentName,
      membershipId:
        selectedMembership.id,
      agentName:
        selectedMembership
          .user.name,
    });
  } catch (error) {
    console.error(
      "Match Sage agent failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "OdinIQ could not match this Sage agent.",
      },
      {
        status: 500,
      }
    );
  }
}