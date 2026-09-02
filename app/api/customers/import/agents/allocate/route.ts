import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/requireAuth";
import {
  getCustomerImportSession,
  saveCustomerImportAllocations,
} from "@/lib/customerImportSession";

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
          error: "You do not have permission to change customer allocations.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const membershipId = Number(body?.membershipId);
const effectiveFrom = String(body?.effectiveFrom ?? "").trim();

const accountCodes = Array.isArray(body?.accountCodes)
  ? body.accountCodes
      .map((value: unknown) => String(value ?? "").trim())
      .filter(Boolean)
  : [];

   if (!effectiveFrom) {
  return NextResponse.json(
    {
      error: "Please select the date this allocation became effective.",
    },
    {
      status: 400,
    }
  );
}

const effectiveDate = new Date(`${effectiveFrom}T00:00:00`);

if (Number.isNaN(effectiveDate.getTime())) {
  return NextResponse.json(
    {
      error: "The effective date is not valid.",
    },
    {
      status: 400,
    }
  );
}

    if (accountCodes.length === 0) {
      return NextResponse.json(
        {
          error: "Please select at least one customer account.",
        },
        {
          status: 400,
        }
      );
    }

    const session = getCustomerImportSession(membership.companyId);

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

    const selectedMembership = await prisma.companyMembership.findFirst({
      where: {
        id: membershipId,
        companyId: membership.companyId,
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
          error: "The selected OdinIQ user could not be found.",
        },
        {
          status: 404,
        }
      );
    }
saveCustomerImportAllocations(
  membership.companyId,
  accountCodes.map((accountCode: string) => ({
    accountCode,
    membershipId: selectedMembership.id,
    agentName: selectedMembership.user.name,
    effectiveFrom,
  }))
);

return NextResponse.json({
  success: true,
  allocatedCount: accountCodes.length,
  agent: {
    membershipId: selectedMembership.id,
    name: selectedMembership.user.name,
  },
  effectiveFrom,
});
  } catch (error) {
    console.error("Customer allocation failed:", error);

    return NextResponse.json(
      {
        error: "OdinIQ could not save the customer allocation.",
      },
      {
        status: 500,
      }
    );
  }
}