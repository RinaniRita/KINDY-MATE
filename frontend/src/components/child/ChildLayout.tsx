import type { ReactNode } from "react";

import { AppShell } from "@/components/common/AppShell";
import { childRoutes } from "@/lib/routes";

export function ChildLayout({ childId, children }: { childId: string; children: ReactNode }) {
  return (
    <AppShell nav={childRoutes(childId)} subtitle="Nhiệm vụ được hướng dẫn, không có cài đặt phụ huynh" title="Khu trẻ em" tone="child">
      {children}
    </AppShell>
  );
}
