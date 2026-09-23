"use client";

import { useState } from "react";
import Link from "next/link";

const services = [
  {
    number: "01",
    title: "Sales Intelligence",
    text: "Understand what is selling, where growth is coming from and where revenue may be at risk.",
    capabilities: [
      "Sales trends and year-on-year comparisons",
      "Customer growth and decline detection",
      "Sales by customer, branch, region and salesperson",
      "Buying-group and national-account performance",
      "Best-selling and declining products",
      "Customers who have stopped or reduced buying",
      "Commercial opportunities requiring attention",
      "Proactive sales alerts from Odin",
    ],
  },
  {
    number: "02",
    title: "Customer Intelligence",
    text: "Bring customer behaviour, relationships and commercial history together in one place.",
    capabilities: [
      "Complete customer commercial overview",
      "Customer purchasing history",
      "Branch and national-account structures",
      "Buying-group relationships",
      "Customer notes and important information",
      "Credit limits and payment information",
      "Customer activity and engagement trends",
      "Automatic identification of customers requiring attention",
    ],
  },
  {
    number: "03",
    title: "Product & Stock",
    text: "Understand demand, seasonality and stock movement before they become operational problems.",
    capabilities: [
      "Product sales history",
      "Monthly demand and seasonality",
      "Best sellers and slow-moving products",
      "Year-on-year product comparisons",
      "Supplier and product-range analysis",
      "Stock-level intelligence",
      "Upcoming demand warnings",
      "Product aliases and alternative product codes",
    ],
  },
  {
    number: "04",
    title: "Profit & Margin",
    text: "Move beyond turnover and understand the commercial value behind customers and products.",
    capabilities: [
      "Customer profitability",
      "Product profitability",
      "True margin visibility for authorised users",
      "Sales versus cost analysis",
      "Commercial agreement impact",
      "Rebate and discount awareness",
      "Margin movement and risk identification",
      "Role-controlled access to sensitive financial data",
    ],
  },
  {
    number: "05",
    title: "Quotes & Opportunities",
    text: "Track quotations, conversion and follow-up opportunities before potential revenue disappears.",
    capabilities: [
      "Quotation history",
      "Quote-to-order conversion",
      "Conversion by team member",
      "Customer conversion trends",
      "Outstanding opportunities",
      "Quotes requiring follow-up",
      "Lost opportunity analysis",
      "Commercial opportunity alerts",
    ],
  },
  {
    number: "06",
    title: "Warehouse & Dispatch",
    text: "Create a clear operational trail from order through picking, loading and dispatch.",
    capabilities: [
      "Sales-order warehouse workflow",
      "Picking and dispatch status",
      "Order investigation tracking",
      "Pre-dispatch photographs",
      "Video evidence where required",
      "Proof of goods leaving the warehouse",
      "Supporting delivery records",
      "Clear operational audit trail",
    ],
  },
  {
    number: "07",
    title: "Commercial Agreements",
    text: "Keep discounts, rebates and important customer agreements visible and controlled.",
    capabilities: [
      "Customer commercial agreements",
      "Discount structures",
      "Rebate arrangements",
      "Buying-group terms",
      "Agreement start and renewal dates",
      "Supporting notes and documentation",
      "Commercial obligations",
      "Renewal and review reminders",
    ],
  },
  {
    number: "08",
    title: "Purchasing Intelligence",
    text: "Use sales history, demand and supplier information to make better purchasing decisions.",
    capabilities: [
      "Historic purchasing requirements",
      "Product demand forecasting support",
      "Seasonal demand visibility",
      "Previous-year demand comparisons",
      "Supplier lead-time awareness",
      "Stock requirement analysis",
      "Products requiring purchasing attention",
      "Supplier-level ordering intelligence",
    ],
  },
  {
    number: "09",
    title: "Expenses",
    text: "Capture expenses and supporting documents while connecting spend to the wider business.",
    capabilities: [
      "Expense recording",
      "Receipt and document capture",
      "Expense categorisation",
      "Employee expense visibility",
      "Commercial cost tracking",
      "Supporting-document storage",
      "Approval workflow capability",
      "Business-spend reporting",
    ],
  },
  {
    number: "10",
    title: "People & Leave",
    text: "Manage practical people workflows without creating another disconnected system.",
    capabilities: [
      "Holiday and leave requests",
      "Department-level leave rules",
      "Approval workflows",
      "Employee responsibilities",
      "Training information",
      "Important people records",
      "Role and permission management",
      "Company-specific people processes",
    ],
  },
  {
    number: "11",
    title: "Marketing & Investment",
    text: "Understand where commercial investment is going and which customers or branches it supports.",
    capabilities: [
      "Marketing budget tracking",
      "Campaign activity",
      "Merchandise purchasing",
      "Branch merchandise allocation",
      "Customer investment tracking",
      "Commercial support activity",
      "Campaign notes and records",
      "Visibility of investment alongside sales performance",
    ],
  },
  {
    number: "12",
    title: "Documents & Audit",
    text: "Keep important evidence, records and investigations connected to the activity they relate to.",
    capabilities: [
      "Commercial document storage",
      "Order investigation records",
      "Audit statuses and notes",
      "Supporting evidence",
      "User and action traceability",
      "Operational records",
      "Transaction-linked documentation",
      "Centralised business evidence",
    ],
  },
];

