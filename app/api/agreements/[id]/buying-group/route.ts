import {
  NextResponse,
} from "next/server";

import {
  getApiCompanyContext,
} from "@/lib/auth/getApiCompanyContext";

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
      error:
        "No active company membership found.",
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
      error:
        "You do not have permission to edit commercial agreements.",
    },
    {
      status: 403,
    },
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
     * Only allow an agreement belonging
     * to the user's current company.
     */
    const agreement =
      await prisma.commercialAgreement.findFirst({
        where: {
  id: agreementId,
  companyId,
},

        select: {
          id: true,
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