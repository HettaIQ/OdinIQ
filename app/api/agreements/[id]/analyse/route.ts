import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";

import { prisma } from "@/lib/prisma";
import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    { status: 401 }
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
    { status: 403 }
  );
}

const {
  companyId,
} = companyContext;

    const { id } = await context.params;
    const agreementId = Number(id);

    if (!Number.isInteger(agreementId) || agreementId <= 0) {
      return NextResponse.json(
        {
          error: "Invalid agreement ID.",
        },
        { status: 400 }
      );
    }

    const agreement = await prisma.commercialAgreement.findFirst({
      where: {
  id: agreementId,
  companyId,
},
      include: {
        documents: {
          orderBy: {
            id: "desc",
          },
          take: 1,
        },
      },
    });

    if (!agreement) {
      return NextResponse.json(
        {
          error: "Agreement not found.",
        },
        { status: 404 }
      );
    }

    const document = agreement.documents[0];

    if (!document) {
      return NextResponse.json(
        {
          error: "No document has been attached to this agreement.",
        },
        { status: 404 }
      );
    }

    const extension = path
      .extname(document.originalName)
      .toLowerCase();

    if (extension !== ".pdf") {
      return NextResponse.json(
        {
          error:
            "Automatic agreement analysis currently supports PDF documents only.",
        },
        { status: 400 }
      );
    }

    const filePath = path.join(
      process.cwd(),
      "public",
      "uploads",
      "agreements",
      String(agreement.id),
      document.fileName
    );

    const fileBuffer = await readFile(filePath);

    const parser = new PDFParse({
      data: fileBuffer,
    });

    let documentText = "";

    try {
      const result = await parser.getText();
      documentText = result.text.trim();
    } finally {
      await parser.destroy();
    }
const needsScannedPdfAnalysis =
  documentText.length < 200;

const documentInput = needsScannedPdfAnalysis
  ? [
      {
        type: "input_file" as const,
        filename: document.originalName,
        file_data: `data:application/pdf;base64,${fileBuffer.toString("base64")}`,
      },
    ]
  : [
      {
        type: "input_text" as const,
        text: documentText,
      },
    ];

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "system",
          content:
            `You are OdinIQ, a commercial agreement analysis assistant.

Read the entire supplied agreement carefully, including scanned pages.

Extract only commercial terms explicitly supported by the document.

IMPORTANT EXTRACTION RULES:

DISCOUNT:
- Extract the standard trading discount from the PRICING TERMS section.
- "List less 50%" means a standard discount of 50%.
- Do not confuse standard discounts with promotional discounts,
  new-branch discounts, settlement discounts or special offers.

REBATE:
- Extract the standard recurring rebate.
- Prefer the explicitly labelled quarterly rebate when present.
- Do not confuse quarterly rebates with annual growth rebates.
- Annual rebate thresholds must be analysed separately.

PAYMENT TERMS:
- Extract the supplier's standard invoice payment terms.
- Do not use rebate collection or rebate settlement terms
  as invoice payment terms.
- Return null if invoice payment terms are not established.

RENEWAL DATE:
- Return an explicit contractual renewal date only.
- Do not infer one from signature dates or pricing periods.

NOTICE PERIOD:
- Extract the notice period for terminating or renewing the agreement.
- Do not confuse it with price increase notification requirements.
- Return null if no contractual termination notice period is stated.

GENERAL:
- Never invent missing terms.
- Return null when a term cannot be established.
- Discount and rebate must be percentage strings, such as "50%" or "16%".
- Renewal dates must use DD/MM/YYYY.
- Return only the requested structured JSON.`
        },
       {
  role: "user",
  content: [
    {
      type: "input_text",
      text: [
        `Agreement customer: ${agreement.customerName}`,
        `Agreement name: ${agreement.agreementName}`,
        "Extract the commercial terms from the attached agreement.",
      ].join("\n"),
    },
    ...documentInput,
  ],
},
      ],
      text: {
        format: {
          type: "json_schema",
          name: "commercial_agreement_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              discount: {
                type: ["string", "null"],
              },
              rebate: {
                type: ["string", "null"],
              },
              paymentTerms: {
                type: ["string", "null"],
              },
              renewalDate: {
                type: ["string", "null"],
              },
              noticePeriod: {
                type: ["string", "null"],
              },
            },
            required: [
              "discount",
              "rebate",
              "paymentTerms",
              "renewalDate",
              "noticePeriod",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const analysis = JSON.parse(response.output_text);

    return NextResponse.json({
      agreementId: agreement.id,
      documentId: document.id,
      documentName: document.originalName,
      discount: analysis.discount,
      rebate: analysis.rebate,
      paymentTerms: analysis.paymentTerms,
      renewalDate: analysis.renewalDate,
      noticePeriod: analysis.noticePeriod,
    });
  } catch (error) {
    console.error("Agreement analysis failed:", error);

    return NextResponse.json(
      {
        error: "The agreement could not be analysed.",
        details:
          error instanceof Error
            ? error.message
            : "Unknown agreement analysis error.",
      },
      { status: 500 }
    );
  }
}