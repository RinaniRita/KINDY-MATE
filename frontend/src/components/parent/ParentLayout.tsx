"use client";

import { useSyncExternalStore, type ReactNode } from "react";

import { AppShell } from "@/components/common/AppShell";
import { readAuthSession } from "@/lib/auth";
import { parentRoutes } from "@/lib/routes";

export function ParentLayout({ children }: { children: ReactNode }) {
  const accountLabel = useSyncExternalStore(
    () => () => {},
    () => readAuthSession()?.user?.username ?? "Tài khoản",
    () => "Tài khoản",
  );

  const nav = [...parentRoutes, { href: "/parent/profile", label: accountLabel }];

  return (
    <AppShell nav={nav} subtitle="Tổng quan, luật và duyệt nội dung" title="Khu phụ huynh" tone="parent">
      {children}
    </AppShell>
  );
}
