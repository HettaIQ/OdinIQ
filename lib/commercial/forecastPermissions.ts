
import { prisma } from "@/lib/prisma";

export type ForecastPermission =
  | "commercial.forecast.view"
  | "commercial.forecast.manage";

type Input = {
  companyId: number;
  userId: number;
  permission: ForecastPermission;
};

export async function requireForecastPermission({
  companyId,
  userId,
  permission,
}: Input): Promise<void> {
  if (
    !Number.isSafeInteger(companyId) ||
    companyId <= 0 ||
    !Number.isSafeInteger(userId) ||
    userId <= 0
  ) {
    throw new Error("Invalid user or company.");
  }

  const membership = await prisma.companyMembership.findFirst({
    where: {
      companyId,
      userId,
      active: true,
      user: {
        active: true,
      },
    },
    select: {
      role: {
        select: {
          companyId: true,
          permissions: {
            where: {
              permission: {
                key: permission,
              },
            },
            select: {
              permissionId: true,
            },
          },
        },
      },
    },
  });

  if (
    !membership ||
    !membership.role ||
    membership.role.companyId !== companyId ||
    membership.role.permissions.length === 0
  ) {
    throw new Error(
      "You do not have permission to access this forecast."
    );
  }
}
