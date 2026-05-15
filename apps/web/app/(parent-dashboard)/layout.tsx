export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Sidebar điều hướng quản lý của bố mẹ */}
      {children}
    </div>
  );
}
