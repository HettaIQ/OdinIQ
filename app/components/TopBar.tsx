import { logout } from "@/app/actions/logout";
import Image from "next/image";

type TopBarProps = {
  userName: string;
  roleName: string;
  companyName: string;
};

export default function TopBar({
  userName,
  roleName,
  companyName,
}: TopBarProps) {
  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-8">
      <div className="flex items-center gap-4">
  <Image
  src="/hetta-logo.jpeg"
  alt="Hetta Systems"
  width={150}
height={55}
className="h-14 w-auto object-contain"
  priority
/>

  <div>
    <p className="text-sm font-medium text-slate-500">
      {companyName}
    </p>

    <h2 className="text-xl font-semibold text-slate-900">
      Commercial Workspace
    </h2>
  </div>
</div>

      <div className="flex items-center gap-6">
        <div className="hidden md:block">
          <input
            type="search"
            placeholder="Search OdinIQ..."
            className="w-72 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:bg-white"
          />
        </div>

        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900">
            {userName}
          </p>

          <p className="text-xs text-slate-500">
            {roleName}
          </p>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}