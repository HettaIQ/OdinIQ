import { NextResponse } from "next/server";

import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";
import { applyCommercialTerms } from "@/lib/odin/applyCommercialTerms";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ApplyTermsBody = {
  discount: string;
  rebate: string;
  paymentTerms: string;
  renewalDate: string;
  noticePeriod: string;
  buyingGroup?: string;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
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
        "No active company membership was found.",
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

    const canApplyTerms =
      user.platformRole ===
        "SUPER_ADMIN" ||
      membership.role?.name ===
        "Company Admin" ||
      membership.role?.name ===
        "Accounts";

    if (!canApplyTerms) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to apply commercial terms.",
        },
        {
          status: 403,
        }
      );
    }

    const { id } =
      await context.params;

    const agreementId =
      Number(id);

    if (
      !Number.isInteger(
        agreementId
      ) ||
      agreementId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid agreement ID.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      (await request.json()) as ApplyTermsBody;

    const updatedAgreement =
      await applyCommercialTerms({
        agreementId,

        companyId:
          companyId,

        discount:
          body.discount,

        rebate:
          body.rebate,

        paymentTerms:
          body.paymentTerms,

        renewalDate:
          body.renewalDate,

        noticePeriod:
          body.noticePeriod,

        buyingGroup:
          body.buyingGroup,
      });

    return NextResponse.json({
      success: true,
      agreement:
        updatedAgreement,
    });
  } catch (error) {
    console.error(
      "Applying commercial terms failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "The commercial terms could not be saved.",
      },
      {
        status: 500,
      }
    );
  }
}
