"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";

export async function switchCompany(
  formData: FormData
) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const companyId = Number(
    formData.get("companyId")
  );

  if (
    !Number.isInteger(companyId) ||
    companyId <= 0
  ) {
    throw new Error("Invalid company.");
  }

  /*
   * Never trust a company ID supplied by the
   * browser.
   *
   * Confirm that the logged-in user has an
   * active membership for the requested company.
   */
  const membership =
    await prisma.companyMembership.findFirst({
      where: {
        userId: session.userId,
        companyId,
        active: true,
      },
      select: {
        id: true,
        companyId: true,
      },
    });

  if (!membership) {
    throw new Error(
      "You do not have access to this company."
    );
  }

  /*
   * Update only the session belonging to the
   * current browser.
   */
  await prisma.session.update({
    where: {
      id: session.id,
    },
    data: {
      activeCompanyId: membership.companyId,
    },
  });

  redirect("/dashboard");
}