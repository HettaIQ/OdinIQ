import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductExplorerClient from "./ProductExplorerClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      productCode: true,
      description: true,
      supplier: true,
      costPrice: true,
      listPrice: true,
      active: true,
    },
    orderBy: {
      productCode: "asc",
    },
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0b0f",
        color: "#ffffff",
        padding: "48px 32px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1280px",
          margin: "0 auto",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            color: "#d4af37",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          ← Back to Dashboard
        </Link>

        <div style={{ marginTop: "34px" }}>
          <p
            style={{
              color: "#d4af37",
              fontSize: "13px",
              fontWeight: "bold",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              marginBottom: "10px",
            }}
          >
            Product Intelligence
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "46px",
              lineHeight: 1.1,
            }}
          >
            Product Explorer
          </h1>

          <p
            style={{
              color: "#a5a5a5",
              fontSize: "17px",
              lineHeight: 1.6,
              marginTop: "16px",
            }}
          >
            Search, filter and review the live product database.
          </p>
        </div>

        <ProductExplorerClient products={products} />
      </div>
    </main>
  );
}