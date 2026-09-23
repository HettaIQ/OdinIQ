import { getAccountActivationTokenHash } from "@/lib/auth/accountActivation";

import { prisma } from "@/lib/prisma";
import { activateAccount } from "./actions";

type ActivatePageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};


export default async function ActivatePage({
  searchParams,
}: ActivatePageProps) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";

  if (!token) {
    return <InvalidActivationLink />;
  }

  const tokenHash =
  getAccountActivationTokenHash(token);

  const activation =
    await prisma.accountActivationToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    });

  if (
    !activation ||
    activation.usedAt ||
    activation.expiresAt <= new Date() ||
    !activation.user.active
  ) {
    return <InvalidActivationLink />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8">
        <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
          OdinIQ
        </p>

        <h1 className="mt-2 text-2xl font-semibold text-white">
          Activate Your Account
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Welcome {activation.user.name}.
          Create your password to activate
          your OdinIQ account.
        </p>

        <form
  action={activateAccount}
  className="mt-8 space-y-5"
>
          <input
            type="hidden"
            name="token"
            value={token}
          />

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-300"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-slate-300"
            >
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-slate-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-200"
          >
            Set Password
          </button>
        </form>
      </div>
    </main>
  );
}

function InvalidActivationLink() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8">
        <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
          OdinIQ
        </p>

        <h1 className="mt-2 text-2xl font-semibold text-white">
          Activation Link Invalid
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          This activation link is invalid,
          has expired, or has already been
          used.
        </p>
      </div>
    </main>
  );
}