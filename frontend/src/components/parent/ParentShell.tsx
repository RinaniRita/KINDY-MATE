"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { apiGetRequired, apiPatch, apiPost } from "@/lib/api";
import { clearAuthSession, readAuthSession } from "@/lib/auth";
import { prepareChildEntry } from "@/lib/child-entry";
import { writeChildModeSession } from "@/lib/child-session";
import { onChildEntryRequest } from "@/lib/parent-actions";
import { parentRoutes } from "@/lib/routes";

type ParentShellProps = {
  children: ReactNode;
};

type ParentChild = {
  id: string;
  nickname: string;
  age: number;
  avatar_id: string;
  rules?: {
    bedtime_lock_start: string | null;
    bedtime_lock_end: string | null;
    entertainment_paused: boolean;
    voice_enabled: boolean;
    camera_enabled: boolean;
    session_duration_limit_minutes: number;
    total_screen_time_limit_minutes: number;
    continuous_screen_time_limit_minutes: number;
    minimum_offscreen_break_minutes: number;
    time_profile: "low_screen" | "balanced" | "learning_focused" | "custom";
  };
};

type RuleMeta = {
  age_band: "3-5" | "6-8";
  current_profile: "low_screen" | "balanced" | "learning_focused" | "custom";
  presets: Record<
    string,
    {
      session: number;
      total_screen: number;
      continuous: number;
      break: number;
    }
  >;
  ceiling: {
    session: number;
    total_screen: number;
    continuous: number;
  };
};

type DashboardState = {
  current_session: {
    id: string;
    status: string;
    current_session_minutes: number;
    current_screen_minutes: number;
    remaining_session_minutes: number;
    remaining_screen_minutes: number;
  } | null;
};

type QuickRuleForm = {
  timeProfile: "low_screen" | "balanced" | "learning_focused" | "custom";
  sessionDuration: number;
  totalScreen: number;
  continuousScreen: number;
  minimumBreak: number;
  entertainmentPaused: boolean;
};

const pageMeta = [
  { match: "/parent/dashboard", title: "Tổng quan", subtitle: "Theo dõi hoạt động, cảnh báo và trạng thái phiên hiện tại." },
  { match: "/parent/children/", title: "Hồ sơ trẻ", subtitle: "Quản lý luật, nội dung và lịch sử theo từng trẻ." },
  { match: "/parent/children", title: "Con của tôi", subtitle: "Xem danh sách trẻ và đi vào từng hồ sơ chi tiết." },
  { match: "/parent/reports", title: "Báo cáo", subtitle: "Xem xu hướng, timeline và dữ liệu phát triển gần đây." },
  { match: "/parent/profile/faqs", title: "Câu hỏi thường gặp", subtitle: "Giải thích ngắn gọn các giới hạn thời gian và cách dùng an toàn." },
  { match: "/parent/profile", title: "Tài khoản phụ huynh", subtitle: "Cập nhật hồ sơ, ảnh đại diện và thông tin đăng nhập." },
  { match: "/parent/settings", title: "Cài đặt chung", subtitle: "PIN phụ huynh, dữ liệu, quyền riêng tư và ngôn ngữ." },
  { match: "/parent/insights", title: "Trợ lý phụ huynh", subtitle: "Hỏi nhanh về dữ liệu của con mà không cần đọc toàn bộ báo cáo." },
];

function parentTitle(pathname: string | null) {
  return (
    pageMeta.find((item) => pathname?.startsWith(item.match)) ?? {
      title: "Khu phụ huynh",
      subtitle: "Quản lý phiên dùng app, hồ sơ trẻ và báo cáo an toàn.",
    }
  );
}

function avatarTone(avatarId?: string) {
  if (avatarId === "parent-sky") return "from-sky-300 to-blue-400";
  if (avatarId === "parent-sun") return "from-amber-300 to-yellow-300";
  if (avatarId === "parent-cream") return "from-orange-100 to-amber-200";
  return "from-emerald-300 to-teal-300";
}

