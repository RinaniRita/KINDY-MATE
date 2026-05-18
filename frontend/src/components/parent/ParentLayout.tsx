import type { ReactNode } from "react";

import { AppShell } from "@/components/common/AppShell";
import { parentRoutes } from "@/lib/routes";

export function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell nav={parentRoutes} subtitle="Tổng quan, luật và duyệt nội dung" title="Khu phụ huynh" tone="parent">
      {children}
    </AppShell>
  );
}
