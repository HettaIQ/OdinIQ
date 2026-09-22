import { NextResponse } from "next/server";

import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";
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
    const companyContext =
      await getApiCompanyContext();

    if (
      companyContext.status ===
      "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
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
          success: false,
          message:
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
        "You do not have permission to move agreement documents.",
    },
    {
      status: 403,
    },
  );
}

    const { documentId } =
      await context.params;

    const parsedDocumentId =
      Number(documentId);

    const body =
      await request.json();

    const agreementId =
      Number(body.agreementId);

    if (
      !Number.isInteger(
        parsedDocumentId
      ) ||
      parsedDocumentId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid document ID.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(
        agreementId
      ) ||
      agreementId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid agreement ID.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Check the destination agreement belongs
     * to the currently active company.
     */
    const agreement =
      await prisma.commercialAgreement.findFirst({
        where: {
          id: agreementId,
          companyId,
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
          message:
            "The selected agreement could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Check the document exists AND that its
     * current agreement belongs to the same
     * active company.
     *
     * This prevents a document belonging to
     * another OdinIQ tenant from being moved.
     */
    const existingDocument =
      await prisma.agreementDocument.findFirst({
        where: {
          id: parsedDocumentId,
          agreement: {
            companyId,
          },
        },
        select: {
          id: true,
          agreementId: true,
        },
      });

    if (!existingDocument) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The document could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Both the source document and destination
     * agreement have now been verified as
     * belonging to the active company.
     */
    const document =
      await prisma.agreementDocument.update({
        where: {
          id:
            existingDocument.id,
        },
        data: {
          agreementId:
            agreement.id,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        `Document moved to ${agreement.customerName}.`,
      document,
    });
  } catch (error) {
    console.error(
      "Document move failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "The document could not be moved.",
        error:
          error instanceof Error
            ? error.message
            : "Unknown document move error.",
      },
      {
        status: 500,
      }
    );
  }
}