import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { saveOdinDevelopmentHours } from "@/app/actions/saveOdinDevelopmentHours";
import { saveOdinExpense } from "@/app/actions/saveOdinExpense";

export default async function OdinCostsPage() {
  const user = await requireAuth();

  if (user.platformRole !== "SUPER_ADMIN") {
    notFound();
  }

  const [settings, expenses, development] =
    await Promise.all([
      prisma.odinCostSettings.findFirst(),
      prisma.odinExpense.findMany(),
      prisma.odinDevelopmentTime.findMany(),
    ]);

  const cashExpenditure = expenses.reduce(
    (total, expense) => total + expense.grossAmount,
    0
  );

  const loggedDevelopmentValue = development.reduce(
    (total, entry) => total + entry.hours * entry.hourlyRate,
    0
  );

  const openingDevelopmentValue =
    settings?.openingDevelopmentValue ?? 0;

  const developmentInvestment =
    openingDevelopmentValue + loggedDevelopmentValue;

  const totalInvestment =
    cashExpenditure + developmentInvestment;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          OdinIQ Business Costs
        </h1>
        <p className="text-gray-500">
          Private financial dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-6">
          <p>Cash Expenditure</p>
          <h2 className="text-2xl font-bold">
            {formatCurrency(cashExpenditure)}
          </h2>
        </div>

        <div className="rounded-xl border p-6">
          <p>Development Investment</p>
          <h2 className="text-2xl font-bold">
            {formatCurrency(developmentInvestment)}
          </h2>
        </div>

        <div className="rounded-xl border p-6">
          <p>Total Project Investment</p>
          <h2 className="text-2xl font-bold">
            {formatCurrency(totalInvestment)}
          </h2>
        </div>
      </div>

      <section className="rounded-xl border p-6">
        <h2 className="text-xl font-semibold">
          Development Time
        </h2>

        <p>
          Hourly rate: {formatCurrency(settings?.hourlyRate ?? 50)}
        </p>

        <p>
          Opening hours: {settings?.openingDevelopmentHours ?? 0}
        </p>

        <p>
          Additional logged hours:{" "}
          {development.reduce(
            (total, entry) => total + entry.hours,
            0
          )}
        </p>
      </section>
<section className="rounded-xl border p-6">
  <h2 className="text-xl font-semibold">
    Add Weekly Development Hours
  </h2>

  <p className="mt-2 text-sm text-gray-500">
    Record your weekly OdinIQ development time.
    Hours are valued at your saved hourly rate.
  </p>

  <form
    action={saveOdinDevelopmentHours}
    className="mt-5 grid max-w-xl gap-4"
  >
    <label className="grid gap-1">
      <span className="font-medium">
        Week commencing (Monday)
      </span>
      <input
        type="date"
        name="week"
        required
        className="rounded-lg border p-3"
      />
    </label>

    <label className="grid gap-1">
      <span className="font-medium">
        Hours worked
      </span>
      <input
        type="number"
        name="hours"
        min="0.25"
        max="168"
        step="0.25"
        defaultValue="35"
        required
        className="rounded-lg border p-3"
      />
    </label>

    <label className="grid gap-1">
      <span className="font-medium">
        Work completed
      </span>
      <textarea
        name="description"
        rows={3}
        placeholder="e.g. Commercial intelligence, Odin Costs module, database development"
        className="rounded-lg border p-3"
      />
    </label>

    <button
      type="submit"
      className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
    >
      Save Weekly Hours
    </button>
  </form>
</section>
      <section className="rounded-xl border p-6">
        <h2 className="text-xl font-semibold">
          Business Expenses
        </h2>

        <p>
          {expenses.length} expenses recorded
        </p>
      </section>
      <section className="rounded-xl border p-6">
  <h2 className="text-xl font-semibold">
    Add Business Expense
  </h2>

  <p className="mt-2 text-sm text-gray-500">
    Record OdinIQ setup costs, subscriptions,
    hosting, email and other business expenditure.
  </p>

  <form
    action={saveOdinExpense}
    className="mt-6 grid max-w-2xl gap-4"
  >
    <label className="grid gap-1">
      <span className="font-medium">Expense Date</span>
      <input
        type="date"
        name="expenseDate"
        required
        className="rounded-lg border p-3"
      />
    </label>

    <label className="grid gap-1">
      <span className="font-medium">Category</span>
      <select
        name="category"
        required
        className="rounded-lg border p-3"
      >
        <option value="">Select category</option>
        <option value="Company Setup">
          Company Registration / Setup
        </option>
        <option value="Hosting">Website Hosting</option>
        <option value="Email">Email Services</option>
        <option value="Domain">Domain Names</option>
        <option value="AI API">AI / API Usage</option>
        <option value="Software">
          Software Subscriptions
        </option>
        <option value="Marketing">
          Marketing / Advertising
        </option>
        <option value="Professional Fees">
          Accountancy / Legal
        </option>
        <option value="Equipment">Equipment</option>
        <option value="Other">Other</option>
      </select>
    </label>

    <label className="grid gap-1">
      <span className="font-medium">Supplier</span>
      <input
        type="text"
        name="supplier"
        placeholder="e.g. IONOS, Companies House, OpenAI"
        maxLength={200}
        required
        className="rounded-lg border p-3"
      />
    </label>

    <label className="grid gap-1">
      <span className="font-medium">Description</span>
      <input
        type="text"
        name="description"
        placeholder="e.g. OdinIQ domain renewal"
        maxLength={1000}
        required
        className="rounded-lg border p-3"
      />
    </label>

    <div className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-1">
        <span className="font-medium">
          Amount Paid (£ including VAT)
        </span>
        <input
          type="number"
          name="grossAmount"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          required
          className="rounded-lg border p-3"
        />
      </label>

      <label className="grid gap-1">
        <span className="font-medium">VAT Rate</span>
        <select
          name="vatRate"
          defaultValue="20"
          className="rounded-lg border p-3"
        >
          <option value="20">20%</option>
          <option value="5">5%</option>
          <option value="0">0%</option>
        </select>
      </label>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-1">
        <span className="font-medium">
          Payment Frequency
        </span>
        <select
          name="frequency"
          defaultValue="ONE_OFF"
          className="rounded-lg border p-3"
        >
          <option value="ONE_OFF">One-off</option>
          <option value="MONTHLY">Monthly</option>
          <option value="ANNUAL">Annual</option>
        </select>
      </label>

      <label className="grid gap-1">
        <span className="font-medium">
          Funded By
        </span>
        <select
          name="fundedBy"
          defaultValue="PERSONAL"
          className="rounded-lg border p-3"
        >
          <option value="PERSONAL">
            Personally Funded
          </option>
          <option value="COMPANY">
            OdinIQ Company
          </option>
        </select>
      </label>
    </div>

    <label className="grid gap-1">
      <span className="font-medium">
        Payment Method (optional)
      </span>
      <select
        name="paymentMethod"
        defaultValue=""
        className="rounded-lg border p-3"
      >
        <option value="">Not specified</option>
        <option value="Personal Card">Personal Card</option>
        <option value="Company Card">Company Card</option>
        <option value="Bank Transfer">Bank Transfer</option>
        <option value="Direct Debit">Direct Debit</option>
        <option value="Other">Other</option>
      </select>
    </label>

    <label className="grid gap-1">
      <span className="font-medium">
        Notes (optional)
      </span>
      <textarea
        name="notes"
        rows={3}
        maxLength={5000}
        placeholder="Additional expense information"
        className="rounded-lg border p-3"
      />
    </label>

    <button
      type="submit"
      className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
    >
      Save Business Expense
    </button>
  </form>
</section>
    </main>
  );
}