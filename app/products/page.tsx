import ProductExplorerClient from "./ProductExplorerClient";

import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const user = await requireAuth();
  const membership = user.memberships[0];

  if (!membership) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        No active company membership was found for this account.
      </div>
    );
  }

  const canViewCostPrice =
    user.platformRole === "SUPER_ADMIN" ||
    membership.role?.permissions.some(
      ({ permission }) => permission.key === "products.view_cost_price"
    );

  const products = await prisma.product.findMany({
    where: {
      companyId: membership.companyId,
    },
    select: {
      id: true,
      productCode: true,
      description: true,
      supplier: true,
      costPrice: canViewCostPrice,
      listPrice: true,
      active: true,
    },
    orderBy: {
      productCode: "asc",
    },
  });

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold text-amber-600">
          Product Intelligence
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Product Explorer
        </h1>

        <p className="mt-2 text-slate-600">
          Search, filter and review the live product database.
        </p>
      </section>

      <ProductExplorerClient products={products} />
    </div>
  );
}