function toQuickRuleForm(child: ParentChild | null): QuickRuleForm {
  const rules = child?.rules;
  return {
    timeProfile: rules?.time_profile ?? "balanced",
    sessionDuration: rules?.session_duration_limit_minutes ?? 60,
    totalScreen: rules?.total_screen_time_limit_minutes ?? 35,
    continuousScreen: rules?.continuous_screen_time_limit_minutes ?? 15,
    minimumBreak: rules?.minimum_offscreen_break_minutes ?? 5,
    entertainmentPaused: rules?.entertainment_paused ?? false,
  };
}

function ShellIcon({
  children,
  className = "",
  viewBox = "0 0 24 24",
}: {
  children: ReactNode;
  className?: string;
  viewBox?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox={viewBox}
    >
      {children}
    </svg>
  );
}

function NavGlyph({ href, className = "h-[18px] w-[18px]" }: { href: string; className?: string }) {
  if (href === "/parent/dashboard") {
    return (
      <ShellIcon className={className}>
        <rect x="3.5" y="4.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="4.5" width="7" height="5" rx="1.5" />
        <rect x="13.5" y="11.5" width="7" height="8" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="6" rx="1.5" />
      </ShellIcon>
    );
  }
  if (href === "/parent/children") {
    return (
      <ShellIcon className={className}>
        <circle cx="9" cy="9" r="2.75" />
        <circle cx="16.5" cy="8" r="2.25" />
        <path d="M4.5 18c.7-2.5 2.7-4 4.5-4h.1c1.8 0 3.8 1.5 4.4 4" />
        <path d="M13.8 18c.4-1.8 1.7-2.9 3.4-2.9h.1c1 0 1.9.3 2.7.9" />
      </ShellIcon>
    );
  }
  return (
    <ShellIcon className={className}>
      <path d="M6 18h12" />
      <path d="M8 18V9.5" />
      <path d="M12 18V6.5" />
      <path d="M16 18V12" />
      <path d="m7.5 8.5 3-3 3 2.5 3-3" />
    </ShellIcon>
  );
}

function AskAiGlyph({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <ShellIcon className={className}>
      <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" />
    </ShellIcon>
  );
}

function PlayGlyph({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <ShellIcon className={className}>
      <path d="M8 6.8v10.4a.8.8 0 0 0 1.25.66l7.6-5.2a.8.8 0 0 0 0-1.32l-7.6-5.2A.8.8 0 0 0 8 6.8Z" />
    </ShellIcon>
  );
}

function PanelToggleGlyph({
  collapsed,
  className = "h-[18px] w-[18px]",
}: {
  collapsed: boolean;
  className?: string;
}) {
  return (
    <ShellIcon className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M9 4.8v14.4" />
      {collapsed ? <path d="m13 12 2.8-2.6M13 12l2.8 2.6" /> : <path d="m15.8 12-2.8-2.6M15.8 12l-2.8 2.6" />}
    </ShellIcon>
  );
}

function MenuGlyph({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <ShellIcon className={className}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </ShellIcon>
  );
}

function CloseGlyph({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <ShellIcon className={className}>
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </ShellIcon>
  );
}

function ChevronGlyph({
  open,
  className = "h-[16px] w-[16px]",
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <ShellIcon className={`${className} transition-transform ${open ? "rotate-180" : ""}`}>
      <path d="m6 9 6 6 6-6" />
    </ShellIcon>
  );
}

