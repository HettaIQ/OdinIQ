type PublicDemoContext = {
  user: {
    email: string;
  };
  membership: {
    role?: {
      name: string;
    } | null;
  };
  company: {
    slug: string;
  };
};

export function isPublicDemoContext(
  context: PublicDemoContext
) {
  return (
    context.company.slug === "odin-demo" &&
    context.membership.role?.name === "Demo Viewer" &&
    context.user.email.toLowerCase() ===
      "demo@odiniq.co.uk"
  );
}
