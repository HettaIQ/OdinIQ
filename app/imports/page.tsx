import Link from "next/link";

type ImportModule = {
  title: string;
  description: string;
  icon: string;
  href?: string;
  status: "Available" | "Coming soon";
};

const importModules: ImportModule[] = [
  {
    title: "Products & Pricing",
    description:
      "Import product codes, descriptions, suppliers, costs, list prices and merchant pricing.",
    icon: "📦",
    href: "/products/import",
    status: "Available",
  },
  {
    title: "Customers & Contacts",
    description:
      "Import customer accounts, branches, contacts, buying groups and account ownership.",
    icon: "👥",
    status: "Coming soon",
  },
  {
    title: "Commercial Agreements",
    description:
      "Import discounts, rebates, payment terms, commitments and supporting agreements.",
    icon: "📄",
    status: "Coming soon",
  },
  {
    title: "Sales History",
    description:
      "Import invoice and sales data to identify growth, decline and purchasing trends.",
    icon: "📈",
    status: "Coming soon",
  },
  {
    title: "Credit Limits",
    description:
      "Import customer credit limits, current exposure and available credit.",
    icon: "💳",
    status: "Coming soon",
  },
  {
    title: "Payment History",
    description:
      "Import payment performance, overdue balances and average payment times.",
    icon: "💷",
    status: "Coming soon",
  },
  {
    title: "Meeting Notes",
    description:
      "Import meeting notes, customer feedback, commitments and agreed actions.",
    icon: "📝",
    status: "Coming soon",
  },
  {
    title: "Opportunities",
    description:
      "Import quotations, prospects, pipeline values and expected completion dates.",
    icon: "🎯",
    status: "Coming soon",
  },
  {
    title: "Tasks & Actions",
    description:
      "Import follow-ups, responsibilities, deadlines and outstanding commercial actions.",
    icon: "✅",
    status: "Coming soon",
  },
  {
    title: "Contract Renewals",
    description:
      "Import agreement dates, notice periods, renewal deadlines and account reviews.",
    icon: "📅",
    status: "Coming soon",
  },
  {
    title: "Marketing Budgets",
    description:
      "Import agreed marketing support, promotional budgets and actual expenditure.",
    icon: "📣",
    status: "Coming soon",
  },
  {
    title: "Commercial Investment",
    description:
      "Track rebates, free stock, displays, launch support and total account investment.",
    icon: "🏦",
    status: "Coming soon",
  },
];

export default function CommercialImportCentrePage() {
  const availableCount = importModules.filter(
    (module) => module.status === "Available"
  ).length;

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
          href="/"
          style={{
            color: "#d4af37",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          ← Back to OdinIQ
        </Link>

        <div style={{ marginTop: "36px", marginBottom: "34px" }}>
          <p
            style={{
              color: "#d4af37",
              fontSize: "13px",
              fontWeight: "bold",
              letterSpacing: "1.6px",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            OdinIQ Data Engine
          </p>

          <h1
            style={{
              fontSize: "46px",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Commercial Import Centre
          </h1>

          <p
            style={{
              color: "#aaaaaa",
              fontSize: "18px",
              lineHeight: 1.6,
              maxWidth: "780px",
              marginTop: "18px",
            }}
          >
            Bring your commercial information into one connected system.
            OdinIQ will analyse, validate and organise each uploaded file.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            marginBottom: "34px",
          }}
        >
          <div
            style={{
              background: "#151515",
              border: "1px solid #2b2b2b",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <p style={{ color: "#999", margin: 0 }}>Import Modules</p>
            <h2 style={{ fontSize: "30px", marginBottom: 0 }}>
              {importModules.length}
            </h2>
          </div>

          <div
            style={{
              background: "#151515",
              border: "1px solid #2b2b2b",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <p style={{ color: "#999", margin: 0 }}>Available Now</p>
            <h2 style={{ fontSize: "30px", marginBottom: 0 }}>
              {availableCount}
            </h2>
          </div>

          <div
            style={{
              background: "#211e12",
              border: "1px solid #5b4e17",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <p style={{ color: "#c8b96e", margin: 0 }}>
              Odin Smart Analysis
            </p>
            <h2
              style={{
                color: "#d4af37",
                fontSize: "22px",
                marginBottom: 0,
              }}
            >
              Active
            </h2>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "18px",
          }}
        >
          {importModules.map((module) => {
            const card = (
              <div
                style={{
                  height: "100%",
                  boxSizing: "border-box",
                  background:
                    module.status === "Available"
                      ? "#171717"
                      : "#121212",
                  border:
                    module.status === "Available"
                      ? "1px solid #66571d"
                      : "1px solid #292929",
                  borderRadius: "14px",
                  padding: "24px",
                  opacity:
                    module.status === "Available" ? 1 : 0.72,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "14px",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: "30px" }}>{module.icon}</span>

                  <span
                    style={{
                      background:
                        module.status === "Available"
                          ? "#2f7d32"
                          : "#292929",
                      color: "#ffffff",
                      padding: "5px 9px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                  >
                    {module.status}
                  </span>
                </div>

                <h2
                  style={{
                    fontSize: "21px",
                    marginTop: "20px",
                    marginBottom: "10px",
                  }}
                >
                  {module.title}
                </h2>

                <p
                  style={{
                    color: "#a8a8a8",
                    lineHeight: 1.55,
                    marginBottom: 0,
                  }}
                >
                  {module.description}
                </p>

                {module.status === "Available" && (
                  <p
                    style={{
                      color: "#d4af37",
                      fontWeight: "bold",
                      marginTop: "22px",
                      marginBottom: 0,
                    }}
                  >
                    Open importer →
                  </p>
                )}
              </div>
            );

            return module.href ? (
              <Link
                key={module.title}
                href={module.href}
                style={{
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                {card}
              </Link>
            ) : (
              <div key={module.title}>{card}</div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: "36px",
            background: "#211e12",
            border: "1px solid #5b4e17",
            borderRadius: "14px",
            padding: "24px",
          }}
        >
          <h2 style={{ color: "#d4af37", marginTop: 0 }}>
            Odin Smart Alerts
          </h2>

          <p
            style={{
              color: "#d5d0b8",
              lineHeight: 1.6,
              marginBottom: 0,
            }}
          >
            As more commercial data is connected, OdinIQ will identify
            declining sales, overdue payments, expiring agreements,
            overspent budgets, missed tasks and margin risks automatically.
          </p>
        </div>
      </div>
    </main>
  );
}