export function ParentShell({ children }: ParentShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [showInsightsFab, setShowInsightsFab] = useState(true);

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryBusy, setEntryBusy] = useState(false);
  const [entryError, setEntryError] = useState("");
  const [childrenOptions, setChildrenOptions] = useState<ParentChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [ruleMeta, setRuleMeta] = useState<RuleMeta | null>(null);
  const [dashboardState, setDashboardState] = useState<DashboardState | null>(null);
  const [quickRules, setQuickRules] = useState<QuickRuleForm>(toQuickRuleForm(null));

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const session = readAuthSession();
  const accountLabel = mounted ? (session?.user?.username ?? "Tài khoản") : "Tài khoản";
  const titleMeta = parentTitle(pathname);
  const isInsightsPage = pathname === "/parent/insights";

  const selectedChild = useMemo(
    () => childrenOptions.find((child) => child.id === selectedChildId) ?? null,
    [childrenOptions, selectedChildId],
  );

  useEffect(() => {
    function handleScroll() {
      setShowInsightsFab(window.scrollY < 72);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const loadEntryContext = useCallback(async (children: ParentChild[], childId: string) => {
    const child = children.find((item) => item.id === childId) ?? null;
    if (!child) return;
    setQuickRules(toQuickRuleForm(child));
    const [meta, dashboard] = await Promise.all([
      apiGetRequired<RuleMeta>(`/children/${childId}/rules/meta/`),
      apiGetRequired<DashboardState>(`/activity/dashboard/?child_id=${childId}`),
    ]);
    setRuleMeta(meta);
    setDashboardState(dashboard);
  }, []);

  const openEntryModal = useCallback(
    async (childId?: string) => {
      setShowEntryModal(true);
      setEntryLoading(true);
      setEntryError("");
      setDrawerOpen(false);
      setAccountOpen(false);
      try {
        const children = await apiGetRequired<ParentChild[]>("/children/");
        setChildrenOptions(children);
        if (!children.length) {
          setShowEntryModal(false);
          router.push("/parent/children?create=1");
          return;
        }
        const activeChildId = childId || window.localStorage.getItem("active_child_id") || children[0]?.id || "";
        setSelectedChildId(activeChildId);
        await loadEntryContext(children, activeChildId);
      } catch (err) {
        setEntryError(err instanceof Error ? err.message : "Không thể tải dữ liệu để bắt đầu khu trẻ em.");
      } finally {
        setEntryLoading(false);
      }
    },
    [loadEntryContext, router],
  );

  useEffect(() => onChildEntryRequest((childId) => void openEntryModal(childId)), [openEntryModal]);

  async function handleChildPick(childId: string) {
    setSelectedChildId(childId);
    setEntryLoading(true);
    setEntryError("");
    try {
      await loadEntryContext(childrenOptions, childId);
    } catch (err) {
      setEntryError(err instanceof Error ? err.message : "Không thể tải cấu hình của bé.");
    } finally {
      setEntryLoading(false);
    }
  }

  function applyPreset(profile: QuickRuleForm["timeProfile"]) {
    if (!ruleMeta || profile === "custom") {
      setQuickRules((current) => ({ ...current, timeProfile: "custom" }));
      return;
    }
    const preset = ruleMeta.presets[profile];
    if (!preset) return;
    setQuickRules((current) => ({
      ...current,
      timeProfile: profile,
      sessionDuration: preset.session,
      totalScreen: preset.total_screen,
      continuousScreen: preset.continuous,
      minimumBreak: preset.break,
    }));
  }

  async function saveQuickRules() {
    if (!selectedChildId) return;
    await apiPatch(`/children/${selectedChildId}/rules/`, {
      session_duration_limit_minutes: quickRules.sessionDuration,
      total_screen_time_limit_minutes: quickRules.totalScreen,
      continuous_screen_time_limit_minutes: quickRules.continuousScreen,
      minimum_offscreen_break_minutes: quickRules.minimumBreak,
      entertainment_paused: quickRules.entertainmentPaused,
      time_profile: quickRules.timeProfile,
    });
  }

  async function handleStartSession() {
    if (!selectedChildId) return;
    if (!selectedChild?.rules) {
      setShowEntryModal(false);
      router.push(`/parent/children/${selectedChildId}?tab=luat`);
      return;
    }
    if (quickRules.entertainmentPaused) {
      setEntryError("Hồ sơ này đang bị tạm dừng. Hãy mở lại trong hồ sơ trẻ trước khi bắt đầu phiên.");
      return;
    }

    setEntryBusy(true);
    setEntryError("");
    try {
      await saveQuickRules();
      const sessionResponse = await apiPost<{ ok: boolean; child_mode_session_id: string }>("/activity/child-session/start/", {
        child_id: selectedChildId,
      });
      writeChildModeSession({
        childModeSessionId: sessionResponse.child_mode_session_id,
        childId: selectedChildId,
      });
      prepareChildEntry(selectedChildId);
      setShowEntryModal(false);
      router.push(`/child/${selectedChildId}/home`);
    } catch (err) {
      setEntryError(err instanceof Error ? err.message : "Không thể bắt đầu phiên khu trẻ em.");
    } finally {
      setEntryBusy(false);
    }
  }

  async function handleResumeSession() {
    if (!selectedChildId || !dashboardState?.current_session) return;
    writeChildModeSession({
      childModeSessionId: dashboardState.current_session.id,
      childId: selectedChildId,
    });
    prepareChildEntry(selectedChildId);
    setShowEntryModal(false);
    router.push(`/child/${selectedChildId}/home`);
  }

  async function handleEndActiveSession() {
    if (!selectedChildId || !dashboardState?.current_session) return;
    setEntryBusy(true);
    setEntryError("");
    try {
      await apiPost("/activity/child-session/end/", {
        child_id: selectedChildId,
        child_mode_session_id: dashboardState.current_session.id,
      });
      await loadEntryContext(childrenOptions, selectedChildId);
    } catch (err) {
      setEntryError(err instanceof Error ? err.message : "Không thể kết thúc phiên đang mở.");
    } finally {
      setEntryBusy(false);
    }
  }

  function logout() {
    clearAuthSession();
    router.push("/auth/login");
  }

  function navigateTo(href: string) {
    setDrawerOpen(false);
    setAccountOpen(false);
    router.push(href);
  }

  function toggleDesktopSidebar() {
    setDesktopExpanded((current) => {
      const next = !current;
      if (!next) setAccountOpen(false);
      return next;
    });
  }

  function handleAccountToggle() {
    if (!desktopExpanded) {
      setDesktopExpanded(true);
      setAccountOpen(true);
      return;
    }
    setAccountOpen((value) => !value);
  }

  const actionButtonClass =
    "flex min-h-12 items-center gap-3 rounded-[1.25rem] px-4 text-sm font-black tracking-[-0.01em] transition";

  return (
    <main className="theme-parent min-h-screen bg-[#fffdf7] text-slate-800">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-white/60 bg-white/80 backdrop-blur-xl lg:flex lg:flex-col ${
          desktopExpanded ? "w-64" : "w-24"
        } transition-[width] duration-200`}
      >
        <div className={`px-4 py-5 ${desktopExpanded ? "flex items-center justify-between" : "flex justify-center"}`}>
          {desktopExpanded ? (
            <>
              <Link href="/parent/dashboard" className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-[#9dd9c6] to-[#91d0f6] text-xl font-black text-slate-800 shadow-md">
                  KM
                </span>
                <div>
                  <p className="text-base font-black text-slate-800">Kindy-Mate</p>
                  <p className="text-xs font-bold text-slate-400">Khu phụ huynh</p>
                </div>
              </Link>

              <button
                type="button"
                aria-label="Thu gọn sidebar"
                onClick={toggleDesktopSidebar}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700"
              >
                <PanelToggleGlyph collapsed={false} />
              </button>
            </>
          ) : (
            <button
              type="button"
              aria-label="Mở rộng sidebar"
              onClick={toggleDesktopSidebar}
              className="flex h-12 w-12 items-center justify-center rounded-[1.35rem] border border-slate-200 bg-white text-slate-600 shadow-md transition hover:border-slate-300 hover:text-slate-800"
            >
              <MenuGlyph />
            </button>
          )}
        </div>

        <div className="flex-1 px-3 pb-4">
          <div className="grid gap-2">
            {parentRoutes.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setDrawerOpen(false);
                    setAccountOpen(false);
                  }}
                  className={`flex min-h-12 items-center gap-3 rounded-[1.25rem] px-4 text-sm font-black transition ${
                    active
                      ? "bg-gradient-to-r from-[#e5f6ef] to-[#eef7ff] text-slate-800 shadow-sm"
                      : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-700"
                  } ${desktopExpanded ? "justify-start" : "justify-center"}`}
                >
                  <span className={active ? "text-slate-700" : "text-slate-500"}>
                    <NavGlyph href={item.href} />
                  </span>
                  {desktopExpanded ? <span>{item.label}</span> : null}
                </Link>
              );
            })}
          </div>

          <div className="mt-6 grid gap-2">
            <button
              type="button"
              onClick={() => navigateTo("/parent/insights")}
              className={`${actionButtonClass} border border-sky-100 bg-sky-50/80 text-sky-700 hover:bg-sky-100 ${
                desktopExpanded ? "justify-start" : "justify-center"
              }`}
            >
              <AskAiGlyph />
              {desktopExpanded ? <span>Trợ lý phụ huynh</span> : null}
            </button>
            <button
              type="button"
              onClick={() => void openEntryModal()}
              className={`${actionButtonClass} border border-emerald-100 bg-emerald-50/90 text-emerald-700 hover:bg-emerald-100 ${
                desktopExpanded ? "justify-start" : "justify-center"
              }`}
            >
              <PlayGlyph />
              {desktopExpanded ? <span>Vào khu trẻ em</span> : null}
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 px-3 py-4">
          <button
            type="button"
            onClick={handleAccountToggle}
            className={`flex w-full items-center gap-3 rounded-[1.25rem] px-3 py-2 text-left transition hover:bg-slate-100/80 ${
              desktopExpanded ? "" : "justify-center"
            }`}
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarTone(session?.user?.avatar_id)} text-sm font-black text-slate-800 shadow-sm`}
            >
              {(accountLabel || "PH").slice(0, 2).toUpperCase()}
            </span>
            {desktopExpanded ? (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-800">{accountLabel}</p>
                  <p className="truncate text-[11px] font-bold text-slate-400">Tài khoản phụ huynh</p>
                </div>
                <ChevronGlyph open={accountOpen} className="ml-auto h-[14px] w-[14px] text-slate-400" />
              </>
            ) : null}
          </button>

          {accountOpen && desktopExpanded ? (
            <div className="mt-2 grid gap-1 rounded-[1.5rem] border border-slate-100 bg-white p-2 shadow-lg">
              <Link className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" href="/parent/profile">
                Tài khoản phụ huynh
              </Link>
              <Link className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" href="/parent/settings#general">
                Cài đặt chung
              </Link>
              <Link className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" href="/parent/settings#privacy">
                An toàn & quyền riêng tư
              </Link>
              <Link className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" href="/parent/settings#language">
                Ngôn ngữ
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl px-3 py-2 text-left text-sm font-bold text-rose-600 hover:bg-rose-50"
              >
                Đăng xuất
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <div className={`transition-[padding] duration-200 ${desktopExpanded ? "lg:pl-64" : "lg:pl-24"}`}>
        <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm lg:hidden"
              >
                <MenuGlyph />
              </button>
              <div>
                <p className="text-2xl font-black tracking-tight text-slate-800">{titleMeta.title}</p>
                <p className="text-xs font-semibold text-slate-500">{titleMeta.subtitle}</p>
              </div>
            </div>

            <div className="hidden items-center gap-2 md:flex lg:hidden">
              <button
                type="button"
                onClick={() => navigateTo("/parent/insights")}
                className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-black tracking-[-0.01em] text-sky-700"
              >
                Trợ lý phụ huynh
              </button>
              <button
                type="button"
                onClick={() => void openEntryModal()}
                className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-black tracking-[-0.01em] text-emerald-700"
              >
                Vào khu trẻ em
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-slate-900/35" />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col border-r border-white/60 bg-white/95 p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-[#9dd9c6] to-[#91d0f6] text-xl font-black text-slate-800 shadow-md">
                  KM
                </span>
                <div>
                  <p className="text-base font-black text-slate-800">Kindy-Mate</p>
                  <p className="text-xs font-bold text-slate-400">Khu phụ huynh</p>
                </div>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
                <CloseGlyph />
              </button>
            </div>

            <div className="mt-6 grid gap-2">
              {parentRoutes.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 rounded-[1.25rem] px-4 py-3 text-sm font-black ${
                      active ? "bg-gradient-to-r from-[#e5f6ef] to-[#eef7ff] text-slate-800" : "text-slate-600"
                    }`}
                  >
                    <NavGlyph href={item.href} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 grid gap-2">
              <button
                type="button"
                onClick={() => navigateTo("/parent/insights")}
                className={`${actionButtonClass} border border-sky-100 bg-sky-50 text-left text-sky-700`}
              >
                <AskAiGlyph />
                <span>Trợ lý phụ huynh</span>
              </button>
              <button
                type="button"
                onClick={() => void openEntryModal()}
                className={`${actionButtonClass} border border-emerald-100 bg-emerald-50 text-left text-emerald-700`}
              >
                <PlayGlyph />
                <span>Vào khu trẻ em</span>
              </button>
            </div>

            <div className="mt-auto rounded-[1.5rem] border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarTone(session?.user?.avatar_id)} text-sm font-black text-slate-800 shadow-sm`}
                >
                  {(accountLabel || "PH").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-800">{accountLabel}</p>
                  <p className="truncate text-[11px] font-bold text-slate-400">Tài khoản phụ huynh</p>
                </div>
              </div>
              <div className="mt-3 grid gap-1">
                <Link className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-white" href="/parent/profile">
                  Tài khoản phụ huynh
                </Link>
                <Link className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-white" href="/parent/settings#general">
                  Cài đặt chung
                </Link>
                <Link className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-white" href="/parent/settings#privacy">
                  An toàn & quyền riêng tư
                </Link>
                <Link className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-white" href="/parent/settings#language">
                  Ngôn ngữ
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-xl px-3 py-2 text-left text-sm font-bold text-rose-600 hover:bg-white"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!isInsightsPage ? (
        <button
          type="button"
          onClick={() => navigateTo("/parent/insights")}
          className={`fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-500 px-4 py-3 text-sm font-black text-white shadow-xl shadow-sky-200 transition md:bottom-6 md:right-6 lg:hidden ${
            showInsightsFab ? "translate-y-0 opacity-100" : "translate-y-2 opacity-75"
          }`}
        >
          <AskAiGlyph className="h-[16px] w-[16px]" />
          <span className={showInsightsFab ? "inline" : "hidden"}>Trợ lý phụ huynh</span>
        </button>
      ) : null}

      {showEntryModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="glass-panel max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/70 p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Bắt đầu khu trẻ em</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-800">Review nhanh phiên hôm nay</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Chọn trẻ, kiểm tra luật phiên và chỉ bắt đầu khi cấu hình đã đúng.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEntryModal(false)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-500"
              >
                Đóng
              </button>
            </div>

            {entryLoading ? (
              <div className="py-10 text-center text-sm font-bold text-slate-500">Đang tải dữ liệu phiên...</div>
            ) : (
              <div className="mt-6 grid gap-5">
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Chọn trẻ
                  <select
                    value={selectedChildId}
                    onChange={(event) => void handleChildPick(event.target.value)}
                    className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none focus:border-emerald-400"
                  >
                    {childrenOptions.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.nickname}, {child.age} tuổi
                      </option>
                    ))}
                  </select>
                </label>

                {dashboardState?.current_session ? (
                  <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50/80 p-5">
                    <p className="text-sm font-black text-slate-800">Bé đang có một phiên hoạt động.</p>
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      Phiên hiện tại: {dashboardState.current_session.current_session_minutes} phút · Screen time:{" "}
                      {dashboardState.current_session.current_screen_minutes} phút
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleResumeSession()}
                        className="rounded-2xl bg-slate-800 px-4 py-3 text-xs font-black text-white"
                      >
                        Tiếp tục phiên
                      </button>
                      <button
                        type="button"
                        disabled={entryBusy}
                        onClick={() => void handleEndActiveSession()}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700"
                      >
                        {entryBusy ? "Đang kết thúc..." : "Kết thúc phiên cũ"}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[1.5rem] border border-[#dff6ee] bg-[#f3fbf7] p-5">
                  <div className="flex flex-wrap gap-2">
                    {(["low_screen", "balanced", "learning_focused", "custom"] as const).map((profile) => (
                      <button
                        key={profile}
                        type="button"
                        onClick={() => applyPreset(profile)}
                        className={`rounded-full px-4 py-2 text-xs font-black ${
                          quickRules.timeProfile === profile
                            ? "bg-slate-800 text-white"
                            : "border border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        {profile === "low_screen"
                          ? "Ít màn hình"
                          : profile === "balanced"
                            ? "Cân bằng"
                            : profile === "learning_focused"
                              ? "Ưu tiên học tập"
                              : "Tùy chỉnh"}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-xs font-black text-slate-700">
                      Giới hạn thời lượng phiên
                      <input
                        type="number"
                        min={15}
                        max={ruleMeta?.ceiling.session ?? 120}
                        value={quickRules.sessionDuration}
                        onChange={(event) =>
                          setQuickRules((current) => ({
                            ...current,
                            timeProfile: "custom",
                            sessionDuration: Number(event.target.value),
                          }))
                        }
                        className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none"
                      />
                    </label>
                    <label className="grid gap-2 text-xs font-black text-slate-700">
                      Giới hạn tổng thời gian màn hình
                      <input
                        type="number"
                        min={10}
                        max={ruleMeta?.ceiling.total_screen ?? 90}
                        value={quickRules.totalScreen}
                        onChange={(event) =>
                          setQuickRules((current) => ({
                            ...current,
                            timeProfile: "custom",
                            totalScreen: Number(event.target.value),
                          }))
                        }
                        className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none"
                      />
                    </label>
                    <label className="grid gap-2 text-xs font-black text-slate-700">
                      Giới hạn thời gian màn hình liên tục
                      <input
                        type="number"
                        min={5}
                        max={ruleMeta?.ceiling.continuous ?? 20}
                        value={quickRules.continuousScreen}
                        onChange={(event) =>
                          setQuickRules((current) => ({
                            ...current,
                            timeProfile: "custom",
                            continuousScreen: Number(event.target.value),
                          }))
                        }
                        className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none"
                      />
                    </label>
                    <label className="grid gap-2 text-xs font-black text-slate-700">
                      Thời gian nghỉ giữa các lần nhìn màn hình
                      <input
                        type="number"
                        min={3}
                        max={15}
                        value={quickRules.minimumBreak}
                        onChange={(event) =>
                          setQuickRules((current) => ({
                            ...current,
                            timeProfile: "custom",
                            minimumBreak: Number(event.target.value),
                          }))
                        }
                        className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none"
                      />
                    </label>
                  </div>

                </div>

                {entryError ? (
                  <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-slate-700">
                    {entryError}
                  </div>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => router.push(`/parent/children/${selectedChildId}`)}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700"
                  >
                    Xem hồ sơ trẻ
                  </button>
                  <button
                    type="button"
                    disabled={entryBusy || Boolean(dashboardState?.current_session)}
                    onClick={() => void handleStartSession()}
                    className="rounded-2xl bg-slate-800 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    {entryBusy ? "Đang bắt đầu..." : "Bắt đầu phiên"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
