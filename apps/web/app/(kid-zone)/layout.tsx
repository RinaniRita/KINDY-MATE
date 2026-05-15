export default function KidLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="kid" className="min-h-screen bg-background text-foreground font-bubblegum">
      {/* font-bubblegum là font custom bo tròn nếu muốn, hoặc dùng font sans mặc định nhưng bo tròn component lớn */}
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
}
