import { logout } from "@/app/actions/logout";
import MobileNav from "@/app/components/MobileNav";
import Image from "next/image";

type TopBarProps = {
  userName: string;
  roleName: string;
  companyName: string;
  canManageTeam: boolean;
};

export default function TopBar({
  userName,
  roleName,
  companyName,
  canManageTeam,
}: TopBarProps) {
  const isHetta =
    companyName.trim().toLowerCase() ===
    "hetta systems";

  const CompanyBrand = ({
    mobile = false,
  }: {
    mobile?: boolean;
  }) => {
    if (isHetta) {
      return (
        <Image
          src="/hetta-logo.jpeg"
          alt="Hetta Systems"
          width={mobile ? 110 : 150}
          height={mobile ? 40 : 55}
          className={
            mobile
              ? "h-10 w-auto shrink-0 object-contain"
              : "h-14 w-auto object-contain"
          }
          priority
        />
      );
    }

    return (
      <div
        className={
          mobile
            ? "shrink-0 text-xl font-bold tracking-tight"
            : "text-2xl font-bold tracking-tight"
        }
      >
        <span className="text-slate-950">
          Odin
        </span>
        <span className="text-amber-500">
          IQ
        </span>
      </div>
    );
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      {/* Mobile header */}
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-2 lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <CompanyBrand mobile />

          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500">
              {companyName}
            </p>

            <p className="truncate text-sm font-semibold text-slate-900">
              {userName}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <MobileNav
            canManageTeam={canManageTeam}
          />

          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden h-20 items-center justify-between px-8 lg:flex">
        <div className="flex items-center gap-4">
          <CompanyBrand />

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
      </div>
    </header>
  );
}