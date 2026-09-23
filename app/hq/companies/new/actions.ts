"use server";

import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { createAccountActivationToken } from "@/lib/auth/accountActivation";
import { prisma } from "@/lib/prisma";
import { onboardCompany } from "@/lib/tenancy/onboardCompany";

export type CreateCompanyState = {
  error: string | null;
  success?: {
    companyName: string;
    adminName: string;
    adminEmail: string;
    activationToken: string;
    expiresAt: string;
  } | null;
};

export async function createCompanyAction(
  _previousState: CreateCompanyState,
  formData: FormData
): Promise<CreateCompanyState> {
  /*
   * Never rely on the HQ page itself for security.
   *
   * The server action independently verifies that
   * the current user is an OdinIQ SUPER_ADMIN.
   */
  await requireSuperAdmin();

  const companyName = String(
    formData.get("companyName") ?? ""
  ).trim();

  const slug = String(
    formData.get("slug") ?? ""
  )
    .trim()
    .toLowerCase();

  const adminName = String(
    formData.get("adminName") ?? ""
  ).trim();

  const adminEmail = String(
    formData.get("adminEmail") ?? ""
  )
    .trim()
    .toLowerCase();

  if (
    !companyName ||
    !slug ||
    !adminName ||
    !adminEmail
  ) {
    return {
      error:
        "Company name, company slug, administrator name and administrator email are required.",
      success: null,
    };
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      adminEmail
    )
  ) {
    return {
      error:
        "Enter a valid administrator email address.",
      success: null,
    };
  }

  try {
    /*
     * Provision the new tenant, its standard
     * roles and its first Company Administrator.
     */
    const onboarding =
      await onboardCompany(prisma, {
        companyName,
        slug,
        adminName,
        adminEmail,
      });

    /*
     * Create the administrator's one-time
     * activation token.
     *
     * Only the hash is stored in OdinIQ.
     * The raw token is returned once so HQ can
     * provide the activation link.
     */
    const activation =
      await createAccountActivationToken(
        onboarding.admin.user.id
      );

    return {
      error: null,
      success: {
        companyName: onboarding.company.name,
        adminName:
          onboarding.admin.user.name,
        adminEmail:
          onboarding.admin.user.email,
        activationToken: activation.token,
        expiresAt:
          activation.expiresAt.toISOString(),
      },
    };
  } catch (error) {
    console.error(
      "Company onboarding failed:",
      error
    );

    return {
      error:
        error instanceof Error
          ? error.message
          : "Company onboarding failed.",
      success: null,
    };
  }
}