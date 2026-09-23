"use client";

type SeasonalityRow = {
  month: string;
  historicalAverageQty: number;
  historicalAverageSales: number;
  historicalYearCount: number;
  previousQty: number;
  previousSales: number;
  currentQty: number;
  currentSales: number;
  isCurrentMonth: boolean;
  isFutureMonth: boolean;
};

type ProductSeasonalityCsvButtonProps = {
  productCode: string;
  previousYear: number;
  currentYear: number;
  rows: SeasonalityRow[];
};

function escapeCsvValue(
  value: string | number
) {
  const text = String(value);

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replace(
      /"/g,
      '""'
    )}"`;
  }

  return text;
}

export default function ProductSeasonalityCsvButton({
  productCode,
  previousYear,
  currentYear,
  rows,
}: ProductSeasonalityCsvButtonProps) {
  function downloadCsv() {
    const headers = [
      "Month",
      "Historic Avg Qty",
      `${previousYear} Qty`,
      `${currentYear} Qty`,
      "Historic Avg Sales",
      `${currentYear} Sales`,
      "Years",
      "Seasonality",
      "Period Status",
    ];

    const csvRows = rows.map((row) => {
      const seasonality =
        row.historicalAverageQty > 0
          ? "Historical"
          : "No History";

      const periodStatus =
        row.isCurrentMonth
          ? "MTD"
          : row.isFutureMonth
            ? "Future"
            : "Complete";

      return [
        row.month,
        row.historicalAverageQty.toFixed(
          2
        ),
        row.previousQty.toFixed(2),
        row.isFutureMonth
          ? ""
          : row.currentQty.toFixed(2),
        row.historicalAverageSales.toFixed(
          2
        ),
        row.isFutureMonth
          ? ""
          : row.currentSales.toFixed(2),
        row.historicalYearCount,
        seasonality,
        periodStatus,
      ]
        .map(escapeCsvValue)
        .join(",");
    });

    const csv = [
      headers
        .map(escapeCsvValue)
        .join(","),
      ...csvRows,
    ].join("\r\n");

    /*
     * Add UTF-8 BOM so Excel opens
     * pound signs and other characters
     * correctly.
     */
    const blob = new Blob(
      ["\uFEFF", csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    const safeProductCode =
      productCode.replace(
        /[^a-zA-Z0-9_-]/g,
        "-"
      );

    link.href = url;
    link.download =
      `${safeProductCode}-product-seasonality.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={downloadCsv}
      style={{
        marginTop: "12px",
        padding: "8px 12px",
        borderRadius: "7px",
        border:
          "1px solid #66571d",
        background: "#211e12",
        color: "#d4af37",
        fontSize: "13px",
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      Download CSV
    </button>
  );
}
