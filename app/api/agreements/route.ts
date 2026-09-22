import { NextResponse } from "next/server";

import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";
import { prisma } from "@/lib/prisma";

function optionalText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function optionalNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function optionalDate(value: unknown): Date | null {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  const date = new Date(`${text}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: Request) {
  try {
    const context =
  await getApiCompanyContext();

if (
  context.status ===
  "UNAUTHENTICATED"
) {
  return NextResponse.json(
    {
      success: false,
      message:
        "You must be signed in.",
    },
    { status: 401 }
  );
}

if (
  context.status ===
  "NO_COMPANY"
) {
  return NextResponse.json(
    {
      success: false,
      message:
        "No active company membership was found.",
    },
    { status: 403 }
  );
}

const {
  user,
  membership,
  companyId,
} = context;

const canManageAgreements =
  user.platformRole === "SUPER_ADMIN" ||
  Boolean(
    membership.role?.permissions.some(
      ({ permission }) =>
        permission.key === "agreements.manage",
    ),
  );

if (!canManageAgreements) {
  return NextResponse.json(
    {
      success: false,
      message:
        "You do not have permission to create commercial agreements.",
    },
    {
      status: 403,
    },
  );
}

    const body = await request.json();

    const customerName = String(body.customerName ?? "").trim();
    const agreementName = String(body.agreementName ?? "").trim();

    if (!customerName || !agreementName) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer name and agreement name are required.",
        },
        { status: 400 }
      );
    }

    const agreement = await prisma.commercialAgreement.create({
      data: {
        companyId,
        customerName,
        agreementName,
        agreementType: optionalText(body.agreementType),
        status: optionalText(body.status) ?? "Active",

        startDate: optionalDate(body.startDate),
        endDate: optionalDate(body.endDate),
        renewalDate: optionalDate(body.renewalDate),
        noticePeriod: optionalText(body.noticePeriod),

        accountManager: optionalText(body.accountManager),
        buyingGroup: optionalText(body.buyingGroup),

        standardDiscount: optionalNumber(body.standardDiscount),
        rebatePercent: optionalNumber(body.rebatePercent),

        paymentTerms: optionalText(body.paymentTerms),
        creditLimit: optionalNumber(body.creditLimit),

        marketingBudget: optionalNumber(body.marketingBudget),
        marketingSpend: 0,

        notes: optionalText(body.notes),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Commercial agreement saved successfully.",
        agreement,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Agreement creation failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "The commercial agreement could not be saved.",
        error:
          error instanceof Error
            ? error.message
            : "Unknown agreement error.",
      },
      { status: 500 }
    );
  }
}