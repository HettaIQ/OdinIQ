"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [score, setScore] = useState(0);
const [revenue, setRevenue] = useState(0);
const [margin, setMargin] = useState(0);
const [pipeline, setPipeline] = useState(0);
const [risk, setRisk] = useState(0);
const [question, setQuestion] = useState("");
const [answer, setAnswer] = useState("");
const [displayAnswer, setDisplayAnswer] = useState("");
const [thinking, setThinking] = useState(false);

useEffect(() => {
  let i = 0;

  const timer = setInterval(() => {
    i++;

    setScore(Math.min(i, 92));
    setRevenue(Math.min(i * 14000, 1280000));
    setMargin(Math.min(i * 0.33, 29.8));
    setPipeline(Math.min(i * 3700, 342000));
    setRisk(Math.min(i / 5, 17));

    if (i >= 92) clearInterval(timer);
  }, 20);

  return () => clearInterval(timer);
}, []);
  const stats = [
    ["Sales Opportunities", "£48,231"],
    ["Customers At Risk", "17"],
    ["Quotes To Chase", "12"],
    ["Pricing Actions", "4"],
  ];

  const features = [
    ["AI Sales Intelligence", "Discover which customers are most likely to buy next."],
    ["Pricing Intelligence", "Protect margins with AI-driven pricing recommendations."],
    ["Customer Health", "Identify customers at risk before revenue is lost."],
    ["Ask Odin", "Ask questions in plain English and receive instant commercial insights."],
  ];

  const dashboardStats = [
  ["Revenue", `£${(revenue / 1000000).toFixed(2)}m`],
  ["Margin", `${margin.toFixed(1)}%`],
  ["Pipeline", `£${Math.round(pipeline / 1000)}k`],
  ["At Risk", `${Math.round(risk)}`],
];

  return (
    <main style={{ minHeight: "100vh", background: "#080808", color: "white", fontFamily: "Arial, sans-serif" }}>
      <nav style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "28px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "2px solid #D4AF37", display: "flex", alignItems: "center", justifyContent: "center", color: "#D4AF37", fontWeight: "bold" }}>O</div>
          <h2>OdinIQ</h2>
        </div>

        <div style={{ display: "flex", gap: "36px", alignItems: "center" }}>
          <span>Features</span><span>Solutions</span><span>About</span><span>Contact</span>
          <button style={{ background: "#D4AF37", color: "#080808", border: "none", borderRadius: "12px", padding: "14px 24px", fontWeight: "bold", cursor: "pointer" }}>Book Demo</button>
        </div>
      </nav>

      <section style={{ maxWidth: "1200px", margin: "70px auto", padding: "0 32px", display: "grid", gridTemplateColumns: "1fr 460px", gap: "80px", alignItems: "center" }}>
        <div>
          <p style={{ color: "#D4AF37", fontWeight: "bold", letterSpacing: "2px" }}>AI COMMERCIAL INTELLIGENCE</p>
          <h1 style={{ fontSize: "72px", lineHeight: "1.05", margin: "24px 0" }}>Price smarter.<br />Sell better.<br />Win more.</h1>
          <p style={{ color: "#B8B8B8", fontSize: "24px", lineHeight: "1.6", maxWidth: "700px" }}>
            OdinIQ helps businesses turn sales, pricing and customer data into clear commercial decisions using AI.
          </p>

          <div style={{ display: "flex", gap: "18px", marginTop: "40px" }}>
            <button style={{ background: "#D4AF37", color: "#080808", border: "none", borderRadius: "14px", padding: "18px 30px", fontWeight: "bold", fontSize: "16px" }}>Request Demo</button>
            <button style={{ background: "transparent", color: "white", border: "1px solid #444", borderRadius: "14px", padding: "18px 30px", fontWeight: "bold", fontSize: "16px" }}>Watch Preview</button>
          </div>
        </div>

        <div style={{ background: "#181818", border: "1px solid #2C2C2C", borderRadius: "28px", padding: "28px" }}>
          <p style={{ color: "#BBBBBB" }}>Commercial Score</p>
          <h2 style={{ fontSize: "72px", margin: "10px 0" }}>{score}% </h2>
          <p style={{ color: "#D4AF37" }}>Strong growth potential detected</p>

          <div style={{ marginTop: "34px" }}>
            {stats.map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #2A2A2A", padding: "18px 0" }}>
                <span style={{ color: "#B8B8B8" }}>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "26px", background: "rgba(212,175,55,.08)", border: "1px solid rgba(212,175,55,.25)", borderRadius: "18px", padding: "18px" }}>
            Odin recommends contacting 5 customers today.<br />
            Estimated opportunity:<strong style={{ color: "#D4AF37" }}> £18,420</strong>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 32px 100px" }}>
        <p style={{ color: "#D4AF37", fontWeight: "bold", letterSpacing: "2px" }}>WHY ODINIQ</p>
        <h2 style={{ fontSize: "54px", margin: "18px 0 50px" }}>Everything your commercial<br />team needs.</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "24px" }}>
          {features.map(([title, text]) => (
            <div key={title} style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: "22px", padding: "32px" }}>
              <h3 style={{ fontSize: "24px", marginBottom: "16px" }}>{title}</h3>
              <p style={{ color: "#B8B8B8", lineHeight: "1.7" }}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px 32px 120px" }}>
        <p style={{ color: "#D4AF37", fontWeight: "bold", letterSpacing: "2px" }}>SEE ODINIQ IN ACTION</p>
        <h2 style={{ fontSize: "54px", margin: "18px 0 50px" }}>A commercial command centre<br />powered by AI.</h2>

        <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: "30px", padding: "34px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "18px", marginBottom: "30px" }}>
            {dashboardStats.map(([label, value]) => (
              <div key={label} style={{ background: "#0E0E0E", border: "1px solid #252525", borderRadius: "18px", padding: "22px" }}>
                <p style={{ color: "#B8B8B8" }}>{label}</p>
                <h3 style={{ fontSize: "30px", marginTop: "10px" }}>{value}</h3>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div style={{ background: "#0E0E0E", border: "1px solid #252525", borderRadius: "22px", padding: "28px" }}>
              <h3 style={{ fontSize: "24px", marginBottom: "20px" }}>Odin Recommendations</h3>
              
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "20px" }}>

  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
    <span style={{
      background:"#2E7D32",
      color:"white",
      padding:"4px 10px",
      borderRadius:"20px",
      fontSize:"12px",
      fontWeight:"bold"
    }}>
      HIGH
    </span>

    <span>Chase MKM Warrington quote worth £14,800.</span>
  </div>

  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
    <span style={{
      background:"#EF6C00",
      color:"white",
      padding:"4px 10px",
      borderRadius:"20px",
      fontSize:"12px",
      fontWeight:"bold"
    }}>
      PRICING
    </span>

    <span>Increase MLCP pipe pricing by 2.4%.</span>
  </div>

  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
    <span style={{
      background:"#C62828",
      color:"white",
      padding:"4px 10px",
      borderRadius:"20px",
      fontSize:"12px",
      fontWeight:"bold"
    }}>
      RISK
    </span>

    <span>Contact 5 customers showing reduced spend.</span>
  </div>

  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
    <span style={{
      background:"#1565C0",
      color:"white",
      padding:"4px 10px",
      borderRadius:"20px",
      fontSize:"12px",
      fontWeight:"bold"
    }}>
      UPSELL
    </span>

    <span>Promote manifold bundles to pipe-only buyers.</span>
  </div>

</div>
              
            </div>

            <div style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "22px", padding: "28px" }}>
             <h3 style={{ fontSize: "24px", marginBottom: "20px" }}>
  Ask Odin
