import { redirect } from "next/navigation";

import { getCurrentUser } from "./currentUser";

type RequireAuthOptions = {
  allMemberships?: boolean;
};

export async function requireAuth(
  options: RequireAuthOptions = {}
) {
  const user = await getCurrentUser(options);

  if (!user || !user.active) {
    redirect("/login");
  }

  return user;
}