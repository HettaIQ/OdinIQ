import { NextResponse } from "next/server";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

type CancelStocktakeBody = {
  sessionId?: number;
};

export async function POST(
  request: Request
) {
  try {
    const { companyId } =
      await requireCompanyContext();

    const body =
      (await request.json()) as CancelStocktakeBody;

    const sessionId =
      Number(body.sessionId);

    if (
      !Number.isInteger(
        sessionId
      ) ||
      sessionId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid stocktake session.",
        },
        {
          status: 400,
        }
      );
    }

    const session =
      await prisma.stocktakeSession.findFirst({
        where: {
          id: sessionId,
          companyId,
        },

        select: {
          id: true,
          reference: true,
          status: true,
        },
      });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Stocktake session not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      session.status !== "OPEN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Stocktake ${session.reference} cannot be cancelled because its status is ${session.status}.`,
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Use updateMany with the OPEN
     * condition as a final safety check.
     *
     * This prevents an OPEN stocktake
     * being cancelled if another request
     * has changed its status between the
     * read above and this update.
     */
    const cancelled =
      await prisma.stocktakeSession.updateMany({
        where: {
          id: session.id,
          companyId,
          status: "OPEN",
        },

        data: {
          status: "CANCELLED",
        },
      });

    if (
      cancelled.count !== 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The stocktake status changed before it could be cancelled. Refresh the page and try again.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      reference:
        session.reference,
      status: "CANCELLED",
      message:
        `Stocktake ${session.reference} has been cancelled.`,
    });
  } catch (error) {
    console.error(
      "Cancel stocktake error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to cancel the stocktake.",
      },
      {
        status: 500,
      }
    );
  }
}