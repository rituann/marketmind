import Link from "next/link";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#0a0a0f]/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-[#06b6d4] font-bold text-lg tracking-tight">
            Market
          </span>
          <span className="font-bold text-lg tracking-tight text-slate-100">
            Mind
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <NavLink href="/demo">Demo</NavLink>
          <NavLink href="/architecture">Architecture</NavLink>
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-white/6 hover:text-slate-100"
    >
      {children}
    </Link>
  );
}
