"use client";

import Link from "next/link";
import {
  useActionState,
  useState,
} from "react";

import {
  createCompanyAction,
  type CreateCompanyState,
} from "./actions";

const initialState: CreateCompanyState = {
  error: null,
  success: null,
};

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewCompanyPage() {
  const [state, formAction, pending] =
    useActionState(
      createCompanyAction,
      initialState
    );

  const [companyName, setCompanyName] =
    useState("");

  const [slug, setSlug] = useState("");

  const [slugEdited, setSlugEdited] =
    useState(false);

  const [copied, setCopied] =
    useState(false);

  function handleCompanyNameChange(
    value: string
  ) {
    setCompanyName(value);

    if (!slugEdited) {
      setSlug(makeSlug(value));
    }
  }

  /*
   * Build the activation URL in the browser.
   *
   * This means localhost works during development
   * and the real OdinIQ domain will automatically
   * be used when the application is deployed.
   */
  const activationUrl =
    state.success &&
    typeof window !== "undefined"
      ? `${window.location.origin}/activate?token=${encodeURIComponent(
          state.success.activationToken
        )}`
      : "";

  async function copyActivationLink() {
    if (!activationUrl) {
      return;
    }

    await navigator.clipboard.writeText(
      activationUrl
    );

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  /*
   * Once onboarding succeeds, replace the form
   * with a confirmation screen.
   *
   * The raw activation token is deliberately
   * available only in this returned action state.
   */
  if (state.success) {
    const expiry = new Date(
      state.success.expiresAt
    );

    return (
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <Link
            href="/hq/companies"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to Companies
          </Link>

          <p className="mt-6 text-sm font-medium uppercase tracking-wider text-slate-500">
            OdinIQ Platform
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">
            Company Created
          </h1>

          <p className="mt-2 max-w-2xl text-slate-400">
            The new OdinIQ tenant and its
            first Company Administrator have
            been created successfully.
          </p>
        </div>

        <section className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-6">
          <h2 className="text-lg font-semibold text-emerald-200">
            Onboarding Ready
          </h2>

          <div className="mt-5 space-y-3 text-sm">
            <div>
              <span className="text-slate-500">
                Company:
              </span>{" "}
              <span className="text-white">
                {state.success.companyName}
              </span>
            </div>

            <div>
              <span className="text-slate-500">
                Administrator:
              </span>{" "}
              <span className="text-white">
                {state.success.adminName}
              </span>
            </div>

            <div>
              <span className="text-slate-500">
                Email:
              </span>{" "}
              <span className="text-white">
                {state.success.adminEmail}
              </span>
            </div>

            <div>
              <span className="text-slate-500">
                Activation expires:
              </span>{" "}
              <span className="text-white">
                {expiry.toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Account Activation
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Send this link to the Company
              Administrator. They can use it
              once to create their OdinIQ
              password.
            </p>
          </div>

          <div className="mt-5">
            <label
              htmlFor="activationLink"
              className="block text-sm font-medium text-slate-300"
            >
              Activation Link
            </label>

            <textarea
              id="activationLink"
              readOnly
              value={activationUrl}
              rows={4}
              className="mt-2 w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-sm text-slate-300 outline-none"
            />
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={copyActivationLink}
              className="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-200"
            >
              {copied
                ? "Copied!"
                : "Copy Activation Link"}
            </button>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            For security, this activation
            link expires after 24 hours and
            can only be used once.
          </p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/hq/companies"
            className="inline-flex items-center justify-center rounded-md border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            View Companies
          </Link>

          <Link
            href="/hq/companies/new"
            className="inline-flex items-center justify-center rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-200"
          >
            Add Another Company
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href="/hq/companies"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Back to Companies
        </Link>

        <p className="mt-6 text-sm font-medium uppercase tracking-wider text-slate-500">
          OdinIQ Platform
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Add Company
        </h1>

        <p className="mt-2 max-w-2xl text-slate-400">
          Create a new OdinIQ company,
          provision its standard roles and
          permissions, and assign its first
          Company Administrator.
        </p>
      </div>

      <form
        action={formAction}
        className="space-y-8"
      >
        {state.error && (
          <div className="rounded-lg border border-red-900/70 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {state.error}
          </div>
        )}

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Company Details
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              The company will be created as
              an active OdinIQ tenant.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="companyName"
                className="block text-sm font-medium text-slate-300"
              >
                Company Name
              </label>

              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                autoComplete="organization"
                value={companyName}
                onChange={(event) =>
                  handleCompanyNameChange(
                    event.target.value
                  )
                }
                placeholder="Example Heating Ltd"
                className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="slug"
                className="block text-sm font-medium text-slate-300"
              >
                Company Slug
              </label>

              <input
                id="slug"
                name="slug"
                type="text"
                required
                value={slug}
                onChange={(event) => {
                  setSlugEdited(true);
                  setSlug(
                    makeSlug(
                      event.target.value
                    )
                  );
                }}
                placeholder="example-heating"
                className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
              />

              <p className="mt-2 text-xs text-slate-500">
                OdinIQ&apos;s permanent
                identifier for this company.
                It must be unique.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div>
            <h2 className="text-lg font-semibold text-white">
              First Company Administrator
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              This person will receive the
              Company Admin role for the new
              tenant.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="adminName"
                className="block text-sm font-medium text-slate-300"
              >
                Administrator Name
              </label>

              <input
                id="adminName"
                name="adminName"
                type="text"
                required
                autoComplete="name"
                placeholder="Alex Smith"
                className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="adminEmail"
                className="block text-sm font-medium text-slate-300"
              >
                Administrator Email
              </label>

              <input
                id="adminEmail"
                name="adminEmail"
                type="email"
                required
                autoComplete="email"
                placeholder="alex@example.com"
                className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Link
            href="/hq/companies"
            className="inline-flex items-center justify-center rounded-md border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending
              ? "Creating Company..."
              : "Create Company"}
          </button>
        </div>
      </form>
    </div>
  );
}