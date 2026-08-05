import { NextResponse } from "next/server";
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
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const agreementId = Number(id);

    if (!Number.isInteger(agreementId) || agreementId <= 0) {
      return NextResponse.json(
        { error: "Invalid agreement ID." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as ApplyTermsBody;

    const updatedAgreement = await applyCommercialTerms({
      agreementId,
      discount: body.discount,
      rebate: body.rebate,
      paymentTerms: body.paymentTerms,
      renewalDate: body.renewalDate,
      noticePeriod: body.noticePeriod,
    });

    return NextResponse.json({
      success: true,
      agreement: updatedAgreement,
    });
  } catch (error) {
    console.error("Applying commercial terms failed:", error);

    return NextResponse.json(
      { error: "The commercial terms could not be saved." },
      { status: 500 }
    );
  }
}