
"use client";

import { useState } from "react";

const packages = [
  { name: "Starter", includedUsers: 3, includedModules: 2, discount: 0 },
  { name: "Business", includedUsers: 10, includedModules: 5, discount: 10 },
  { name: "Professional", includedUsers: 25, includedModules: 9, discount: 20 },
  { name: "Enterprise", includedUsers: 50, includedModules: 12, discount: 30 },
];

const modules = [
  "Sales Intelligence",
  "Customer Intelligence",
  "Product & Stock",
  "Profit & Margin",
  "Quotes & Opportunities",
  "Warehouse & Dispatch",
  "Commercial Agreements",
  "Purchasing Intelligence",
  "Expenses",
  "People & Leave",
  "Marketing & Investment",
  "Documents & Audit",
];

export default function OdinPackageBuilder() {
  const [selectedPackage, setSelectedPackage] = useState(1);
  const [users, setUsers] = useState(10);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  
const [corporateEnquiry, setCorporateEnquiry] = useState(false);


  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [requirements, setRequirements] = useState("");

  const [website, setWebsite] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [enquiryReference, setEnquiryReference] =
    useState<number | null>(null);


  const activePackage = packages[selectedPackage];

  const extraUsers = Math.max(
    0,
    users - activePackage.includedUsers
  );

  const additionalModules = Math.max(
    0,
    selectedModules.length - activePackage.includedModules
  );

const remainingModules = Math.max(
  0,
  activePackage.includedModules - selectedModules.length
);

  function choosePackage(index: number) {
    setSelectedPackage(index);
    setUsers(packages[index].includedUsers);
  }

  function toggleModule(moduleName: string) {
    setSelectedModules((current) =>
      current.includes(moduleName)
        ? current.filter((name) => name !== moduleName)
        : [...current, moduleName]
    );
      }
  async function submitQuote(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setSubmitError("");
    setEnquiryReference(null);

    try {
      const response = await fetch("/api/website-enquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName,
          contactName,
          email,
          telephone,
          requirements,
          website,
         packageName: corporateEnquiry
  ? "Corporate"
  : activePackage.name,
totalUsers: corporateEnquiry ? 0 : users,
selectedModules: corporateEnquiry ? [] : selectedModules,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to submit your enquiry."
        );
      }

      setEnquiryReference(result.reference);
      setShowQuoteForm(false);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }
  

  const quoteSubject = encodeURIComponent(
    `OdinIQ Annual Licence Enquiry - ${activePackage.name}`
  );

  const quoteBody = encodeURIComponent(
    [
      "Hello OdinIQ,",
      "",
      "I would like a quotation for the following annual licence:",
      "",
      `Package: Odin ${activePackage.name}`,
      `Licence period: 12 months`,
      `Total users: ${users}`,
      `Included users: ${activePackage.includedUsers}`,
      `Additional users: ${extraUsers}`,
      `Additional-user discount: ${activePackage.discount}%`,
      "",
      "Selected modules:",
      ...(
        selectedModules.length
          ? selectedModules.map((name) => `- ${name}`)
          : ["No modules selected yet"]
      ),
      "",
      `Included module allowance: ${activePackage.includedModules}`,
      `Additional chargeable modules: ${additionalModules}`,
      "",
      "Please contact me to discuss the annual licence.",
      "",
      "Company:",
      "Contact name:",
      "Telephone:",
    ].join("\n")
  );

  const quoteLink =
    `mailto:hello@odiniq.co.uk?subject=${quoteSubject}&body=${quoteBody}`;

  return (
    <section
      id="licensing"
      className="border-y border-white/10 bg-[#0c0c0c]"
    >
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">

        <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#d4af37]">
          Flexible annual licensing
        </p>

        <h2 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Build your OdinIQ.
        </h2>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">
          Choose a package that fits your business.
          Select the modules you need and add users as
          your team grows.
        </p>

        {/* PACKAGE SELECTION */}

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {packages.map((item, index) => {
            const selected = selectedPackage === index;

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => choosePackage(index)}
                aria-pressed={selected}
                className={`rounded-2xl border p-6 text-left transition ${
                  selected
                    ? "border-[#d4af37] bg-[#d4af37]/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/30"
                }`}
              >
                <p className="text-lg font-bold text-white">
                  Odin {item.name}
                </p>

                <p className="mt-5 text-3xl font-bold text-[#d4af37]">
                  {item.includedUsers}
                </p>

                <p className="mt-1 text-sm text-white/50">
                  Included users
                </p>

                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-sm text-white/70">
                    {item.includedModules} included modules
                  </p>

                  <p className="mt-2 text-sm text-white/70">
                    {item.discount === 0
                      ? "Standard additional-user rate"
                      : `${item.discount}% off additional users`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>


{/* CORPORATE LICENSING */}

<div className="mt-6 rounded-2xl border border-[#d4af37]/25 bg-gradient-to-r from-[#17150c] to-[#111111] p-6 md:p-8">
  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37]">
        Bespoke enterprise licensing
      </p>

      <h3 className="mt-3 text-2xl font-bold text-white">
        Odin Corporate
      </h3>

      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">
        Designed for larger organisations requiring tailored
        user allowances, multiple business units, advanced
        integrations and a configurable selection of OdinIQ modules.
      </p>

      <p className="mt-3 text-sm text-[#d4af37]">
        Bespoke annual licence and commercial terms.
      </p>
    </div>

   
<button
  type="button"
 
onClick={() => {
  setCorporateEnquiry(true);
  setShowQuoteForm(true);
  setSubmitError("");
  setEnquiryReference(null);

  setTimeout(() => {
    document.getElementById("odin-quote-form")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 100);
}}

  className="shrink-0 rounded-xl border border-[#d4af37] px-6 py-4 text-center text-sm font-bold text-[#d4af37] transition hover:bg-[#d4af37] hover:text-black"
>
  Discuss Corporate Licensing
</button>

  </div>
</div>


        {/* USER CONFIGURATION */}

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#111111] p-6 md:p-8">

          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-white">
                Your licence configuration
              </h3>

              <p className="mt-2 text-sm text-white/50">
                Odin {activePackage.name} - 12-month licence
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  setUsers((current) =>
                    Math.max(
                      activePackage.includedUsers,
                      current - 1
                    )
                  )
                }
                disabled={users <= activePackage.includedUsers}
                className="rounded-lg border border-white/20 px-4 py-2 text-white disabled:opacity-30"
                aria-label="Remove one user"
              >
                -
              </button>

              <span className="min-w-8 text-center text-2xl font-bold text-white">
                {users}
              </span>

              <button
                type="button"
                onClick={() => setUsers((current) => current + 1)}
                className="rounded-lg border border-white/20 px-4 py-2 text-white"
                aria-label="Add one user"
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-3">
            <div>
              <p className="text-sm text-white/50">
                Included users
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {activePackage.includedUsers}
              </p>
            </div>

            <div>
              <p className="text-sm text-white/50">
                Additional users
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {extraUsers}
              </p>
            </div>

            <div>
              <p className="text-sm text-white/50">
                Additional-user discount
              </p>
              <p className="mt-2 text-2xl font-bold text-[#d4af37]">
                {activePackage.discount}%
              </p>
            </div>
          </div>
        </div>

        {/* MODULE SELECTION */}

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#111111] p-6 md:p-8">

          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37]">
                Configure your platform
              </p>

              <h3 className="mt-3 text-2xl font-bold text-white">
                Choose your OdinIQ modules.
              </h3>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
                Select the capabilities your business needs.
                You can add more modules than your package
                includes, with additional modules quoted separately.
              </p>
            </div>

            <div className="rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/5 px-5 py-3">
              <p className="text-xs text-white/50">
                Modules selected
              </p>
              <p className="mt-1 text-2xl font-bold text-[#d4af37]">
                {selectedModules.length} / {modules.length}
              </p>
            </div>
          </div>

<div className="mt-6 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 px-5 py-4">
  <p className="text-sm font-semibold text-[#d4af37]">
    {additionalModules > 0
      ? `${additionalModules} additional module${
          additionalModules === 1 ? "" : "s"
        } — quoted separately`
      : remainingModules > 0
      ? `${remainingModules} included module${
          remainingModules === 1 ? "" : "s"
        } remaining in your package`
      : "All included modules selected"}
  </p>
</div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((moduleName, index) => {
              const selected = selectedModules.includes(moduleName);

              return (
                <button
                  key={moduleName}
                  type="button"
                  onClick={() => toggleModule(moduleName)}
                  aria-pressed={selected}
                  className={`flex min-h-24 items-center gap-4 rounded-xl border p-5 text-left transition ${
                    selected
                      ? "border-[#d4af37] bg-[#d4af37]/10"
                      : "border-white/10 bg-[#080808] hover:border-white/30"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${
                      selected
                        ? "border-[#d4af37] bg-[#d4af37] text-black"
                        : "border-white/15 text-[#d4af37]"
                    }`}
                  >
                    {selected
  ? String.fromCharCode(10003)
  : String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="font-semibold text-white">
                    {moduleName}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-3">
            <div>
              <p className="text-sm text-white/50">
                Included module allowance
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {activePackage.includedModules}
              </p>
            </div>

            <div>
              <p className="text-sm text-white/50">
                Selected modules
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {selectedModules.length}
              </p>
            </div>

            <div>
              <p className="text-sm text-white/50">
                Additional chargeable modules
              </p>
              <p className="mt-2 text-2xl font-bold text-[#d4af37]">
                {additionalModules}
              </p>
            </div>
          </div>
        </div>

        {/* LICENCE SUMMARY */}

        <div className="mt-8 rounded-2xl border border-[#d4af37]/25 bg-[#17150c] p-6 md:p-8">

          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37]">
            Your OdinIQ configuration
          </p>

          <h3 className="mt-3 text-2xl font-bold text-white">
            Odin {activePackage.name}
          </h3>

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <div>
              <p className="text-sm text-white/50">
                Total users
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {users}
              </p>
            </div>

            <div>
              <p className="text-sm text-white/50">
                Selected modules
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {selectedModules.length}
              </p>
            </div>

            <div>
              <p className="text-sm text-white/50">
                Licence period
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                12 months
              </p>
            </div>
          </div>

          {selectedModules.length > 0 && (
            <div className="mt-7 border-t border-white/10 pt-6">
              <p className="text-sm font-semibold text-white">
                Your selected modules
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedModules.map((name) => (
                  <span
                    key={name}
                    className="rounded-full border border-[#d4af37]/20 bg-[#d4af37]/5 px-4 py-2 text-xs text-[#d4af37]"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="mt-7 text-sm leading-7 text-white/55">
            Your annual licence quotation will include your
            selected package, additional users and any
            additional modules. Pricing is confirmed
            following a review of your requirements.
          </p>

          
<button
  type="button"
 onClick={() => {
  setCorporateEnquiry(false);
  setShowQuoteForm((current) => !current);
  setSubmitError("");
  setEnquiryReference(null);
}}
  className="mt-7 inline-block rounded-xl bg-[#d4af37] px-8 py-4 text-sm font-bold text-[#080808] transition hover:opacity-90"
>
  {showQuoteForm ? "Close Quotation Form" : "Request Annual Licence Quote"}
</button>


{enquiryReference !== null && (
  <div
    role="status"
    className="mt-6 rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 p-6"
  >
    <h4 className="text-lg font-bold text-[#d4af37]">
      Thank you for your enquiry
    </h4>
    <p className="mt-2 text-sm text-white/80">
      Your OdinIQ annual licence enquiry has been received.
      Your reference is OIQ-{enquiryReference}.
    </p>
    <p className="mt-2 text-sm text-white/60">
      Our team will review your requirements and contact you.
    </p>
  </div>
)}

{showQuoteForm && (
  <form
    id="odin-quote-form"
    onSubmit={submitQuote}
    className="mt-7 rounded-2xl border border-white/15 bg-[#101010] p-6"
  >
    
<h4 className="text-xl font-bold text-white">
  {corporateEnquiry
    ? "Discuss your Corporate licence requirements"
    : "Request your annual licence quotation"}
</h4>


    <p className="mt-2 text-sm text-white/60">
      Complete your details below. Your selected package,
      users and modules will be included automatically.
    </p>

    <div className="mt-6 grid gap-5 sm:grid-cols-2">
      {[
        {
          label: "Company name",
          value: companyName,
          change: setCompanyName,
          type: "text",
        },
        {
          label: "Contact name",
          value: contactName,
          change: setContactName,
          type: "text",
        },
        {
          label: "Email address",
          value: email,
          change: setEmail,
          type: "email",
        },
        {
          label: "Telephone",
          value: telephone,
          change: setTelephone,
          type: "tel",
        },
      ].map((field) => (
        <label key={field.label} className="block">
          <span className="text-sm font-semibold text-white/80">
            {field.label}
            {field.label !== "Telephone" ? " *" : ""}
          </span>
          <input
            type={field.type}
            value={field.value}
            onChange={(event) => field.change(event.target.value)}
            required={field.label !== "Telephone"}
            maxLength={field.label === "Email address" ? 254 : field.label === "Telephone" ? 40 : 150}
            className="mt-2 w-full rounded-lg border border-white/20 bg-[#181818] px-4 py-3 text-white outline-none focus:border-[#d4af37]"
          />
        </label>
      ))}
    </div>

    <label className="mt-5 block">
      <span className="text-sm font-semibold text-white/80">
        Additional requirements
      </span>
      <textarea
        value={requirements}
        onChange={(event) => setRequirements(event.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Tell us about integrations, additional modules or any other requirements."
        className="mt-2 w-full rounded-lg border border-white/20 bg-[#181818] px-4 py-3 text-white outline-none focus:border-[#d4af37]"
      />
    </label>

    <div
      aria-hidden="true"
      className="absolute -left-[9999px] h-px w-px overflow-hidden"
    >
      <label>
        Website
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </label>
    </div>

   
<div className="mt-6 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-4">
  {corporateEnquiry ? (
    <>
      <p className="font-semibold text-[#d4af37]">
        Odin Corporate - Bespoke Annual Licence
      </p>
      <p className="mt-2 text-sm text-white/70">
        Tailored user allowances, modules and integrations.
      </p>
      <p className="mt-1 text-sm text-white/50">
        Your requirements will be reviewed before a quotation is prepared.
      </p>
    </>
  ) : (
    <>
      <p className="font-semibold text-[#d4af37]">
        Odin {activePackage.name} - 12-month licence
      </p>
      <p className="mt-2 text-sm text-white/70">
        {users} users | {selectedModules.length} selected modules
      </p>
      <p className="mt-1 text-sm text-white/50">
        {extraUsers} additional users | {additionalModules} additional modules
      </p>
    </>
  )}
</div>


    {submitError && (
      <p role="alert" className="mt-5 text-sm text-red-400">
        {submitError}
      </p>
    )}

    <button
      type="submit"
      disabled={submitting}
      className="mt-6 rounded-xl bg-[#d4af37] px-8 py-4 text-sm font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {submitting ? "Submitting enquiry..." : "Submit Quotation Request"}
    </button>

    <p className="mt-4 text-xs text-white/45">
      Your details will be used to respond to your quotation request.
    </p>
  </form>
)}
        </div>
      </div>
    </section>
  );
}
