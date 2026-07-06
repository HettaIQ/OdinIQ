export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0B0B0D",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            border: "3px solid #D4AF37",
            margin: "0 auto 30px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "52px",
            color: "#D4AF37",
            fontWeight: "bold",
          }}
        >
          O
        </div>

        <h1
          style={{
            fontSize: "64px",
            marginBottom: "10px",
          }}
        >
          OdinIQ
        </h1>

        <p
          style={{
            color: "#B8B8B8",
            fontSize: "22px",
          }}
        >
          The Intelligence Behind Every Sale.
        </p>
      </div>
    </main>
  );
}