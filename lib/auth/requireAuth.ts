import { redirect } from "next/navigation";

import { getCurrentUser } from "./currentUser";

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user || !user.active) {
    redirect("/login");
  }

  return user;
}