import { redirect } from "next/navigation";

import { requireAuth } from "./requireAuth";

export async function requireCompanyContext() {
  const user = await requireAuth();

  const membership = user.memberships[0];

  /*
   * getCurrentUser() deliberately puts the
   * session's active company membership first.
   *
   * If there is no active company, we must not
   * guess which tenant the user wants to enter.
   */
  if (!membership) {
    redirect("/select-company");
  }

  return {
    user,
    membership,
    company: membership.company,
    companyId: membership.companyId,
  };
}