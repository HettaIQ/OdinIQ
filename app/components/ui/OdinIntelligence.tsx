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
              Priority signals based on sales,
              pricing and customer activity.
            </p>
          </div>

          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400">
            0 active signals
          </span>
        </div>
      </div>

      <div className="px-6 py-12 text-center">
        <div className="mx-auto max-w-lg">
          <h3 className="text-lg font-semibold text-white">
            No commercial insights yet
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Odin will analyse your sales,
            customers, products, pricing and
            commercial activity as data becomes
            available.
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Recommended actions and opportunities
            will appear here when Odin identifies
            something that needs your attention.
          </p>
        </div>
      </div>

      <div className="border-t border-slate-800 bg-slate-900/60 px-6 py-4">
        <p className="text-xs text-slate-500">
          Odin Intelligence uses your company&apos;s
          own commercial data to generate insights.
        </p>
      </div>
    </section>
  );
}