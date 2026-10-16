type RebateBreakdownRow = {
  period: string;
  sales: number;
  rebatePercent: number;
  estimated: number;
  actual: number | null;
  invoiceReference: string | null;
};

export default function RebateBreakdown({
  rows,
}: {
  rows: RebateBreakdownRow[];
}) {
  const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(value);

  return (
    <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-base font-bold text-slate-900">
        Rebate Breakdown
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        Quarterly and annual rebate estimates compared with actual claims.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3">Period</th>
              <th className="p-3 text-right">Sales</th>
              <th className="p-3 text-right">Rate</th>
              <th className="p-3 text-right">Estimated</th>
              <th className="p-3 text-right">Actual</th>
              <th className="p-3 text-right">Difference</th>
              <th className="p-3">Invoice Reference</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.period} className="border-t">
                <td className="p-3 font-semibold">{row.period}</td>
                <td className="p-3 text-right">
                  {formatMoney(row.sales)}
                </td>
                <td className="p-3 text-right">
                  {row.rebatePercent.toFixed(2)}%
                </td>
                <td className="p-3 text-right">
                  {formatMoney(row.estimated)}
                </td>
                <td className="p-3 text-right">
                  {row.actual === null
                    ? "Not claimed"
                    : formatMoney(row.actual)}
                </td>
                <td className="p-3 text-right">
                  {row.actual === null
                    ? "—"
                    : formatMoney(row.actual - row.estimated)}
                </td>
                <td className="p-3">
                  {row.invoiceReference ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}