type StatCardProps = {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
};

export default function StatCard({
  label,
  value,
  change,
  trend = "neutral",
}: StatCardProps) {
  const trendClass =
    trend === "up"
      ? "text-emerald-600"
      : trend === "down"
        ? "text-red-600"
        : "text-slate-500";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </p>

      {change ? (
        <p className={`mt-3 text-sm font-medium ${trendClass}`}>
          {change}
        </p>
      ) : null}
    </div>
  );
}
