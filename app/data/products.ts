import { products } from "../data/products";

export default function ProductsPage() {
  const analysedProducts = products.map((product) => {
    const netSell = product.listPrice * (1 - product.discount / 100);
    const marginValue = netSell - product.cost;
    const marginPercent = (marginValue / netSell) * 100;

    let status = "Strong";

    if (marginPercent < 15) status = "Margin Risk";
    else if (marginPercent < 30) status = "Review";
    else if (marginPercent > 45) status = "Opportunity";

    return {
      ...product,
      netSell,
      marginValue,
      marginPercent,
      status,
    };
  });

  return (
    <main style={{ minHeight: "100vh", background: "#080808", color: "white", fontFamily: "Arial, sans-serif", padding: "40px" }}>
      <h1 style={{ fontSize: "54px", marginBottom: "12px" }}>Product Intelligence</h1>
      <p style={{ color: "#B8B8B8", fontSize: "20px", marginBottom: "40px" }}>
        Analyse buying cost, list price, merchant discount and true margin.
      </p>

      <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: "28px", padding: "28px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: "#D4AF37", textAlign: "left" }}>
              <th style={{ padding: "16px" }}>Code</th>
              <th style={{ padding: "16px" }}>Description</th>
              <th style={{ padding: "16px" }}>Cost</th>
              <th style={{ padding: "16px" }}>List Price</th>
              <th style={{ padding: "16px" }}>Discount</th>
              <th style={{ padding: "16px" }}>Net Sell</th>
              <th style={{ padding: "16px" }}>Margin</th>
              <th style={{ padding: "16px" }}>Odin Status</th>
            </tr>
          </thead>

          <tbody>
            {analysedProducts.map((product) => (
              <tr key={product.code} style={{ borderTop: "1px solid #2A2A2A" }}>
                <td style={{ padding: "16px" }}>{product.code}</td>
                <td style={{ padding: "16px" }}>{product.description}</td>
                <td style={{ padding: "16px" }}>£{product.cost.toFixed(2)}</td>
                <td style={{ padding: "16px" }}>£{product.listPrice.toFixed(2)}</td>
                <td style={{ padding: "16px" }}>{product.discount}%</td>
                <td style={{ padding: "16px" }}>£{product.netSell.toFixed(2)}</td>
                <td style={{ padding: "16px" }}>
                  £{product.marginValue.toFixed(2)} / {product.marginPercent.toFixed(1)}%
                </td>
                <td style={{ padding: "16px", color: "#D4AF37" }}>{product.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}