export default function Home() {
  const stats = [
    ["Sales Opportunities", "£48,231"],
    ["Customers At Risk", "17"],
    ["Quotes To Chase", "12"],
    ["Pricing Actions", "4"],
  ];

  const features = [
    {
      title: "AI Sales Intelligence",
      text: "Discover which customers are most likely to buy next.",
    },
    {
      title: "Pricing Intelligence",
      text: "Protect margins with AI-driven pricing recommendations.",
    },
    {
      title: "Customer Health",
      text: "Identify customers at risk before revenue is lost.",
    },
    {
      title: "Ask Odin",
      text: "Ask questions in plain English and receive instant commercial insights.",
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Navigation */}

      <nav
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "28px 32px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "2px solid #D4AF37",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#D4AF37",
              fontWeight: "bold",
            }}
          >
            O
          </div>

          <h2>OdinIQ</h2>
        </div>

        <div
          style={{
            display: "flex",
            gap: "36px",
            alignItems: "center",
          }}
        >
          <span>Features</span>
          <span>Solutions</span>
          <span>About</span>
          <span>Contact</span>

          <button
            style={{
              background: "#D4AF37",
              color: "#080808",
              border: "none",
              borderRadius: "12px",
              padding: "14px 24px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Book Demo
          </button>
        </div>
      </nav>

      {/* Hero */}

      <section
        style={{
          maxWidth: "1200px",
          margin: "70px auto",
          padding: "0 32px",
          display: "grid",
          gridTemplateColumns: "1fr 460px",
          gap: "80px",
          alignItems: "center",
        }}
      >
        <div>
          <p
            style={{
              color: "#D4AF37",
              fontWeight: "bold",
              letterSpacing: "2px",
            }}
          >
            AI COMMERCIAL INTELLIGENCE
          </p>

          <h1
            style={{
              fontSize: "72px",
              lineHeight: "1.05",
              margin: "24px 0",
            }}
          >
            Price smarter.
            <br />
            Sell better.
            <br />
            Win more.
          </h1>

          <p
            style={{
              color: "#B8B8B8",
              fontSize: "24px",
              lineHeight: "1.6",
              maxWidth: "700px",
            }}
          >
            OdinIQ helps businesses turn sales, pricing and customer
            data into clear commercial decisions using AI.
          </p>

          <div
            style={{
              display: "flex",
              gap: "18px",
              marginTop: "40px",
            }}
          >
            <button
              style={{
                background: "#D4AF37",
                color: "#080808",
                border: "none",
                borderRadius: "14px",
                padding: "18px 30px",
                fontWeight: "bold",
                fontSize: "16px",
              }}
            >
              Request Demo
            </button>

            <button
              style={{
                background: "transparent",
                color: "white",
                border: "1px solid #444",
                borderRadius: "14px",
                padding: "18px 30px",
                fontWeight: "bold",
                fontSize: "16px",
              }}
            >
              Watch Preview
            </button>
          </div>
        </div>

        <div
          style={{
            background: "#181818",
            border: "1px solid #2C2C2C",
            borderRadius: "28px",
            padding: "28px",
          }}
        >
          <p style={{ color: "#BBBBBB" }}>Commercial Score</p>

          <h2
            style={{
              fontSize: "72px",
              margin: "10px 0",
            }}
          >
            92%
          </h2>

          <p style={{ color: "#D4AF37" }}>
            Strong growth potential detected
          </p>

          <div style={{ marginTop: "34px" }}>
            {stats.map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px solid #2A2A2A",
                  padding: "18px 0",
                }}
              >
                <span style={{ color: "#B8B8B8" }}>{label}</span>

                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "26px",
              background: "rgba(212,175,55,.08)",
              border: "1px solid rgba(212,175,55,.25)",
              borderRadius: "18px",
              padding: "18px",
            }}
          >
            Odin recommends contacting 5 customers today.
            <br />
            Estimated opportunity:
            <strong style={{ color: "#D4AF37" }}> £18,420</strong>
          </div>
        </div>
      </section>

      {/* Features */}

      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "40px 32px 100px",
        }}
      >
        <p
          style={{
            color: "#D4AF37",
            fontWeight: "bold",
            letterSpacing: "2px",
          }}
        >
          WHY ODINIQ
        </p>

        <h2
          style={{
            fontSize: "54px",
            margin: "18px 0 50px",
          }}
        >
          Everything your commercial
          <br />
          team needs.
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,1fr)",
            gap: "24px",
          }}
        >
          {features.map((feature) => (
            <div
              key={feature.title}
              style={{
                background: "#161616",
                border: "1px solid #2A2A2A",
                borderRadius: "22px",
                padding: "32px",
              }}
            >
              <h3
                style={{
                  fontSize: "24px",
                  marginBottom: "16px",
                }}
              >
                {feature.title}
              </h3>

              <p
                style={{
                  color: "#B8B8B8",
                  lineHeight: "1.7",
                }}
              >
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}