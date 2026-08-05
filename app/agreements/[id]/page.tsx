import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DocumentUpload from "./DocumentUpload";
import DocumentMover from "./DocumentMover";
import AnalyseAgreementButton from "./AnalyseAgreementButton";

export const dynamic = "force-dynamic";

type AgreementDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AgreementDetailPage({
  params,
}: AgreementDetailPageProps) {
  const { id } = await params;
  const agreementId = Number(id);

  if (!Number.isInteger(agreementId)) {
    notFound();
  }

  const agreement = await prisma.commercialAgreement.findUnique({
    where: {
      id: agreementId,
    },
    include: {
      documents: {
        orderBy: {
          uploadedAt: "desc",
        },
      },
      discounts: {
        orderBy: {
          name: "asc",
        },
      },
      rebates: {
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  if (!agreement) {
    notFound();
  }
const agreementOptions = await prisma.commercialAgreement.findMany({
  select: {
    id: true,
    customerName: true,
    agreementName: true,
  },
  orderBy: {
    customerName: "asc",
  },
});

  const marketingBudget = agreement.marketingBudget ?? 0;
  const marketingSpend = agreement.marketingSpend ?? 0;
  const marketingRemaining = marketingBudget - marketingSpend;

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
      <div
        style={{
          width: "100%",
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        <Link
          href="/agreements"
          style={{
            color: "#d4af37",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          ← Back to Commercial Agreements
        </Link>

        <div
          style={{
            marginTop: "34px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "24px",
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
              Commercial Agreement
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: "46px",
                lineHeight: 1.1,
              }}
            >
              {agreement.customerName}
            </h1>

            <p
              style={{
                color: "#c7c7c7",
                fontSize: "20px",
                marginTop: "14px",
                marginBottom: 0,
              }}
            >
              {agreement.agreementName}
            </p>
          </div>

          <StatusBadge status={agreement.status} />
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginTop: "30px",
          }}
        >
          <MetricCard
            label="Standard Discount"
            value={formatPercent(agreement.standardDiscount)}
          />

          <MetricCard
            label="Rebate"
            value={formatPercent(agreement.rebatePercent)}
          />

          <MetricCard
            label="Marketing Budget"
            value={formatCurrency(agreement.marketingBudget)}
          />

          <MetricCard
            label="Budget Remaining"
            value={formatCurrency(marketingRemaining)}
            warning={marketingRemaining < 0}
          />

          <MetricCard
            label="Documents"
            value={String(agreement.documents.length)}
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
            <h2 style={{ marginTop: 0 }}>Agreement Overview</h2>

            <InformationRow
              label="Customer"
              value={agreement.customerName}
            />

            <InformationRow
              label="Agreement"
              value={agreement.agreementName}
            />

            <InformationRow
              label="Type"
              value={agreement.agreementType ?? "Not set"}
            />

            <InformationRow
              label="Status"
              value={agreement.status}
            />

            <InformationRow
              label="Start Date"
              value={formatDate(agreement.startDate)}
            />

            <InformationRow
              label="End Date"
              value={formatDate(agreement.endDate)}
            />

            <InformationRow
              label="Renewal Date"
              value={formatDate(agreement.renewalDate)}
            />

            <InformationRow
              label="Notice Period"
              value={agreement.noticePeriod ?? "Not set"}
            />

            <InformationRow
              label="Account Manager"
              value={agreement.accountManager ?? "Not set"}
            />

            <InformationRow
              label="Buying Group"
              value={agreement.buyingGroup ?? "Not set"}
            />
          </div>

          <div style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Commercial Terms</h2>

            <InformationRow
              label="Discount"
              value={formatPercent(agreement.standardDiscount)}
            />

            <InformationRow
              label="Rebate"
              value={formatPercent(agreement.rebatePercent)}
            />

            <InformationRow
              label="Payment Terms"
              value={agreement.paymentTerms ?? "Not set"}
            />

            <InformationRow
              label="Credit Limit"
              value={formatCurrency(agreement.creditLimit)}
            />

            <InformationRow
              label="Marketing Budget"
              value={formatCurrency(agreement.marketingBudget)}
            />

            <InformationRow
              label="Marketing Spend"
              value={formatCurrency(agreement.marketingSpend)}
            />

            <InformationRow
              label="Budget Remaining"
              value={formatCurrency(marketingRemaining)}
            />
          </div>
        </section>

        <section
          style={{
            marginTop: "28px",
            ...panelStyle,
          }}
        >
            <AnalyseAgreementButton agreementId={agreement.id} />
          <h2 style={{ marginTop: 0 }}>Odin Analysis</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "14px",
            }}
          >
            <Recommendation
              title="Contract dates"
              text={getDateRecommendation(
                agreement.endDate,
                agreement.renewalDate
              )}
              warning={isRenewalDueSoon(agreement.renewalDate)}
            />

            <Recommendation
              title="Commercial terms"
              text={
                agreement.standardDiscount === null ||
                agreement.rebatePercent === null
                  ? "Some core commercial terms are still missing."
                  : "Standard discount and rebate are both recorded."
              }
              warning={
                agreement.standardDiscount === null ||
                agreement.rebatePercent === null
              }
            />

            <Recommendation
              title="Document library"
              text={
                agreement.documents.length === 0
                  ? "No contract documents have been uploaded yet."
                  : `${agreement.documents.length} agreement documents are stored.`
              }
              warning={agreement.documents.length === 0}
            />

            <Recommendation
              title="Marketing budget"
              text={
                marketingBudget === 0
                  ? "No marketing budget has been recorded."
                  : marketingRemaining < 0
                    ? `Marketing spend exceeds the agreed budget by ${formatCurrency(
                        Math.abs(marketingRemaining)
                      )}.`
                    : `${formatCurrency(
                        marketingRemaining
                      )} remains from the agreed marketing budget.`
              }
              warning={marketingBudget === 0 || marketingRemaining < 0}
            />
          </div>
        </section>

        <section
          style={{
            marginTop: "28px",
            ...panelStyle,
          }}
        >
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={{ marginTop: 0, marginBottom: "6px" }}>
                Agreement Documents
              </h2>

              <p style={{ color: "#999999", margin: 0 }}>
                Contracts, pricing schedules, rebate documents and
                marketing agreements.
              </p>
            </div>

            <span style={{ color: "#d4af37", fontWeight: "bold" }}>
              {agreement.documents.length} files
            </span>
          </div>
<DocumentUpload agreementId={agreement.id} />
          {agreement.documents.length > 0 ? (
            <div style={{ marginTop: "20px" }}>
              {agreement.documents.map((document) => (
                <div
                  key={document.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "16px",
                    padding: "16px",
                    background: "#0b0b0f",
                    border: "1px solid #292929",
                    borderRadius: "10px",
                    marginTop: "10px",
                  }}
                >
                  <div>
                    <a
  href={`/uploads/agreements/${agreement.id}/${document.fileName}`}
  target="_blank"
  rel="noopener noreferrer"
  style={{
    color: "#d4af37",
    textDecoration: "none",
    fontWeight: "bold",
  }}
>
  {document.originalName}
</a>

                    <p
                      style={{
                        color: "#999999",
                        marginTop: "7px",
                        marginBottom: 0,
                      }}
                    >
                       {document.category ?? "Uncategorised"} ·{" "}
  {formatFileSize(document.fileSize)}
</p>

<DocumentMover
  documentId={document.id}
  currentAgreementId={agreement.id}
  agreements={agreementOptions}
/>
                  </div>

                  <span style={{ color: "#999999" }}>
                    {document.uploadedAt.toLocaleDateString("en-GB")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel text="No documents have been uploaded for this agreement." />
          )}
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
            <div style={sectionHeaderStyle}>
              <h2 style={{ margin: 0 }}>Discount Schedules</h2>
              <span style={{ color: "#d4af37" }}>
                {agreement.discounts.length}
              </span>
            </div>

            {agreement.discounts.length > 0 ? (
              agreement.discounts.map((discount) => (
                <div key={discount.id} style={listItemStyle}>
                  <strong>{discount.name}</strong>
                  <span>{discount.discount.toFixed(1)}%</span>
                </div>
              ))
            ) : (
              <EmptyPanel text="No special discount schedules recorded." />
            )}
          </div>

          <div style={panelStyle}>
            <div style={sectionHeaderStyle}>
              <h2 style={{ margin: 0 }}>Rebate Schemes</h2>
              <span style={{ color: "#d4af37" }}>
                {agreement.rebates.length}
              </span>
            </div>

            {agreement.rebates.length > 0 ? (
              agreement.rebates.map((rebate) => (
                <div key={rebate.id} style={listItemStyle}>
                  <strong>{rebate.name}</strong>
                  <span>{formatPercent(rebate.rebatePercent)}</span>
                </div>
              ))
            ) : (
              <EmptyPanel text="No tiered rebate schemes recorded." />
            )}
          </div>
        </section>

        <section
          style={{
            marginTop: "28px",
            ...panelStyle,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Commercial Notes</h2>

          <div
            style={{
              padding: "18px",
              background: "#0b0b0f",
              border: "1px solid #292929",
              borderRadius: "10px",
              color: "#cccccc",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {agreement.notes ?? "No commercial notes have been added."}
          </div>
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
          fontSize: "28px",
          marginTop: "12px",
          marginBottom: 0,
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
        gridTemplateColumns: "150px 1fr",
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
          color: "#cccccc",
          lineHeight: 1.5,
          marginBottom: 0,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div
      style={{
        marginTop: "18px",
        padding: "22px",
        background: "#0b0b0f",
        border: "1px solid #292929",
        borderRadius: "10px",
        color: "#999999",
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status.toLowerCase() === "active";

  return (
    <span
      style={{
        padding: "8px 13px",
        borderRadius: "999px",
        background: active ? "#18351d" : "#3a2d16",
        color: active ? "#6eeb83" : "#f4c95d",
        fontWeight: "bold",
        fontSize: "13px",
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isRenewalDueSoon(renewalDate: Date | null): boolean {
  if (!renewalDate) return false;

  const today = new Date();
  const ninetyDays = new Date();
  ninetyDays.setDate(today.getDate() + 90);

  return renewalDate >= today && renewalDate <= ninetyDays;
}

function getDateRecommendation(
  endDate: Date | null,
  renewalDate: Date | null
): string {
  if (!endDate && !renewalDate) {
    return "No expiry or renewal date has been recorded.";
  }

  if (renewalDate && isRenewalDueSoon(renewalDate)) {
    return `Renewal is due on ${formatDate(renewalDate)}.`;
  }

  if (renewalDate) {
    return `Next renewal is recorded for ${formatDate(renewalDate)}.`;
  }

  return `The agreement ends on ${formatDate(endDate)}.`;
}

const panelStyle = {
  background: "#151515",
  border: "1px solid #2b2b2b",
  borderRadius: "14px",
  padding: "24px",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap" as const,
};

const listItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  padding: "14px 0",
  borderBottom: "1px solid #242424",
};