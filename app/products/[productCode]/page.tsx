import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ProductDetailPageProps = {
  params: Promise<{
    productCode: string;
  }>;
};

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { productCode } = await params;
  const decodedProductCode = decodeURIComponent(productCode);

  const product = await prisma.product.findUnique({
    where: {
      productCode: decodedProductCode,
    },
    include: {
      merchantPrices: {
        orderBy: {
          merchantName: "asc",
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const grossProfit =
    product.costPrice !== null && product.listPrice !== null
      ? product.listPrice - product.costPrice
      : null;

  const grossMargin =
    product.costPrice !== null &&
    product.listPrice !== null &&
    product.listPrice > 0
      ? ((product.listPrice - product.costPrice) / product.listPrice) * 100
      : null;

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
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        <Link
          href="/products"
          style={{
            color: "#d4af37",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          ← Back to Product Explorer
        </Link>

        <div
          style={{
            marginTop: "34px",
            display: "flex",
            justifyContent: "space-between",
            gap: "24px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
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
              {product.productCode}
            </h1>

            <p
              style={{
                color: "#c7c7c7",
                fontSize: "20px",
                lineHeight: 1.5,
                marginTop: "14px",
                maxWidth: "760px",
              }}
            >
              {product.description}
            </p>
          </div>

          <span
            style={{
              display: "inline-block",
              padding: "8px 13px",
              borderRadius: "999px",
              background: product.active ? "#18351d" : "#3a1b1b",
              color: product.active ? "#6eeb83" : "#ff8f8f",
              fontSize: "13px",
              fontWeight: "bold",
            }}
          >
            {product.active ? "Active" : "Inactive"}
          </span>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "16px",
            marginTop: "30px",
          }}
        >
          <MetricCard
            label="Supplier"
            value={product.supplier ?? "Not set"}
          />

          <MetricCard
            label="Cost Price"
            value={formatCurrency(product.costPrice)}
          />

          <MetricCard
            label="List Price"
            value={formatCurrency(product.listPrice)}
          />

          <MetricCard
            label="Gross Profit"
            value={formatCurrency(grossProfit)}
          />

          <MetricCard
            label="Gross Margin"
            value={
              grossMargin === null ? "—" : `${grossMargin.toFixed(1)}%`
            }
            warning={grossMargin !== null && grossMargin < 30}
          />
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "18px",
            marginTop: "28px",
          }}
        >
          <div style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Product Information</h2>

            <InformationRow
              label="Product Code"
              value={product.productCode}
            />

            <InformationRow
              label="Description"
              value={product.description}
            />

            <InformationRow
              label="Supplier"
              value={product.supplier ?? "Not set"}
            />

            <InformationRow
              label="Category"
              value={product.category ?? "Not set"}
            />

            <InformationRow
              label="Brand"
              value={product.brand ?? "Not set"}
            />

            <InformationRow
              label="Created"
              value={product.createdAt.toLocaleDateString("en-GB")}
            />

            <InformationRow
              label="Last Updated"
              value={product.updatedAt.toLocaleString("en-GB")}
            />
          </div>

          <div style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Odin Analysis</h2>

            <Recommendation
              title="Pricing completeness"
              text={
                product.costPrice === null || product.listPrice === null
                  ? "This product is missing pricing information."
                  : "Cost and list prices are both available."
              }
              warning={
                product.costPrice === null || product.listPrice === null
              }
            />

            <Recommendation
              title="Gross margin"
              text={
                grossMargin === null
                  ? "OdinIQ cannot calculate gross margin until both prices are present."
                  : grossMargin < 30
                    ? `Gross margin is ${grossMargin.toFixed(
                        1
                      )}%, which is below the 30% review threshold.`
                    : `Gross margin is ${grossMargin.toFixed(
                        1
                      )}% at list price.`
              }
              warning={grossMargin !== null && grossMargin < 30}
            />

            <Recommendation
              title="Merchant pricing"
              text={
                product.merchantPrices.length === 0
                  ? "No merchant pricing has been stored for this product yet."
                  : `${product.merchantPrices.length} merchant pricing records are available.`
              }
              warning={product.merchantPrices.length === 0}
            />
          </div>
        </section>

        <section
          style={{
            marginTop: "28px",
            ...panelStyle,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "18px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ marginTop: 0, marginBottom: "6px" }}>
                Merchant Pricing
              </h2>

              <p style={{ color: "#999999", margin: 0 }}>
                Customer-specific discounts and calculated selling prices.
              </p>
            </div>

            <span
              style={{
                color: "#d4af37",
                fontWeight: "bold",
              }}
            >
              {product.merchantPrices.length} records
            </span>
          </div>

          {product.merchantPrices.length > 0 ? (
            <div style={{ overflowX: "auto", marginTop: "22px" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "700px",
                }}
              >
                <thead>
                  <tr>
                    <th style={headingStyle}>Merchant</th>
                    <th style={headingStyle}>Discount</th>
                    <th style={headingStyle}>Net Sell Price</th>
                    <th style={headingStyle}>Profit</th>
                    <th style={headingStyle}>Margin</th>
                  </tr>
                </thead>

                <tbody>
                  {product.merchantPrices.map((merchantPrice) => {
                    const discount = merchantPrice.discount;

                    const netSellPrice =
                      product.listPrice !== null &&
                      discount !== null
                        ? product.listPrice * (1 - discount / 100)
                        : null;

                    const profit =
                      netSellPrice !== null &&
                      product.costPrice !== null
                        ? netSellPrice - product.costPrice
                        : null;

                    const margin =
                      netSellPrice !== null &&
                      netSellPrice > 0 &&
                      profit !== null
                        ? (profit / netSellPrice) * 100
                        : null;

                    return (
                      <tr key={merchantPrice.id}>
                        <td style={cellStyle}>
                          {merchantPrice.merchantName}
                        </td>

                        <td style={cellStyle}>
                          {discount === null
                            ? "—"
                            : `${discount.toFixed(1)}%`}
                        </td>

                        <td style={cellStyle}>
                          {formatCurrency(netSellPrice)}
                        </td>

                        <td style={cellStyle}>
                          {formatCurrency(profit)}
                        </td>

                        <td style={cellStyle}>
                          {margin === null
                            ? "—"
                            : `${margin.toFixed(1)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                marginTop: "22px",
                padding: "24px",
                background: "#0b0b0f",
                border: "1px solid #292929",
                borderRadius: "10px",
                color: "#999999",
                textAlign: "center",
              }}
            >
              Merchant pricing will appear here once discount records are
              imported.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div
      style={{
        background: warning ? "#211e12" : "#151515",
        border: warning
          ? "1px solid #66571d"
          : "1px solid #2b2b2b",
        borderRadius: "14px",
        padding: "22px",
      }}
    >
      <p style={{ color: "#999999", margin: 0 }}>{label}</p>

      <h2
        style={{
          marginTop: "12px",
          marginBottom: 0,
          fontSize: "28px",
          color: warning ? "#d4af37" : "#ffffff",
        }}
      >
        {value}
      </h2>
    </div>
  );
}

function InformationRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: "16px",
        padding: "14px 0",
        borderBottom: "1px solid #242424",
      }}
    >
      <span style={{ color: "#999999" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Recommendation({
  title,
  text,
  warning,
}: {
  title: string;
  text: string;
  warning: boolean;
}) {
  return (
    <div
      style={{
        marginTop: "14px",
        padding: "16px",
        background: warning ? "#211e12" : "#0b0b0f",
        border: warning
          ? "1px solid #66571d"
          : "1px solid #292929",
        borderRadius: "10px",
      }}
    >
      <strong style={{ color: "#d4af37" }}>{title}</strong>

      <p
        style={{
          marginBottom: 0,
          color: "#cccccc",
          lineHeight: 1.5,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function formatCurrency(value: number | null): string {
  if (value === null) return "—";

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

const panelStyle = {
  background: "#151515",
  border: "1px solid #2b2b2b",
  borderRadius: "14px",
  padding: "24px",
};

const headingStyle = {
  padding: "14px",
  textAlign: "left" as const,
  color: "#d4af37",
  borderBottom: "1px solid #292929",
};

const cellStyle = {
  padding: "14px",
  color: "#dddddd",
  borderBottom: "1px solid #242424",
};