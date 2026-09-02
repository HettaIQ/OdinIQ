import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/currentUser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

const question = String(body.question ?? "").trim();

const customerId =
  body.customerId !== undefined && body.customerId !== null
    ? Number(body.customerId)
    : null;

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          answer: "Please enter a commercial question.",
        },
        { status: 400 }
      );
    }

  const currentUser = await getCurrentUser();

if (!currentUser || !currentUser.active) {
  return NextResponse.json(
    {
      success: false,
      answer: "You must be signed in to use Odin.",
    },
    { status: 401 }
  );
}

const membership = currentUser.memberships[0];

if (!membership) {
  return NextResponse.json(
    {
      success: false,
      answer: "No active company membership was found.",
    },
    { status: 403 }
  );
}
const isAgent =
  membership.role?.name === "Agent" ||
  membership.role?.name === "Sales Agent";

if (customerId !== null && Number.isInteger(customerId)) {
  const customer = await prisma.customer.findFirst({
  where: {
    id: customerId,
    companyId: membership.companyId,
    ...(isAgent
      ? {
          assignedMembershipId: membership.id,
        }
      : {}),
  },
  include: {
    timelineEntries: {
      orderBy: {
        occurredAt: "desc",
      },
      take: 10,
    },
  },
});

  if (!customer) {
    return NextResponse.json(
      {
        success: false,
        answer: "I could not find that customer record.",
      },
      { status: 404 }
    );
  }

  const normalisedQuestion = question.toLowerCase();

  const creditLimit = customer.creditLimit ?? 0;
  const currentBalance = customer.currentBalance ?? 0;
  const creditUsed =
    creditLimit > 0 ? (currentBalance / creditLimit) * 100 : 0;

  if (
    includesAny(normalisedQuestion, [
      "credit",
      "credit position",
      "credit risk",
      "balance",
      "exposure",
    ])
  ) {
    if (isAgent) {
  return NextResponse.json({
    success: false,
    answer:
      "Credit limits, balances and credit exposure are not available to sales agents.",
    customerId: customer.id,
  });
}
    return NextResponse.json({
      success: true,
      answer:
        creditLimit > 0
          ? `${customer.name} has a credit limit of ${formatCurrency(
              creditLimit
            )} and a current balance of ${formatCurrency(
              currentBalance
            )}. Credit utilisation is ${creditUsed.toFixed(
              1
            )}%.`
          : `No credit limit has been recorded for ${customer.name}.`,
      customerId: customer.id,
    });
  }

  if (
    includesAny(normalisedQuestion, [
      "recent",
      "recent activity",
      "what happened",
      "timeline",
      "activity",
    ])
  ) {
    if (customer.timelineEntries.length === 0) {
      return NextResponse.json({
        success: true,
        answer: `No recent commercial activity has been recorded for ${customer.name}.`,
        customerId: customer.id,
      });
    }

    const activitySummary = customer.timelineEntries
      .slice(0, 5)
      .map((entry) => {
        const date = formatDate(entry.occurredAt);

        return `${date}: ${entry.title}${
          entry.description ? ` — ${entry.description}` : ""
        }`;
      })
      .join(" ");

    return NextResponse.json({
      success: true,
      answer: `Recent activity for ${customer.name}: ${activitySummary}`,
      customerId: customer.id,
    });
  }

  if (
    includesAny(normalisedQuestion, [
      "what should i do",
      "what should i do next",
      "next action",
      "next actions",
      "recommend",
      "recommendation",
      "recommendations",
    ])
  ) {
    const recommendations: string[] = [];

    if (!isAgent && creditUsed >= 80) {
      recommendations.push(
        `Review credit exposure before approving further orders because utilisation is ${creditUsed.toFixed(
          1
        )}%.`
      );
    }

    const recentCreditWarning = customer.timelineEntries.some(
      (entry) => entry.type === "CREDIT"
    );

    if (recentCreditWarning) {
      recommendations.push(
        "There is a recent credit warning on the commercial timeline."
      );
    }

    const recentQuote = customer.timelineEntries.find(
      (entry) => entry.type === "QUOTE"
    );

    if (recentQuote) {
      recommendations.push(
        `Follow up the recent quote${
          recentQuote.reference
            ? ` ${recentQuote.reference}`
            : ""
        }.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Review recent account activity and confirm the next commercial follow-up."
      );
    }

    return NextResponse.json({
      success: true,
      answer: `Recommended next actions for ${
        customer.name
      }: ${recommendations.join(" ")}`,
      customerId: customer.id,
    });
  }

  return NextResponse.json({
    success: true,
    answer: buildCustomerSummary(customer, isAgent),
    customerId: customer.id,
  });
}
const allowedCustomerNames = isAgent
  ? (
      await prisma.customer.findMany({
        where: {
          companyId: membership.companyId,
          assignedMembershipId: membership.id,
        },
        select: {
          name: true,
        },
      })
    ).map((customer) => customer.name)
  : [];

    const agreements = await prisma.commercialAgreement.findMany({
  where: isAgent
    ? {
        customerName: {
          in: allowedCustomerNames,
        },
      }
    : undefined,

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
function buildCustomerSummary(
  customer: {
    name: string;
    accountCode: string;
    buyingGroup: string | null;
    customerType: string | null;
    paymentTerms: string | null;
    creditLimit: number | null;
    currentBalance: number | null;
    town: string | null;
    timelineEntries: {
      title: string;
      type: string;
      occurredAt: Date;
    }[];
  },
  isAgent: boolean
): string {
  const details = [
    `${customer.name} is account ${customer.accountCode}.`,
  ];

  if (customer.customerType) {
    details.push(`Customer type: ${customer.customerType}.`);
  }

  if (customer.buyingGroup) {
    details.push(`Buying group: ${customer.buyingGroup}.`);
  }

  if (customer.paymentTerms) {
    details.push(`Payment terms: ${customer.paymentTerms}.`);
  }

  if (!isAgent && customer.creditLimit !== null) {
    const balance = customer.currentBalance ?? 0;
    const utilisation =
      customer.creditLimit > 0
        ? (balance / customer.creditLimit) * 100
        : 0;

    details.push(
      `Credit limit: ${formatCurrency(
        customer.creditLimit
      )}. Current balance: ${formatCurrency(
        balance
      )}. Utilisation: ${utilisation.toFixed(1)}%.`
    );
  }

  if (customer.town) {
    details.push(`Location: ${customer.town}.`);
  }

  if (customer.timelineEntries.length > 0) {
    details.push(
      `Most recent activity: ${customer.timelineEntries[0].title}.`
    );
  }

  return details.join(" ");
}