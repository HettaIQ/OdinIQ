import { getCurrentUser } from "./currentUser";

export async function getApiCompanyContext() {
  const user = await getCurrentUser();

  if (!user || !user.active) {
    return {
      status: "UNAUTHENTICATED" as const,
      user: null,
      membership: null,
      company: null,
      companyId: null,
    };
  }

  const membership = user.memberships[0];

  if (!membership) {
    return {
      status: "NO_COMPANY" as const,
      user,
      membership: null,
      company: null,
      companyId: null,
    };
  }

  return {
    status: "OK" as const,
    user,
    membership,
    company: membership.company,
    companyId: membership.companyId,
  };
}