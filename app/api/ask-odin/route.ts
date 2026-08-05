import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = String(body.question ?? "").trim();

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          answer: "Please enter a commercial question.",
        },
        { status: 400 }
      );
    }

    const agreements = await prisma.commercialAgreement.findMany({
      select: {
        id: true,
        customerName: true,
        agreementName: true,
        status: true,
        standardDiscount: true,
        rebatePercent: true,
        marketingBudget: true,
        marketingSpend: true,
        paymentTerms: true,
        creditLimit: true,
        startDate: true,
        endDate: true,
        renewalDate: true,
        noticePeriod: true,
        buyingGroup: true,
        documents: {
          select: {
            id: true,
            originalName: true,
            category: true,
          },
        },
      },
      orderBy: {
        customerName: "asc",
      },
    });

    const normalisedQuestion = question.toLowerCase();

    const agreement = agreements.find((item) => {
      const customer = item.customerName.toLowerCase();
      const agreementName = item.agreementName.toLowerCase();

      return (
        normalisedQuestion.includes(customer) ||
        normalisedQuestion.includes(agreementName)
      );
    });

    if (!agreement) {
      return NextResponse.json({
        success: true,
        answer:
          "I could not identify a customer agreement in that question. Try including the customer name, such as UKPS, MKM or NBG.",
      });
    }

    const customer = agreement.customerName;

    if (
      includesAny(normalisedQuestion, [
        "rebate",
        "rebates",
        "annual rebate",
      ])
    ) {
      return NextResponse.json({
        success: true,
        answer:
          agreement.rebatePercent === null
            ? `No rebate percentage has been recorded for ${customer}.`
            : `${customer}'s recorded rebate is ${formatPercent(
                agreement.rebatePercent
              )}.`,
        agreementId: agreement.id,
      });
    }

    if (
      includesAny(normalisedQuestion, [
        "discount",
        "discounts",
        "standard discount",
      ])
    ) {
      return NextResponse.json({
        success: true,
        answer:
          agreement.standardDiscount === null
            ? `No standard discount has been recorded for ${customer}.`
            : `${customer}'s recorded standard discount is ${formatPercent(
                agreement.standardDiscount
              )}.`,
        agreementId: agreement.id,
      });
    }

    if (
      includesAny(normalisedQuestion, [
        "marketing",
        "marketing budget",
        "budget left",
        "budget remaining",
        "remaining budget",
      ])
    ) {
      const budget = agreement.marketingBudget ?? 0;
      const spend = agreement.marketingSpend ?? 0;
      const remaining = budget - spend;

      if (agreement.marketingBudget === null) {
        return NextResponse.json({
          success: true,
          answer: `No marketing budget has been recorded for ${customer}.`,
          agreementId: agreement.id,
        });
      }

      return NextResponse.json({
        success: true,
        answer: `${customer} has a marketing budget of ${formatCurrency(
          budget
        )}. Recorded spend is ${formatCurrency(
          spend
        )}, leaving ${formatCurrency(remaining)} remaining.`,
        agreementId: agreement.id,
      });
    }

    if (
      includesAny(normalisedQuestion, [
        "renew",
        "renewal",
        "expire",
        "expiry",
        "end date",
      ])
    ) {
      if (agreement.renewalDate) {
        return NextResponse.json({
          success: true,
          answer: `${customer}'s next renewal date is ${formatDate(
            agreement.renewalDate
          )}.`,
          agreementId: agreement.id,
        });
      }

      if (agreement.endDate) {
        return NextResponse.json({
          success: true,
          answer: `${customer}'s agreement ends on ${formatDate(
            agreement.endDate
          )}. No separate renewal date has been recorded.`,
          agreementId: agreement.id,
        });
      }

      return NextResponse.json({
        success: true,
        answer: `No expiry or renewal date has been recorded for ${customer}.`,
        agreementId: agreement.id,
      });
    }

    if (
      includesAny(normalisedQuestion, [
        "payment",
        "payment terms",
        "terms",
      ])
    ) {
      return NextResponse.json({
        success: true,
        answer: agreement.paymentTerms
          ? `${customer}'s recorded payment terms are ${agreement.paymentTerms}.`
          : `No payment terms have been recorded for ${customer}.`,
        agreementId: agreement.id,
      });
    }

    if (
      includesAny(normalisedQuestion, [
        "notice",
        "notice period",
        "give notice",
      ])
    ) {
      return NextResponse.json({
        success: true,
        answer: agreement.noticePeriod
          ? `${customer}'s recorded notice period is ${agreement.noticePeriod}.`
          : `No notice period has been recorded for ${customer}.`,
        agreementId: agreement.id,
      });
    }

    if (
      includesAny(normalisedQuestion, [
        "document",
        "documents",
        "files",
        "contract",
      ])
    ) {
      return NextResponse.json({
        success: true,
        answer:
          agreement.documents.length === 0
            ? `No documents have been uploaded for ${customer}.`
            : `${agreement.documents.length} document${
                agreement.documents.length === 1 ? "" : "s"
              } are stored for ${customer}: ${agreement.documents
                .map((document) => document.originalName)
                .join(", ")}.`,
        agreementId: agreement.id,
      });
    }

    return NextResponse.json({
      success: true,
      answer: buildAgreementSummary(agreement),
      agreementId: agreement.id,
    });
  } catch (error) {
    console.error("Ask Odin failed:", error);

    return NextResponse.json(
      {
        success: false,
        answer: "Odin could not retrieve the commercial information.",
        error:
          error instanceof Error ? error.message : "Unknown Ask Odin error.",
      },
      { status: 500 }
    );
  }
}

function includesAny(question: string, terms: string[]): boolean {
  return terms.some((term) => question.includes(term));
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function formatDate(value: Date): string {
  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function buildAgreementSummary(agreement: {
  customerName: string;
  agreementName: string;
  status: string;
  standardDiscount: number | null;
  rebatePercent: number | null;
  marketingBudget: number | null;
  marketingSpend: number | null;
  paymentTerms: string | null;
  renewalDate: Date | null;
}): string {
  const details = [
    `${agreement.customerName}'s ${agreement.agreementName} is currently ${agreement.status}.`,
  ];

  if (agreement.standardDiscount !== null) {
    details.push(
      `Standard discount: ${formatPercent(agreement.standardDiscount)}.`
    );
  }

  if (agreement.rebatePercent !== null) {
    details.push(`Rebate: ${formatPercent(agreement.rebatePercent)}.`);
  }

  if (agreement.marketingBudget !== null) {
    const remaining =
      agreement.marketingBudget - (agreement.marketingSpend ?? 0);

    details.push(
      `Marketing budget remaining: ${formatCurrency(remaining)}.`
    );
  }

  if (agreement.paymentTerms) {
    details.push(`Payment terms: ${agreement.paymentTerms}.`);
  }

  if (agreement.renewalDate) {
    details.push(
      `Renewal date: ${formatDate(agreement.renewalDate)}.`
    );
  }

  return details.join(" ");
}