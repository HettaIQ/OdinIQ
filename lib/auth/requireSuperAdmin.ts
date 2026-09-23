import { redirect } from "next/navigation";

import { requireAuth } from "./requireAuth";

export async function requireSuperAdmin() {
  const user = await requireAuth();

  if (user.platformRole !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return user;
}
