
import { getCurrentSession } from "@/lib/auth/session";
import OdinActivityTracker from "@/app/components/OdinActivityTracker";

export default async function AuthenticatedActivityTracker() {
  const session = await getCurrentSession();

  if (!session || !session.activeCompanyId) {
    return null;
  }

  return <OdinActivityTracker />;
}
