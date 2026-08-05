import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { documentId } = await context.params;
    const parsedDocumentId = Number(documentId);

    const body = await request.json();
    const agreementId = Number(body.agreementId);

    if (!Number.isInteger(parsedDocumentId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid document ID.",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(agreementId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid agreement ID.",
        },
        { status: 400 }
      );
    }

    const agreement = await prisma.commercialAgreement.findUnique({
      where: {
        id: agreementId,
      },
      select: {
        id: true,
        customerName: true,
      },
    });

    if (!agreement) {
      return NextResponse.json(
        {
          success: false,
          message: "The selected agreement could not be found.",
        },
        { status: 404 }
      );
    }

    const existingDocument =
      await prisma.agreementDocument.findUnique({
        where: {
          id: parsedDocumentId,
        },
        select: {
          id: true,
        },
      });

    if (!existingDocument) {
      return NextResponse.json(
        {
          success: false,
          message: "The document could not be found.",
        },
        { status: 404 }
      );
    }

    const document = await prisma.agreementDocument.update({
      where: {
        id: parsedDocumentId,
      },
      data: {
        agreementId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Document moved to ${agreement.customerName}.`,
      document,
    });
  } catch (error) {
    console.error("Document move failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "The document could not be moved.",
        error:
          error instanceof Error
            ? error.message
            : "Unknown document move error.",
      },
      { status: 500 }
    );
  }
}