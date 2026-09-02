type InsightPriority = "high" | "medium" | "opportunity";

type Insight = {
  title: string;
  description: string;
  priority: InsightPriority;
};

const insights: Insight[] = [
  {
    title: "Huws Gray sales are down 18%",
    description:
      "No manifold orders have been recorded recently. Review account activity and contact the commercial team.",
    priority: "high",
  },
  {
    title: "MKM is approaching its rebate target",
    description:
      "Current performance is estimated at 92% of target. A focused sales push could secure the next rebate tier.",
    priority: "medium",
  },
  {
    title: "Newark credit exposure needs attention",
    description:
      "The account is approaching its current credit limit. Review outstanding balances before approving further orders.",
    priority: "medium",
  },
  {
    title: "JT Plumbing presents a sales opportunity",
    description:
      "Recent buying behaviour suggests potential demand for controls and manifold products.",
    priority: "opportunity",
  },
];

function getPriorityStyles(priority: InsightPriority) {
  if (priority === "high") {
    return {
      dot: "bg-red-500",
      badge: "bg-red-50 text-red-700",
      label: "High priority",
    };
  }

  if (priority === "medium") {
    return {
      dot: "bg-amber-500",
      badge: "bg-amber-50 text-amber-700",
      label: "Attention",
    };
  }

  return {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
    label: "Opportunity",
  };
}

export default function OdinIntelligence() {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-sm">
      <div className="border-b border-slate-800 px-6 py-5">
        <p className="text-sm font-semibold text-amber-400">
          Odin Intelligence
        </p>

        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Recommended commercial actions
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Priority signals based on sales, pricing and customer activity.
            </p>
          </div>

          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
            4 active signals
          </span>
        </div>
      </div>

      <div className="divide-y divide-slate-800">
        {insights.map((insight) => {
          const styles = getPriorityStyles(insight.priority);

          return (
            <div
              key={insight.title}
              className="flex gap-4 px-6 py-5 transition hover:bg-slate-900"
            >
              <span
                className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`}
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold text-white">
                    {insight.title}
                  </h3>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles.badge}`}
                  >
                    {styles.label}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {insight.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/60 px-6 py-4">
        <p className="text-xs text-slate-400">
          These are temporary demonstration insights.
        </p>

        <button
          type="button"
          className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
        >
          Open full analysis
        </button>
      </div>
    </section>
  );
}