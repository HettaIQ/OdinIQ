import { requireCompanyContext } from "@/lib/auth/requireCompanyContext";
import OdinVoiceSelector from "./OdinVoiceSelector";

export default async function SettingsPage() {
  const {
    user,
    company,
  } = await requireCompanyContext();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          Personal settings
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
          Your Odin
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Personalise how Odin works for you at {company.name}.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Odin Voice
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Choose the voice you want Odin to use when speaking to you.
              Your choice is personal to your account.
            </p>
          </div>

          <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Personal preference
          </div>
        </div>

        <OdinVoiceSelector
          currentVoiceId={user.odinVoiceId}
        />
      </section>
    </div>
  );
}


