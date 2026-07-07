export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top right, rgba(212,175,55,0.16), transparent 30%), #08080A",
        color: "#F8F8F8",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <nav
        style={{
          height: "80px",
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
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
          <strong style={{ fontSize: "22px" }}>OdinIQ</strong>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
          <span>Features</span>
          <span>Solutions</span>
          <span>About</span>
          <span>Contact</span>
          <button
            style={{
              background: "#D4AF37",
              color: "#08080A",
              border: "none",
              borderRadius: "999px",
              padding: "12px 22px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Book Demo
          </button>
        </div>
      </nav>

      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "90px 32px 80px",
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: "60px",
          alignItems: "center",
        }}
      >
        <div>
          <p style={{ color: "#D4AF37", fontWeight: "bold" }}>
            AI COMMERCIAL INTELLIGENCE
          </p>

          <h1
            style={{
              fontSize: "72px",
              lineHeight: "1",
              margin: "20px 0",
              letterSpacing: "-3px",
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
              fontSize: "22px",
              lineHeight: "1.6",
              maxWidth: "620px",
            }}
          >
            OdinIQ helps businesses turn sales, pricing and customer data into
            clear commercial decisions using AI.
          </p>

          <div style={{ display: "flex", gap: "16px", marginTop: "34px" }}>
            <button
              style={{
                background: "#D4AF37",
                color: "#08080A",
                border: "none",
                borderRadius: "12px",
                padding: "16px 24px",
                fontWeight: "bold",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              Request Demo
            </button>

            <button
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#F8F8F8",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: "12px",
                padding: "16px 24px",
                fontWeight: "bold",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              Watch Preview
            </button>
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "28px",
            padding: "26px",
            boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ color: "#B8B8B8", marginBottom: "12px" }}>
            Commercial Score
          </div>

          <div style={{ fontSize: "64px", fontWeight: "bold" }}>92%</div>

          <div style={{ color: "#D4AF37", margin: "10px 0 30px" }}>
            Strong growth potential detected
          </div>

          {[
            ["Sales Opportunities", "£48,231"],
            ["Customers At Risk", "17"],
            ["Quotes To Chase", "12"],
            ["Pricing Actions", "4"],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "18px 0",
                borderTop: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span style={{ color: "#B8B8B8" }}>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}

          <div
            style={{
              marginTop: "24px",
              background: "rgba(212,175,55,0.1)",
              border: "1px solid rgba(212,175,55,0.25)",
              borderRadius: "18px",
              padding: "18px",
              color: "#F8F8F8",
            }}
          >
            Odin recommends contacting 5 customers today. Estimated opportunity:
            <strong style={{ color: "#D4AF37" }}> £18,420</strong>
          </div>
        </div>
      </section>
    </main>
  );
}