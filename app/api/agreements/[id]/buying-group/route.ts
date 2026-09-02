import {
  NextResponse,
} from "next/server";

import {
  requireAuth,
} from "@/lib/auth/requireAuth";

import {
  prisma,
} from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type BuyingGroupBody = {
  buyingGroup?: string;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const user =
      await requireAuth();

    const membership =
      user.memberships[0];

    if (!membership) {
      return NextResponse.json(
        {
          error:
            "No active company membership found.",
        },
        {
          status: 403,
        }
      );
    }

    const roleName =
      membership.role?.name ?? "";

    const allowed =
      roleName ===
        "Company Admin" ||
      roleName ===
        "Accounts";

    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to edit commercial agreements.",
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
      (await request.json()) as BuyingGroupBody;

    const buyingGroup =
      String(
        body.buyingGroup ?? ""
      ).trim();

    /*
     * Older OdinIQ agreements may have
     * companyId = null.
     *
     * Allow the current company's agreement
     * OR a legacy unassigned agreement.
     */
    const agreement =
      await prisma.commercialAgreement.findFirst({
        where: {
          id: agreementId,

          OR: [
            {
              companyId:
                membership.companyId,
            },

            {
              companyId: null,
            },
          ],
        },

        select: {
          id: true,
          companyId: true,
        },
      });

    if (!agreement) {
      return NextResponse.json(
        {
          error:
            "Agreement not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * When editing an old unassigned
     * agreement, attach it to the current
     * company at the same time.
     */
    const updatedAgreement =
      await prisma.commercialAgreement.update({
        where: {
          id:
            agreement.id,
        },

        data: {
          buyingGroup:
            buyingGroup ||
            null,

          companyId:
            agreement.companyId ??
            membership.companyId,
        },
      });

    return NextResponse.json({
      success: true,

      agreement:
        updatedAgreement,
    });
  } catch (error) {
    console.error(
      "Saving agreement buying group failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Buying group could not be saved.",
      },
      {
        status: 500,
      }
    );
  }
}