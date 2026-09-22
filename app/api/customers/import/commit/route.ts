import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getApiCompanyContext } from "@/lib/auth/getApiCompanyContext";
import { getCustomerImportSession } from "@/lib/customerImportSession";

type SageCustomerRow = Record<string, unknown>;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function field(
  row: SageCustomerRow,
  wantedHeader: string
) {
  const wanted = wantedHeader
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

  const matchingKey = Object.keys(row).find(
    (key) => {
      const normalisedKey = key
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ");

      return normalisedKey === wanted;
    }
  );

  return matchingKey
    ? row[matchingKey]
    : "";
}

function numberValue(value: unknown) {
  const cleaned = clean(value)
    .replace(/£/g, "")
    .replace(/,/g, "");

  if (!cleaned) {
    return null;
  }

  const number = Number(cleaned);

  return Number.isFinite(number)
    ? number
    : null;
}

function booleanValue(value: unknown) {
  const cleaned = clean(value)
    .toLowerCase();

  return (
    cleaned === "yes" ||
    cleaned === "true" ||
    cleaned === "1" ||
    cleaned === "y"
  );
}

export async function POST() {
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

const canManage =
  user.platformRole === "SUPER_ADMIN" ||
  Boolean(
    membership.role?.permissions.some(
      ({ permission }) =>
        permission.key === "imports.manage",
    ),
  );

    if (!canManage) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to import customer master data.",
        },
        {
          status: 403,
        }
      );
    }

    const session =
      getCustomerImportSession(
        companyId
      );

    if (!session) {
      return NextResponse.json(
        {
          error:
            "Customer import session not found. Please upload the Sage customer file again.",
        },
        {
          status: 400,
        }
      );
    }

    const teamMembers =
      await prisma.companyMembership.findMany({
        where: {
          companyId,
          active: true,
        },
        include: {
          user: true,
          role: true,
          agentAliases: true,
        },
      });

    const salesAgents =
      teamMembers.filter(
        (member) =>
          member.role?.name ===
          "Sales Agent"
      );

    function resolveAgent(
      tradeContact: string
    ) {
      if (!tradeContact) {
        return null;
      }

      const sageAgent =
        tradeContact
          .trim()
          .toLowerCase();

      return (
        salesAgents.find(
          (member) => {
            const userName =
              member.user.name
                ?.trim()
                .toLowerCase();

            const agentCode =
              member.agentCode
                ?.trim()
                .toLowerCase();

            const aliasMatch =
              member.agentAliases.some(
                (agentAlias) =>
                  agentAlias.alias
                    .trim()
                    .toLowerCase() ===
                  sageAgent
              );

            return (
              userName ===
                sageAgent ||
              agentCode ===
                sageAgent ||
              aliasMatch
            );
          }
        ) ?? null
      );
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let unmatchedAgentCustomers = 0;

    for (
      const row of session.rows
    ) {
      const accountCode =
        clean(
          field(row, "A/C")
        ).toUpperCase();

      const name =
        clean(
          field(row, "NAME")
        );

      if (
        !accountCode ||
        !name
      ) {
        skipped++;
        continue;
      }

      const tradeContact =
        clean(
          field(
            row,
            "TRADE CONTACT"
          )
        );

      const matchedAgent =
        resolveAgent(
          tradeContact
        );

      if (
        tradeContact &&
        !matchedAgent
      ) {
        unmatchedAgentCustomers++;
      }

      const buyingGroup =
        clean(
          field(
            row,
            "ANALYSIS1"
          )
        );

      const creditLimit =
        numberValue(
          field(
            row,
            "CREDIT LIMIT"
          )
        );

      const currentBalance =
        numberValue(
          field(
            row,
            "BALANCE"
          )
        );

      const discount =
        numberValue(
          field(
            row,
            "DISCOUNT"
          )
        );

      const email =
        clean(
          field(row, "EMAIL")
        ) ||
        clean(
          field(
            row,
            "EMAIL ADDRESS"
          )
        ) ||
        null;

      const phone =
        clean(
          field(
            row,
            "TELEPHONE"
          )
        ) ||
        clean(
          field(row, "PHONE")
        ) ||
        null;

      const website =
        clean(
          field(
            row,
            "WEBSITE"
          )
        ) || null;

      const addressLine =
        clean(
          field(
            row,
            "ADDRESS 1"
          )
        ) ||
        clean(
          field(
            row,
            "ADDRESS"
          )
        ) ||
        null;

      const town =
        clean(
          field(row, "TOWN")
        ) ||
        clean(
          field(row, "CITY")
        ) ||
        null;

      const postcode =
        clean(
          field(
            row,
            "POSTCODE"
          )
        ) ||
        clean(
          field(
            row,
            "POST CODE"
          )
        ) ||
        null;

      const paymentTerms =
        clean(
          field(
            row,
            "PAYMENT TERMS"
          )
        ) || null;

      const emailOrPrint =
        clean(
          field(
            row,
            "EMAIL OR PRINT"
          )
        ) || null;

      const accountOnHold =
        booleanValue(
          field(
            row,
            "ACCOUNT ON HOLD"
          )
        );

      const existing =
        await prisma.customer.findUnique({
          where: {
            companyId_accountCode: {
              companyId,
              accountCode,
            },
          },
          select: {
            id: true,
            assignedMembershipId:
              true,
          },
        });

      if (!existing) {
        await prisma.customer.create({
          data: {
            companyId,
            accountCode,
            name,
            status: "ACTIVE",

            buyingGroup:
              buyingGroup ||
              null,

            email,
            phone,
            website,
            addressLine,
            town,
            postcode,

            paymentTerms,
            creditLimit,
            currentBalance:
              currentBalance ??
              0,
            discount,
            accountOnHold,
            emailOrPrint,

            assignedMembershipId:
              matchedAgent?.id ??
              null,
          },
        });

        created++;
        continue;
      }

      await prisma.customer.update({
        where: {
          id: existing.id,
        },
        data: {
          name,

          buyingGroup:
            buyingGroup ||
            null,

          email,
          phone,
          website,
          addressLine,
          town,
          postcode,

          paymentTerms,
          creditLimit,
          currentBalance:
            currentBalance ??
            0,
          discount,
          accountOnHold,
          emailOrPrint,

          assignedMembershipId:
            existing.assignedMembershipId ??
            matchedAgent?.id ??
            null,
        },
      });

      updated++;
    }

    return NextResponse.json({
      success: true,
      summary: {
        rowsProcessed:
          session.rows.length,
        created,
        updated,
        skipped,
        unmatchedAgentCustomers,
      },
    });
  } catch (error) {
    console.error(
      "Customer import commit failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "OdinIQ could not import the customer master data.",
      },
      {
        status: 500,
      }
    );
  }
}