</h3>

<p style={{ color: "#B8B8B8", marginBottom: "16px" }}>
  Ask a commercial question.
</p>

<input
  value={question}
  onChange={(e) => setQuestion(e.target.value)}
  placeholder="Which customers should I contact today?"
  style={{
    width: "100%",
    padding: "16px",
    background: "#080808",
    color: "white",
    border: "1px solid #333",
    borderRadius: "12px",
    fontSize: "16px",
    marginBottom: "16px",
  }}
/>

<button
onClick={() => {
  setThinking(true);
  setAnswer("");
  setDisplayAnswer("");

  

  setTimeout(() => {
    const q = question.toLowerCase();

    if (q.includes("customer") || q.includes("contact") || q.includes("call")) {
      setAnswer(
        "Odin recommends contacting MKM Warrington, Huws Gray and City Plumbing today. Estimated combined opportunity: £32,400."
      );
    } else if (q.includes("price") || q.includes("pricing") || q.includes("margin")) {
      setAnswer(
        "Odin recommends increasing MLCP pipe pricing by 2.4%. Estimated annual margin improvement: £18,600."
      );
    } else if (q.includes("risk") || q.includes("losing") || q.includes("decline")) {
      setAnswer(
        "Five customers are showing declining spend. Huws Gray is down 18%, City Plumbing is down 11%, and BPS has not ordered in 21 days."
      );
    } else if (q.includes("quote") || q.includes("chase")) {
      setAnswer(
        "There are 12 quotes to chase. Highest priority: MKM Warrington (£14,800), followed by Newark Plumbing (£7,450)."
      );
    } else {
      setAnswer(
        "Odin recommends focusing on pricing opportunities, customer retention and quote follow-ups today."
      );
    }

    setThinking(false);
  }, 900);
}} 
  style={{
    background: "#D4AF37",
    color: "#080808",
    border: "none",
    padding: "14px 24px",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
    marginBottom: "20px",
  }}
>
  Ask Odin
</button>

{thinking && (
  <div
    style={{
      background: "#080808",
      borderRadius: "16px",
      padding: "20px",
      lineHeight: "1.7",
      marginTop: "20px",
      color: "#D4AF37",
      fontWeight: "bold",
    }}
  >
    🧠 Odin is thinking...
  </div>
)}

{answer && (
  <div
    style={{
      background: "#080808",
      borderRadius: "16px",
      padding: "20px",
      lineHeight: "1.7",
    }}
  >
    {displayAnswer}
  </div>
)} 
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
