import Link from "next/link";
import type { ReactNode } from "react";

type AppShellProps = {
  title: string;
  subtitle: string;
  nav: Array<{ href: string; label: string }>;
  children: ReactNode;
  tone?: "public" | "parent" | "child";
};

export function AppShell({ children, nav, subtitle, title, tone = "public" }: AppShellProps) {
  const accentClass = 
    tone === "child" 
      ? "bg-gradient-to-r from-blue-400 to-indigo-400 shadow-blue-200" 
      : tone === "parent"
      ? "bg-gradient-to-r from-violet-500 to-indigo-500 shadow-indigo-100"
      : "bg-gradient-to-r from-emerald-400 to-teal-400 shadow-emerald-100";

  const themeTag = 
    tone === "child" 
      ? "🎈 Chế độ Trẻ Em" 
      : tone === "parent"
      ? "🛡️ Bảng Phụ Huynh"
      : "✨ Kindy-Mate";

  return (
    <main className="min-h-screen pb-16 selection:bg-emerald-200 selection:text-emerald-900">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-30 border-b border-white/40 bg-white/70 backdrop-blur-md transition-all duration-300">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Logo and Brand */}
            <Link className="group flex items-center gap-3 transition-transform active:scale-95" href="/">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accentClass} text-xl font-black text-white shadow-lg animate-float-slow`}>
                KM
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="block text-2xl font-black tracking-tight text-slate-800">{title}</span>
                  <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-500 shadow-sm border border-slate-100">
                    {themeTag}
                  </span>
                </div>
                <span className="block text-xs font-semibold text-slate-500">{subtitle}</span>
              </div>
            </Link>

            {/* Navigation links */}
            <nav className="flex flex-wrap gap-2">
              {nav.map((item) => (
                <Link
                  className="bubbly-btn rounded-xl border border-slate-200/60 bg-white/80 px-4 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 md:text-sm"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-fade-in duration-500">
          {children}
        </div>
      </div>
    </main>
  );
}
