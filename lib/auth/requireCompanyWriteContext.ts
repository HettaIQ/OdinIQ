import { requireCompanyContext } from "./requireCompanyContext";

const PUBLIC_DEMO_COMPANY_SLUG = "odin-demo";
const PUBLIC_DEMO_ROLE_NAME = "Demo Viewer";
const PUBLIC_DEMO_EMAIL = "demo@odiniq.co.uk";

export async function requireCompanyWriteContext() {
  const context = await requireCompanyContext();

  const isPublicDemo =
    context.company.slug === PUBLIC_DEMO_COMPANY_SLUG &&
    context.membership.role?.name === PUBLIC_DEMO_ROLE_NAME &&
    context.user.email.toLowerCase() === PUBLIC_DEMO_EMAIL;

  if (isPublicDemo) {
    throw new Error(
      "The public OdinIQ demo is read-only."
    );
  }

  return context;
}
