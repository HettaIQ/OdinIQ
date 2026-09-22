import Link from "next/link";

import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AgreementsPage() {
  const {
    companyId,
  } = await requireCompanyContext();

  const agreements = await prisma.commercialAgreement.findMany({
    where: {
      companyId,
    },
    include: {
      documents: true,
      discounts: true,
      rebates: true,
    },
    orderBy: {
      customerName: "asc",
    },
  });

  const activeAgreements = agreements.filter(
    (agreement) => agreement.status.toLowerCase() === "active"
  ).length;

  const today = new Date();
  const renewalWindow = new Date();
  renewalWindow.setDate(today.getDate() + 90);

  const renewalsDue = agreements.filter((agreement) => {
    if (!agreement.renewalDate) return false;

    return (
      agreement.renewalDate >= today &&
      agreement.renewalDate <= renewalWindow
    );
  }).length;

  const totalMarketingBudget = agreements.reduce(
    (total, agreement) => total + (agreement.marketingBudget ?? 0),
    0
  );

  const totalMarketingSpend = agreements.reduce(
    (total, agreement) => total + (agreement.marketingSpend ?? 0),
    0
  );

  const remainingMarketingBudget =
    totalMarketingBudget - totalMarketingSpend;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#ffffff",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1300px", margin: "0 auto" }}>
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

        <p
          style={{
            color: "#d4af37",
            marginTop: "30px",
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: "1px",
            fontSize: "13px",
          }}
        >
          Commercial Intelligence
        </p>

        <h1
          style={{
            fontSize: "52px",
            margin: "10px 0",
          }}
        >
          Commercial Agreements
        </h1>

        <p
          style={{
            color: "#9c9c9c",
            fontSize: "18px",
            marginBottom: "40px",
          }}
        >
          Manage customer agreements, rebates, marketing budgets and
          contract documents.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "18px",
          }}
        >
          <MetricCard
            title="Active Agreements"
            value={String(activeAgreements)}
          />

          <MetricCard
            title="Renewals Due"
            value={String(renewalsDue)}
            warning={renewalsDue > 0}
          />

          <MetricCard
            title="Marketing Budget"
            value={formatCurrency(totalMarketingBudget)}
          />

          <MetricCard
            title="Budget Remaining"
            value={formatCurrency(remainingMarketingBudget)}
            warning={remainingMarketingBudget < 0}
          />
        </div>

        <div
          style={{
            marginTop: "30px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Agreement Register</h2>

            <p
              style={{
                color: "#999999",
                marginTop: "8px",
                marginBottom: 0,
              }}
            >
              {agreements.length} commercial agreements stored.
            </p>
          </div>

          <Link
            href="/agreements/new"
            style={{
              background: "#d4af37",
              color: "#111111",
              textDecoration: "none",
              padding: "13px 20px",
              borderRadius: "9px",
              fontWeight: "bold",
            }}
          >
            Add Agreement
          </Link>
        </div>

        <section
          style={{
            marginTop: "20px",
            background: "#151515",
            border: "1px solid #2b2b2b",
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >
          {agreements.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: "1050px",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ background: "#0b0b0f" }}>
                    <th style={headingStyle}>Customer</th>
                    <th style={headingStyle}>Agreement</th>
                    <th style={headingStyle}>Status</th>
                    <th style={headingStyle}>Renewal</th>
                    <th style={headingStyle}>Discount</th>
                    <th style={headingStyle}>Rebate</th>
                    <th style={headingStyle}>Marketing</th>
                    <th style={headingStyle}>Documents</th>
                  </tr>
                </thead>

                <tbody>
                  {agreements.map((agreement) => (
                    <tr key={agreement.id}>
                      <td style={cellStyle}>
  <Link
    href={`/agreements/${agreement.id}`}
    style={{
      color: "#d4af37",
      textDecoration: "none",
      fontWeight: "bold",
    }}
  >
    {agreement.customerName}
  </Link>
</td>

                      <td style={cellStyle}>
                        {agreement.agreementName}
                      </td>

                      <td style={cellStyle}>
                        <StatusBadge status={agreement.status} />
                      </td>

                      <td style={cellStyle}>
                        {formatDate(agreement.renewalDate)}
                      </td>

                      <td style={cellStyle}>
                        {formatPercent(
                          agreement.standardDiscount
                        )}
                      </td>

                      <td style={cellStyle}>
                        {formatPercent(agreement.rebatePercent)}
                      </td>

                      <td style={cellStyle}>
                        {formatCurrency(
                          agreement.marketingBudget
                        )}
                      </td>

                      <td style={cellStyle}>
                        {agreement.documents.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                padding: "42px",
                textAlign: "center",
              }}
            >
              <h2>No agreements yet</h2>

              <p style={{ color: "#999999" }}>
                Add your first commercial agreement to begin tracking
                pricing, rebates, budgets and contract dates.
              </p>

              <Link
                href="/agreements/new"
                style={{
                  display: "inline-block",
                  marginTop: "16px",
                  background: "#d4af37",
                  color: "#111111",
                  textDecoration: "none",
                  padding: "14px 24px",
                  borderRadius: "10px",
                  fontWeight: "bold",
                }}
              >
                Add First Agreement
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  warning = false,
}: {
  title: string;
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
        borderRadius: "16px",
        padding: "22px",
      }}
    >
      <div style={{ color: "#888888", fontSize: "14px" }}>
        {title}
      </div>

      <div
        style={{
          fontSize: "36px",
          marginTop: "10px",
          fontWeight: "bold",
          color: warning ? "#d4af37" : "#ffffff",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status.toLowerCase() === "active";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 9px",
        borderRadius: "999px",
        background: active ? "#18351d" : "#3a2d16",
        color: active ? "#6eeb83" : "#f4c95d",
        fontWeight: "bold",
        fontSize: "12px",
      }}
    >
      {status}
    </span>
  );
}

function formatCurrency(value: number | null): string {
  if (value === null) return "—";

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null) return "—";

  return `${value.toFixed(1)}%`;
}

function formatDate(value: Date | null): string {
  if (value === null) return "—";

  return value.toLocaleDateString("en-GB");
}

const headingStyle = {
  padding: "14px",
  textAlign: "left" as const,
  color: "#d4af37",
  borderBottom: "1px solid #292929",
  fontSize: "13px",
};

const cellStyle = {
  padding: "14px",
  color: "#dddddd",
  borderBottom: "1px solid #242424",
  fontSize: "14px",
};
