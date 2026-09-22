import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";
import {
  getCustomerImportSession,
  saveCustomerImportAllocations,
} from "@/lib/customerImportSession";

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
            "You do not have permission to change customer allocations.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const membershipId =
      Number(body?.membershipId);

    const effectiveFrom =
      String(
        body?.effectiveFrom ?? ""
      ).trim();

    const accountCodes =
      Array.isArray(
        body?.accountCodes
      )
        ? body.accountCodes
            .map(
              (value: unknown) =>
                String(
                  value ?? ""
                ).trim()
            )
            .filter(Boolean)
        : [];

    if (!effectiveFrom) {
      return NextResponse.json(
        {
          error:
            "Please select the date this allocation became effective.",
        },
        {
          status: 400,
        }
      );
    }

    const effectiveDate =
      new Date(
        `${effectiveFrom}T00:00:00`
      );

    if (
      Number.isNaN(
        effectiveDate.getTime()
      )
    ) {
      return NextResponse.json(
        {
          error:
            "The effective date is not valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      accountCodes.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Please select at least one customer account.",
        },
        {
          status: 400,
        }
      );
    }

    const session =
      getCustomerImportSession(
        companyId
      );

    if (!session) {
      return NextResponse.json(
        {
          error:
            "Customer import session not found. Please upload the Sage customer file again.",
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
          user: {
            active: true,
          },
        },
        include: {
          user: true,
          role: true,
        },
      });

    if (!selectedMembership) {
      return NextResponse.json(
        {
          error:
            "The selected OdinIQ user could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    saveCustomerImportAllocations(
      companyId,
      accountCodes.map(
        (
          accountCode: string
        ) => ({
          accountCode,
          membershipId:
            selectedMembership.id,
          agentName:
            selectedMembership
              .user.name,
          effectiveFrom,
        })
      )
    );

    return NextResponse.json({
      success: true,
      allocatedCount:
        accountCodes.length,
      agent: {
        membershipId:
          selectedMembership.id,
        name:
          selectedMembership
            .user.name,
      },
      effectiveFrom,
    });
  } catch (error) {
    console.error(
      "Customer allocation failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "OdinIQ could not save the customer allocation.",
      },
      {
        status: 500,
      }
    );
  }
}