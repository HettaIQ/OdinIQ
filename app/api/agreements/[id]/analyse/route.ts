import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/requireAuth";

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
    const user = await requireAuth();

    const membership = user.memberships[0];

    if (!membership) {
      return NextResponse.json(
        {
          error: "No active company membership was found.",
        },
        { status: 403 }
      );
    }

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
        companyId: membership.companyId,
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

    if (!documentText) {
      return NextResponse.json(
        {
          error:
            "No readable text could be extracted from this PDF.",
        },
        { status: 400 }
      );
    }

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "system",
          content:
            "You are OdinIQ, a commercial agreement analysis assistant. Extract commercial terms only when they are explicitly supported by the supplied agreement text. Never invent or assume missing terms. Return null when a term cannot be established. Discount and rebate must be returned as percentage strings such as 53% or 12%. Payment terms should preserve the commercial wording where possible, for example 60 EOM or 30 days. Renewal date must be DD/MM/YYYY. Notice period should be concise, for example 60 days or 3 months.",
        },
        {
          role: "user",
          content: [
            `Agreement customer: ${agreement.customerName}`,
            `Agreement name: ${agreement.agreementName}`,
            "",
            "DOCUMENT TEXT:",
            documentText,
          ].join("\n"),
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