const exampleSignals = [
  {
    label: "OPPORTUNITY",
    title: "Customer demand is increasing",
    text: "A key account is purchasing more frequently than the same period last year.",
  },
  {
    label: "ATTENTION",
    title: "Customer spend has slowed",
    text: "Odin has detected a meaningful reduction in recent purchasing activity.",
  },
  {
    label: "STOCK",
    title: "Seasonal demand is approaching",
    text: "Historic product movement indicates a higher-demand period is coming.",
  },
];

export default function Home() {
  const [selectedService, setSelectedService] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-4 text-white no-underline"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#d4af37] text-lg font-bold text-[#d4af37]">
              O
            </div>

            <div>
              <div className="text-3xl font-bold tracking-wide leading-none">
                <span className="text-white">Odin</span>
                <span className="text-[#d4af37]">IQ</span>
              </div>
              <div className="mt-1.5 text-[11px] uppercase tracking-[0.28em] text-white/40">
                Commercial Intelligence
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white no-underline transition hover:border-white/30 sm:block"
            >
              Client Login
            </Link>

            <a
              href="#demo"
              className="rounded-xl bg-[#d4af37] px-5 py-3 text-sm font-bold text-[#080808] no-underline transition hover:opacity-90"
            >
              Explore Odin
            </a>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#d4af37]/5 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-16 px-6 pb-24 pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:pb-32 lg:pt-28">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#d4af37]">
              Business intelligence that leads to action
            </p>

            <h1 className="mt-7 max-w-4xl text-5xl font-bold leading-[1.04] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Your business already
              <br />
              has the data.
              <br />
              <span className="text-[#d4af37]">
                Odin tells you what to do with it.
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-white/60 sm:text-xl">
              OdinIQ connects the information already flowing
              through your business and turns it into clear
              actions, opportunities and warnings across sales,
              customers, stock, profitability and operations.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#demo"
                className="rounded-xl bg-[#d4af37] px-7 py-4 font-bold text-[#080808] no-underline"
              >
                Explore Live Demo
              </a>

              <a
                href="#contact"
                className="rounded-xl border border-white/15 px-7 py-4 font-bold text-white no-underline"
              >
                Book a Demo
              </a>
            </div>

            <p className="mt-7 text-sm text-white/35">
              One platform. The services your business needs.
            </p>
          </div>

          <div className="self-center rounded-[28px] border border-white/10 bg-[#111111] p-5 shadow-2xl shadow-black/40 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">
                  Odin Intelligence
                </p>
                <h2 className="mt-2 text-xl font-bold">
                  What needs your attention
                </h2>
              </div>

              <span className="rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1 text-xs font-bold text-[#d4af37]">
                LIVE
              </span>
            </div>

            <div className="mt-3">
              {exampleSignals.map((signal) => (
                <div
                  key={signal.title}
                  className="border-b border-white/10 py-5 last:border-0"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#d4af37]" />

                    <div>
                      <p className="text-[10px] font-bold tracking-[0.18em] text-[#d4af37]">
                        {signal.label}
                      </p>

                      <h3 className="mt-1 font-semibold">
                        {signal.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-white/45">
                        {signal.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d4af37]">
                Ask Odin
              </p>

              <p className="mt-3 text-sm text-white/60">
                &ldquo;What changed in my business this week?&rdquo;
              </p>

              <p className="mt-3 text-sm leading-6 text-white/85">
                I found changes across sales, customer activity
                and product demand. Here are the areas I would
                review first.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="services"
        className="border-y border-white/10 bg-[#0c0c0c]"
      >
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#d4af37]">
              Build Odin around your business
            </p>

            <h2 className="mt-5 text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
              One platform.
              <br />
              The services you need.
            </h2>

            <p className="mt-6 text-lg leading-8 text-white/55">
              OdinIQ is designed as a modular commercial
              platform. Start with the areas that matter most to
              your business and add more capability as your
              requirements develop.
            </p>
          </div>

          <div className="mt-14 space-y-px overflow-hidden rounded-3xl border border-white/10 bg-white/10">
            {Array.from({ length: Math.ceil(services.length / 3) }).map((_, rowIndex) => {
              const rowStart = rowIndex * 3;
              const rowServices = services.slice(rowStart, rowStart + 3);
              const selectedInRow =
                selectedService !== null &&
                selectedService >= rowStart &&
                selectedService < rowStart + rowServices.length;
              const activeService =
                selectedInRow && selectedService !== null
                  ? services[selectedService]
                  : null;

              return (
                <div key={rowIndex}>
                  <div className="grid gap-px bg-white/10 md:grid-cols-2 lg:grid-cols-3">
                    {rowServices.map((service, rowServiceIndex) => {
                      const serviceIndex = rowStart + rowServiceIndex;
                      const selected = selectedService === serviceIndex;

                      return (
                        <button
                          key={service.number}
                          type="button"
                          onClick={() =>
                            setSelectedService((current) =>
                              current === serviceIndex ? null : serviceIndex
                            )
                          }
                          aria-expanded={selected}
                          className={`group cursor-pointer p-7 text-left transition ${
                            selected
                              ? "bg-[#1a180f]"
                              : "bg-[#101010] hover:bg-[#151515]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-[0.2em] text-[#d4af37]">
                              {service.number}
                            </span>

                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm transition ${
                                selected
                                  ? "border-[#d4af37] bg-[#d4af37] text-[#080808]"
                                  : "border-white/10 text-white/30 group-hover:border-[#d4af37]/50 group-hover:text-[#d4af37]"
                              }`}
                            >
                              {selected ? "−" : "+"}
                            </span>
                          </div>

                          <h3
                            className={`mt-8 text-xl font-bold ${
                              selected ? "text-[#d4af37]" : "text-white"
                            }`}
                          >
                            {service.title}
                          </h3>

                          <p className="mt-4 text-sm leading-6 text-white/45">
                            {service.text}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {activeService && (
                    <div className="border-t border-[#d4af37]/20 bg-[#11100c]">
                      <div className="grid gap-0 lg:grid-cols-[0.8fr_1.2fr]">
                        <div className="border-b border-white/10 p-8 lg:border-b-0 lg:border-r lg:p-10">
                          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d4af37]">
                            Service {activeService.number}
                          </p>

                          <h3 className="mt-5 text-3xl font-bold tracking-[-0.02em]">
                            {activeService.title}
                          </h3>

                          <p className="mt-5 max-w-md text-base leading-7 text-white/55">
                            {activeService.text}
                          </p>

                          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/5 px-4 py-2 text-xs font-semibold text-[#d4af37]">
                            Available as part of your OdinIQ configuration
                          </div>
                        </div>

                        <div className="p-8 lg:p-10">
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">
                            What this can include
                          </p>

                          <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            {activeService.capabilities.map((capability) => (
                              <div
                                key={capability}
                                className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#080808] p-4"
                              >
                                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#d4af37]" />
                                <span className="text-sm leading-6 text-white/70">
                                  {capability}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-14 px-6 py-24 lg:grid-cols-2 lg:px-8 lg:py-32">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#d4af37]">
            Intelligence across the platform
          </p>

          <h2 className="mt-5 text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
            Don't just report what happened.
            <br />
            Understand what to do next.
          </h2>

          <p className="mt-7 max-w-xl text-lg leading-8 text-white/55">
            Traditional systems store information in separate
            places. Odin is being designed to connect those
            areas so that commercial decisions can be made with
            more of the picture in view.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#101010] p-7 sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37]">
            Ask Odin
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-[#080808] p-5">
            <p className="text-sm text-white/45">
              Ask a question
            </p>

            <p className="mt-2 text-lg font-medium">
              Which products are likely to need attention before
              our next supplier order?
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-5">
            <p className="text-sm leading-7 text-white/70">
              Odin can bring together product movement,
              seasonality and recent sales trends to highlight
              the products worth reviewing first.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {[
              "Sales",
              "Customers",
              "Products",
              "Stock",
              "Profit",
              "Operations",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/45"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section
        id="demo"
        className="border-y border-white/10 bg-[#0c0c0c]"
      >
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#d4af37]">
              Explore OdinIQ
            </p>

            <h2 className="mx-auto mt-5 max-w-4xl text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
              See how Odin turns everyday business data into
              something you can act on.
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/55">
              Explore a demonstration environment using
              fictional company data. No customer information
              or live commercial data is used in the public
              demonstration.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-5xl rounded-[30px] border border-white/10 bg-[#111111] p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Revenue", "£2.84m"],
                ["Customers", "428"],
                ["Opportunities", "31"],
                ["Signals", "8"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-[#080808] p-5"
                >
                  <p className="text-xs uppercase tracking-[0.14em] text-white/35">
                    {label}
                  </p>

                  <p className="mt-3 text-2xl font-bold">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-white/10 bg-[#080808] p-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d4af37]">
                  Commercial Signals
                </p>

                <div className="mt-5 space-y-4">
                  <div className="border-b border-white/10 pb-4">
                    <p className="font-semibold">
                      Growth opportunity detected
                    </p>
                    <p className="mt-1 text-sm text-white/40">
                      Purchasing frequency has increased across
                      a group of active customers.
                    </p>
                  </div>

                  <div className="border-b border-white/10 pb-4">
                    <p className="font-semibold">
                      Seasonal demand approaching
                    </p>
                    <p className="mt-1 text-sm text-white/40">
                      Several products historically strengthen
                      during the next purchasing period.
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold">
                      Customer activity requires review
                    </p>
                    <p className="mt-1 text-sm text-white/40">
                      Recent sales are below the customer's
                      established purchasing pattern.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d4af37]">
                  Demonstration Environment
                </p>

                <h3 className="mt-5 text-2xl font-bold">
                  Explore Odin for yourself.
                </h3>

                <p className="mt-4 text-sm leading-7 text-white/55">
                  Move around a fictional business, explore the
                  different areas of Odin and see how information
                  can be brought together in one commercial
                  workspace.
                </p>

                <button
                  type="button"
                  className="mt-7 w-full cursor-not-allowed rounded-xl bg-[#d4af37] px-5 py-4 font-bold text-[#080808] opacity-60"
                  title="Live demo access will be connected next"
                >
                  Explore Live Demo — Coming Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32"
      >
        <div className="rounded-[32px] border border-[#d4af37]/20 bg-gradient-to-br from-[#17150c] to-[#0d0d0d] px-7 py-14 text-center sm:px-12 sm:py-20">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#d4af37]">
            Built around your business
          </p>

          <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
            Start with the problems you want Odin to solve.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/55">
            OdinIQ can be configured around the services,
            information and commercial workflows that matter to
            your organisation.
          </p>

          <a
            href="mailto:hello@odiniq.co.uk"
            className="mt-9 inline-block rounded-xl bg-[#d4af37] px-8 py-4 font-bold text-[#080808] no-underline"
          >
            Talk to OdinIQ
          </a>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-white/35 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>© 2026 OdinIQ</span>

          <div className="flex gap-6">
            <Link
              href="/login"
              className="text-white/45 no-underline"
            >
              Client Login
            </Link>

            <span>Commercial Intelligence</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
