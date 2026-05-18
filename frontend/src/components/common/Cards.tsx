import type { ReactNode } from "react";

export function Panel({
  children,
  eyebrow,
  title,
  className = "",
}: {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  className?: string;
}) {
  return (
    <section className={`glass-panel rounded-3xl p-6 md:p-8 border border-white/50 transition-all duration-300 ${className}`}>
      {(eyebrow || title) && (
        <div className="mb-6">
          {eyebrow && (
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              {eyebrow}
            </p>
          )}
          {title && (
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-800 sm:text-3xl leading-tight">
              {title}
            </h2>
          )}
        </div>
      )}
      <div className="text-slate-600 font-medium">
        {children}
      </div>
    </section>
  );
}

export function Metric({ 
  label, 
  value, 
  variant = "blue" 
}: { 
  label: string; 
  value: string; 
  variant?: "blue" | "green" | "yellow" | "purple" | "rose" 
}) {
  const gradientStyles = {
    blue: "from-blue-50 to-indigo-50/50 border-blue-100 text-blue-600",
    green: "from-emerald-50 to-teal-50/50 border-emerald-100 text-emerald-600",
    yellow: "from-amber-50 to-orange-50/50 border-amber-100 text-amber-600",
    purple: "from-purple-50 to-indigo-50/50 border-purple-100 text-purple-600",
    rose: "from-rose-50 to-pink-50/50 border-rose-100 text-rose-600"
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${gradientStyles[variant]} p-5 shadow-sm transition-all duration-300 hover:shadow-md`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1.5 text-2xl font-black tracking-tight text-slate-800">{value}</p>
    </div>
  );
}

export function StatusBadge({ state }: { state: "approved" | "pending" | "blocked" | "demo_only" }) {
  const labels = {
    approved: "Đã duyệt 🛡️",
    pending: "Chờ duyệt ⏳",
    blocked: "Đã chặn 🚫",
    demo_only: "Nội dung mẫu ✨",
  };
  const styles = {
    approved: "bg-emerald-50 text-emerald-600 border-emerald-200/60 shadow-emerald-50",
    pending: "bg-amber-50 text-amber-600 border-amber-200/60 shadow-amber-50",
    blocked: "bg-rose-50 text-rose-600 border-rose-200/60 shadow-rose-50",
    demo_only: "bg-blue-50 text-blue-600 border-blue-200/60 shadow-blue-50",
  };
  
  return (
    <span className={`inline-flex items-center rounded-xl border px-3 py-1 text-xs font-black shadow-sm ${styles[state]}`}>
      {labels[state]}
    </span>
  );
}
