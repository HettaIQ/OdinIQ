import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
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

    // Temporary sample analysis data.
    // We will replace this with real document analysis later.
    const analysis = {
      agreementId,
      discount: "53%",
      rebate: "12%",
      paymentTerms: "60 EOM",
      renewalDate: "01/01/2027",
      noticePeriod: "60 days",
    };

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Agreement analysis failed:", error);

    return NextResponse.json(
      { error: "The agreement could not be analysed." },
      { status: 500 }
    );
  }
}