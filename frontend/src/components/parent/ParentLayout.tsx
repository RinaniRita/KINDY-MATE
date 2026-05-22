"use client";

import type { ReactNode } from "react";

import { ParentShell } from "@/components/parent/ParentShell";

export function ParentLayout({ children }: { children: ReactNode }) {
  return <ParentShell>{children}</ParentShell>;
}
