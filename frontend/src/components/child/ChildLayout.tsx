import type { ReactNode } from "react";

import { AppShell } from "@/components/common/AppShell";
import { childRoutes } from "@/lib/routes";

export function ChildLayout({ childId, children }: { childId: string; children: ReactNode }) {
  return (
    <AppShell
      childId={childId}
      nav={childRoutes(childId)}
      subtitle="Chạm vào một góc để bắt đầu"
      title="Phòng của con"
      tone="child"
    >
      {children}
    </AppShell>
  );
}
