"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { PersistentMascot } from "@/components/child/PersistentMascot";
import { MascotVisual } from "@/components/child/MascotVisual";
import { apiGet, apiPatch, apiPost, apiPostWithStatus, type AuthResponse } from "@/lib/api";
import {
  clearChildModeSession,
  isChildModePrompted,
  markChildPromptSkipped,
  readChildModeSession,
  segmentDescriptorForPath,
  updateChildModeSegment,
  type LimitState,
  writeChildModeSession,
  isBedtimeLockedAt,
  parseClock,
} from "@/lib/child-session";
import { readAuthSession, updateAuthUser } from "@/lib/auth";

type AppShellProps = {
  title: string;
  subtitle: string;
  nav: Array<{ href: string; label: string }>;
  children: ReactNode;
  tone?: "public" | "parent" | "child";
  childId?: string;
};

type PinMode = "verify" | "setup";
type BedtimeWindow = {
  start: string | null;
  end: string | null;
};

function childRouteLabel(pathname: string | null | undefined) {
  if (!pathname) return "Khu đang mở";
  if (pathname.includes("/study")) return "Bàn học";
  if (pathname.includes("/watch")) return "TV";
  if (pathname.includes("/move")) return "Thảm tập";
  if (pathname.includes("/create")) return "Góc vẽ";
  if (pathname.includes("/mascot")) return "Tủ đồ";
  if (pathname.includes("/milo")) return "Milo";
  if (pathname.includes("/missions/") || pathname.includes("/mission/")) return "Khu phát triển";
  return "Phòng của con";
}

function hasParentPin() {
  if (typeof window === "undefined") return true;
  return Boolean(readAuthSession()?.user?.pin_configured);
}

function breakRemainingMinutes(limitState: LimitState | null) {
  const activeBreak = limitState?.active_break_requirement;
  if (!activeBreak || !activeBreak.started_at) return 0;
  const start = new Date(activeBreak.started_at).getTime();
  const end = start + activeBreak.required_minutes * 60_000;
  return Math.max(Math.ceil((end - Date.now()) / 60_000), 0);
}

function secondsUntilNextBedtimeStart(startRaw: string | null, endRaw: string | null, now: Date) {
  const start = parseClock(startRaw);
  if (!start || isBedtimeLockedAt(startRaw, endRaw, now)) return null;

  const next = new Date(now);
  next.setHours(start.hour, start.minute, start.second, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return Math.max(Math.floor((next.getTime() - now.getTime()) / 1000), 0);
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function AppShell({ children, nav, subtitle, title, tone = "public", childId }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleStartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [pinMode, setPinMode] = useState<PinMode>("verify");
  const [pin, setPin] = useState("");
  const [setupDraft, setSetupDraft] = useState("");
  const [pinError, setPinError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);

  const [showStartSessionModal, setShowStartSessionModal] = useState(false);
  const [showParentExitModal, setShowParentExitModal] = useState(false);
  const [showChildEndModal, setShowChildEndModal] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [limitState, setLimitState] = useState<LimitState | null>(null);
  const [bedtimeWindow, setBedtimeWindow] = useState<BedtimeWindow | null>(null);
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [bedtimeBypassed, setBedtimeBypassed] = useState(false);

  useEffect(() => {
    if (bedtimeWindow) {
      localStorage.setItem("bedtime_window", JSON.stringify(bedtimeWindow));
    }
  }, [bedtimeWindow]);

  useEffect(() => {
    if (tone === "child" && !hasParentPin()) {
      setShowPasscodeModal(true);
      setPinMode("setup");
    }
  }, [tone]);

  const isChildTone = tone === "child";
  const isChildHome = isChildTone && pathname?.endsWith("/home");
  const isBreakTaskRoute = Boolean(pathname?.includes("/move") || pathname?.includes("/create"));
  const childHomeHref = childId ? `/child/${childId}/home` : "/child/select-profile";
  const currentSegmentDescriptor = useMemo(() => segmentDescriptorForPath(pathname), [pathname]);
  const remainingBreakMinutes = breakRemainingMinutes(limitState);
  
  const bedtimeCountdownSeconds = useMemo(() => {
    if (!bedtimeWindow) return null;
    return secondsUntilNextBedtimeStart(bedtimeWindow.start, bedtimeWindow.end, new Date(clockTick));
  }, [bedtimeWindow, clockTick]);

  const shouldShowBedtimeTimer =
    typeof bedtimeCountdownSeconds === "number" && bedtimeCountdownSeconds > 0 && bedtimeCountdownSeconds <= 15 * 60;

  const isBedtimeLocked = useMemo(() => {
    if (!isChildTone || !bedtimeWindow || bedtimeBypassed) return false;
    return isBedtimeLockedAt(bedtimeWindow.start, bedtimeWindow.end, new Date(clockTick));
  }, [isChildTone, bedtimeWindow, clockTick, bedtimeBypassed]);

  const isSessionLocked = useMemo(() => {
    return isChildTone && (
      limitState?.state === "session_limit_reached" || 
      limitState?.state === "ended" || 
      (limitState && typeof limitState.remaining_session_minutes === "number" && limitState.remaining_session_minutes <= 0)
    );
  }, [isChildTone, limitState]);

  const isBlockedOffscreenRoute = useMemo(() => {
    return Boolean(
      pathname?.includes("/study") ||
      pathname?.includes("/watch") ||
      pathname?.includes("/mascot") ||
      pathname?.includes("/milo") ||
      pathname?.includes("/missions/") ||
      pathname?.includes("/mission/")
    );
  }, [pathname]);

  const isOffscreenLocked = useMemo(() => {
    return isChildTone && 
      !isBedtimeLocked && 
      !isSessionLocked &&
      (limitState?.state === "offscreen_only" || (limitState && typeof limitState.remaining_screen_minutes === "number" && limitState.remaining_screen_minutes <= 0)) && 
      isBlockedOffscreenRoute;
  }, [isChildTone, isBedtimeLocked, isSessionLocked, limitState, isBlockedOffscreenRoute]);

  const showSessionNudge = isChildTone && limitState && typeof limitState.remaining_session_minutes === "number" && limitState.remaining_session_minutes > 0 && limitState.remaining_session_minutes <= 15;
  const showBedtimeNudge = isChildTone && typeof bedtimeCountdownSeconds === "number" && bedtimeCountdownSeconds > 0 && bedtimeCountdownSeconds <= 15 * 60;

  const minutesUntilBedtime = useMemo(() => {
    if (typeof bedtimeCountdownSeconds !== "number" || bedtimeCountdownSeconds <= 0) return null;
    return Math.ceil(bedtimeCountdownSeconds / 60);
  }, [bedtimeCountdownSeconds]);

  const isWithinOneHourOfBedtime = useMemo(() => {
    return typeof minutesUntilBedtime === "number" && minutesUntilBedtime <= 60;
  }, [minutesUntilBedtime]);




  useEffect(() => {
    if (tone !== "child" || typeof window === "undefined") return;
    if (!pathname?.endsWith("/home")) return;
    const activeChildId = childId || window.localStorage.getItem("active_child_id") || "";
    if (!activeChildId) return;
    const isActive = readChildModeSession()?.childModeSessionId;
    const entryNonce = window.localStorage.getItem("child_entry_nonce") || "";
    const seenEntryNonce = sessionStorage.getItem("child_entry_nonce_seen") || "";
    if (entryNonce && entryNonce !== seenEntryNonce) {
      sessionStorage.removeItem("child_session_prompted");
      sessionStorage.setItem("child_entry_nonce_seen", entryNonce);
    }
    if (isActive) return;
    if (!isChildModePrompted()) {
      window.setTimeout(() => setShowStartSessionModal(true), 0);
    }
  }, [childId, pathname, tone]);

  useEffect(() => {
    if (!isChildTone || !childId) return;
    let cancelled = false;

    async function loadBedtimeWindow() {
      const payload = await apiGet<{
        rules?: {
          bedtime_lock_start?: string | null;
          bedtime_lock_end?: string | null;
        };
      }>(`/activity/dashboard/?child_id=${childId}`, {});
      if (cancelled || !payload.rules) return;
      setBedtimeWindow({
        start: payload.rules.bedtime_lock_start ?? null,
        end: payload.rules.bedtime_lock_end ?? null,
      });
    }

    void loadBedtimeWindow();
    return () => {
      cancelled = true;
    };
  }, [childId, isChildTone]);

  useEffect(() => {
    if (!isChildTone) return;
    const timer = setInterval(() => setClockTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isChildTone]);

  useEffect(() => {
    if (!isChildTone || !childId) return;
    if (idleStartTimer.current) {
      clearTimeout(idleStartTimer.current);
      idleStartTimer.current = null;
    }
    const activeSession = readChildModeSession();
    if (!activeSession?.childModeSessionId || activeSession.childId !== childId) return;

    const descriptor = currentSegmentDescriptor;
    const segmentKey = `${descriptor.screen_class}:${descriptor.activity_category}:${descriptor.display_category}:${descriptor.activity_title}`;

    async function startSegment(afterSeconds = 0) {
      const freshSession = readChildModeSession();
      if (!freshSession?.childModeSessionId || freshSession.childId !== childId) return;
      if (freshSession.segmentKey === segmentKey) return;

      const response = await apiPostWithStatus<{
        ok: boolean;
        usage_session_id?: string | null;
        limit_state?: LimitState;
        detail?: string;
      }>("/activity/segments/start/", {
        child_id: childId,
        child_mode_session_id: freshSession.childModeSessionId,
        screen_class: descriptor.screen_class,
        activity_category: descriptor.activity_category,
        display_category: descriptor.display_category,
        activity_title: descriptor.activity_title,
        session_type: descriptor.session_type,
        elapsed_seconds: afterSeconds,
      });

      const payload = response.data as {
        usage_session_id?: string | null;
        limit_state?: LimitState;
        detail?: string;
      };

      if (payload.limit_state) {
        setLimitState(payload.limit_state);
      }
      if (!response.ok) {
        return;
      }

      updateChildModeSegment(payload.usage_session_id ?? null, segmentKey);
    }

    if (descriptor.screen_class === "idle_screen") {
      idleStartTimer.current = setTimeout(() => {
        void startSegment(30);
      }, 30_000);
    } else {
      void startSegment();
    }

    return () => {
      if (idleStartTimer.current) {
        clearTimeout(idleStartTimer.current);
        idleStartTimer.current = null;
      }
    };
  }, [childId, currentSegmentDescriptor, isChildTone]);

  useEffect(() => {
    if (!isChildTone || !childId) return;
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
    }

    async function sendHeartbeat() {
      const activeSession = readChildModeSession();
      if (!activeSession?.childModeSessionId || activeSession.childId !== childId) return;
      const response = await apiPostWithStatus<{
        ok: boolean;
        limit_state?: LimitState;
        detail?: string;
      }>("/activity/segments/heartbeat/", {
        child_id: childId,
        child_mode_session_id: activeSession.childModeSessionId,
        usage_session_id: activeSession.usageSessionId || null,
        client_state: "active",
      });
      const payload = response.data as { limit_state?: LimitState };
      if (payload.limit_state) {
        setLimitState(payload.limit_state);
      }
      if (!response.ok && response.status === 400) {
        clearChildModeSession();
      }
    }

    void sendHeartbeat();
    heartbeatTimer.current = setInterval(() => {
      void sendHeartbeat();
    }, 15_000);

    return () => {
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    };
  }, [childId, isChildTone]);

  // We disable immediate redirection on limitState ended/reached to let our premium locking overlay block interaction beautifully.
  useEffect(() => {
    if (!limitState || !isChildTone) return;
    // We let the full screen session expiry overlay block interaction, allowing parent passcode verification to bypass or end it.
  }, [isChildTone, limitState, router]);

  async function handleStartSession() {
    if (typeof window === "undefined") return;
    const activeChildId = childId || window.localStorage.getItem("active_child_id") || "";
    if (!activeChildId) return;
    if (isWithinOneHourOfBedtime) return;
    setSessionBusy(true);

    try {
      const session = await apiPost<{
        ok: boolean;
        child_mode_session_id: string;
        limit_state: LimitState;
      }>("/activity/child-session/start/", {
        child_id: activeChildId,
      });
      writeChildModeSession({
        childModeSessionId: session.child_mode_session_id,
        childId: activeChildId,
      });
      setLimitState(session.limit_state);
    } catch {
      markChildPromptSkipped();
    } finally {
      setShowStartSessionModal(false);
      setSessionBusy(false);
    }
  }

  function handleSkipSession() {
    markChildPromptSkipped();
    setShowStartSessionModal(false);
  }

  async function endChildMode(target: "select-profile" | "parent-dashboard") {
    if (typeof window === "undefined") return;
    const activeSession = readChildModeSession();
    const activeChildId = activeSession?.childId || childId || window.localStorage.getItem("active_child_id") || "";
    setSessionBusy(true);

    try {
      if (activeSession?.childModeSessionId && activeChildId) {
        await apiPost("/activity/child-session/end/", {
          child_id: activeChildId,
          child_mode_session_id: activeSession.childModeSessionId,
        });
      }
    } catch {
      // keep moving to target even if backend has already closed the session
    } finally {
      clearChildModeSession();
      setBedtimeBypassed(false);
      setShowChildEndModal(false);
      setShowParentExitModal(false);
      setSessionBusy(false);
      router.push(target === "parent-dashboard" ? "/parent/dashboard" : "/child/select-profile");
    }
  }

  async function markBreakTaskDone() {
    const activeSession = readChildModeSession();
    if (!activeSession?.childModeSessionId || !activeSession.usageSessionId || !childId) return;
    const response = await apiPostWithStatus<{ ok: boolean; limit_state?: LimitState }>("/activity/segments/complete/", {
      child_id: childId,
      child_mode_session_id: activeSession.childModeSessionId,
      usage_session_id: activeSession.usageSessionId,
      completion_kind: "break_task_done",
    });
    const payload = response.data as { limit_state?: LimitState; ok?: boolean };
    if (payload.limit_state) {
      setLimitState(payload.limit_state);
    }
  }

  const accentClass =
    tone === "child"
      ? "bg-gradient-to-r from-[#91d0f6] to-[#9dd9c6] shadow-blue-100"
      : tone === "parent"
        ? "bg-gradient-to-r from-[#9dd9c6] to-[#91d0f6] shadow-emerald-100"
        : "bg-gradient-to-r from-[#9dd9c6] to-[#ffe39a] shadow-emerald-100";

  const themeTag = tone === "child" ? "Khu trẻ em" : tone === "parent" ? "Phụ huynh" : "Kindy-Mate";

  const [logoHref, setLogoHref] = useState("/");

  useEffect(() => {
    let computedHref = "/";
    if (tone === "parent") {
      computedHref = "/parent/dashboard";
    } else if (tone === "child") {
      const activeChildId = window.localStorage.getItem("active_child_id") || "";
      computedHref = activeChildId ? `/child/${activeChildId}/home` : "/child/select-profile";
    } else if (readAuthSession()?.access) {
      computedHref = "/parent/dashboard";
    }
    setLogoHref(computedHref);
  }, [tone, childId]);

  function openParentGate(mode: PinMode = hasParentPin() ? "verify" : "setup") {
    handleClear();
    setSetupDraft("");
    setPinMode(mode);
    setShowPasscodeModal(true);
  }

  function shakeWithMessage(message: string) {
    setIsShaking(true);
    setPinError(message);
    setTimeout(() => {
      setIsShaking(false);
      setPin("");
    }, 700);
  }

  async function submitPin(nextPin: string) {
    if (pinBusy) return;
    setPinBusy(true);
    setPinError("");

    try {
      if (pinMode === "setup") {
        if (!setupDraft) {
          setSetupDraft(nextPin);
          setPin("");
          setPinError("Nhập lại mã PIN một lần nữa để xác nhận.");
          return;
        }
        if (setupDraft !== nextPin) {
          setSetupDraft("");
          shakeWithMessage("Hai lần nhập PIN chưa khớp. Vui lòng tạo lại mã PIN.");
          return;
        }
        const updated = await apiPatch<AuthResponse["user"]>("/auth/me/", { parent_pin: nextPin });
        updateAuthUser(updated);
        handleClear();
        setSetupDraft("");
        setShowPasscodeModal(false);
        return;
      }

      await apiPost<{ ok: boolean }>("/auth/verify-parent-pin/", { pin: nextPin });
      handleClear();
      setShowPasscodeModal(false);

      if (isBedtimeLocked) {
        setBedtimeBypassed(true);
        return;
      }

      if (readChildModeSession()?.childModeSessionId) {
        setShowParentExitModal(true);
        return;
      }
      router.push("/parent/dashboard");
    } catch (err) {
      shakeWithMessage(err instanceof Error ? err.message : "Không thể xác minh mã PIN.");
    } finally {
      setPinBusy(false);
    }
  }

  function handleKeyPress(num: string) {
    if (pinBusy || pin.length >= 4) return;
    setPinError("");
    const newPin = pin + num;
    setPin(newPin);
    if (newPin.length === 4) {
      void submitPin(newPin);
    }
  }

  function handleBackspace() {
    setPinError("");
    setPin((current) => current.slice(0, -1));
  }

  function handleClear() {
    setPin("");
    setPinError("");
  }

  function closePinModal() {
    if (pinMode === "setup" && !hasParentPin()) return;
    handleClear();
    setSetupDraft("");
    setShowPasscodeModal(false);
  }

  function startGuardianHold() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => openParentGate(), 650);
  }

  function cancelGuardianHold() {
    if (!holdTimer.current) return;
    clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  useEffect(() => {
    if (!showPasscodeModal) return;

    function handleKeyboard(event: KeyboardEvent) {
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        handleKeyPress(event.key);
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        handleBackspace();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closePinModal();
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  });

  return (
    <main className={`min-h-screen ${isChildHome ? "pb-0" : "pb-16"} selection:bg-[#dff6ee] selection:text-slate-800 ${isChildTone ? "theme-child bg-gradient-to-b from-[#fff7ea] via-[#eef8ff] to-[#ecfaf3]" : tone === "parent" ? "theme-parent bg-[#fffdf7]" : "theme-public bg-[#fffdf7]"}`}>
      {!isChildTone ? (
        <header className="sticky top-0 z-30 border-b border-white/60 bg-white/80 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center justify-between">
                <Link className="group flex items-center gap-3 transition-transform active:scale-95" href={logoHref}>
                  <span className={`flex h-12 w-12 items-center justify-center rounded-[1.25rem] ${accentClass} text-xl font-black text-slate-800 shadow-lg`}>
                    KM
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="block text-2xl font-black tracking-tight text-slate-800">{title}</span>
                      <span className="rounded-full border border-slate-100 bg-white/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                        {themeTag}
                      </span>
                    </div>
                    <span className="block text-xs font-semibold text-slate-500">{subtitle}</span>
                  </div>
                </Link>
              </div>

              <nav className="flex flex-wrap gap-2">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-[1rem] border border-slate-200/70 bg-white/85 px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 md:text-sm"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </header>
      ) : null}

      {isChildTone ? (
        <div className="pointer-events-none fixed left-4 right-4 top-4 z-30 flex items-start justify-between gap-3">
          <div className="pointer-events-auto flex flex-col gap-2">
            <div className="flex gap-2">
            {!isChildHome ? (
              <>
                <Link href={childHomeHref} className="child-mini-badge">
                  <span>🏠</span>
                  <span>Về phòng</span>
                </Link>
                <div className="child-mini-badge">
                  <span>{childRouteLabel(pathname)}</span>
                </div>
              </>
            ) : null}
            </div>
            {shouldShowBedtimeTimer ? (
              <div className="child-mini-badge border-amber-200 bg-amber-50/95 text-amber-900 shadow-md">
                <span>ðŸŒ™</span>
                <span>Còn {formatCountdown(bedtimeCountdownSeconds ?? 0)} trước giờ nghỉ</span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setShowChildEndModal(true)}
            className="pointer-events-auto child-mini-badge bg-white/92"
          >
            <span>🌙</span>
            <span>Xong rồi</span>
          </button>
        </div>
      ) : null}

      <div className={isChildTone ? (isChildHome ? "px-0 py-0" : "mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8") : "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"}>
        <div className="animate-fade-in duration-500">{children}</div>
      </div>

      {tone === "child" && childId ? <PersistentMascot key={childId} childId={childId} /> : null}

      {tone === "child" && (
        <button
          type="button"
          aria-label="Cổng phụ huynh"
          className="fixed bottom-3 right-3 z-30 h-9 w-9 rounded-full border border-slate-200/50 bg-white/45 text-[10px] font-black text-slate-400 opacity-40 shadow-sm backdrop-blur transition hover:opacity-80 focus:opacity-90"
          onDoubleClick={() => openParentGate()}
          onPointerCancel={cancelGuardianHold}
          onPointerDown={startGuardianHold}
          onPointerLeave={cancelGuardianHold}
          onPointerUp={cancelGuardianHold}
        >
          KM
        </button>
      )}

      {showPasscodeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-[2rem] border border-white/40 bg-white/90 p-8 text-center shadow-2xl backdrop-blur-md transition-transform duration-300 ${
              isShaking ? "animate-shake" : ""
            }`}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-[#dff0ff] bg-[#f3fbff] text-2xl font-black text-slate-700">
              KM
            </div>

            <h3 className="text-xl font-black text-slate-800">
              {pinMode === "setup" ? "Tạo mã PIN phụ huynh" : "Cổng phụ huynh"}
            </h3>
            <p className="mt-2 text-xs font-bold leading-relaxed text-slate-500">
              {pinMode === "setup"
                ? setupDraft
                  ? "Nhập lại cùng mã PIN để xác nhận trước khi trẻ bắt đầu dùng app."
                  : "Thiết lập mã PIN 4 chữ số để phụ huynh quay lại khu quản lý khi trẻ đang dùng app."
                : "Có thể nhập bằng bàn phím số hoặc bảng số bên dưới."}
            </p>

            <div className="mt-6 flex justify-center gap-4">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`h-4 w-4 rounded-full border transition-all duration-200 ${
                    idx < pin.length ? "scale-110 border-slate-700 bg-slate-700 shadow-inner" : "border-slate-200 bg-slate-100"
                  }`}
                />
              ))}
            </div>

            {pinError ? <p className="mt-3 text-xs font-black text-slate-600">{pinError}</p> : null}

            <div className="mx-auto mt-8 grid max-w-[280px] grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={pinBusy}
                  onClick={() => handleKeyPress(num)}
                  className="flex h-14 items-center justify-center rounded-[1.25rem] border border-slate-200 bg-white text-lg font-black text-slate-700 shadow-sm transition active:scale-95 active:bg-slate-50 disabled:opacity-60"
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                onClick={handleBackspace}
                className="flex h-14 items-center justify-center rounded-[1.25rem] bg-slate-100 text-xs font-black text-slate-500 transition active:scale-95"
              >
                Xóa
              </button>
              <button
                type="button"
                disabled={pinBusy}
                onClick={() => handleKeyPress("0")}
                className="flex h-14 items-center justify-center rounded-[1.25rem] border border-slate-200 bg-white text-lg font-black text-slate-700 shadow-sm transition active:scale-95 active:bg-slate-50 disabled:opacity-60"
              >
                0
              </button>
              <button
                type="button"
                disabled={pinMode === "setup" && !hasParentPin()}
                onClick={closePinModal}
                className="flex h-14 items-center justify-center rounded-[1.25rem] bg-rose-50 text-xs font-black text-rose-600 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showStartSessionModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-white/40 bg-white p-8 text-center shadow-2xl">
            {isWithinOneHourOfBedtime ? (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-amber-50 text-3xl font-black text-slate-700">
                  🌙
                </div>
                <h3 className="text-xl font-black text-slate-800">Sắp đến giờ ngủ rồi! 🌙</h3>
                <p className="mt-2 text-xs font-bold leading-relaxed text-slate-500">
                  Chỉ còn chưa đầy 1 tiếng nữa là đến giờ đi ngủ của cậu rồi ({minutesUntilBedtime} phút). Milo khuyên cậu không nên bắt đầu phiên mới vào lúc này để ngủ thật ngon nhé!
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => void endChildMode("select-profile")}
                    className="w-full rounded-[1.25rem] bg-[#91d0f6] py-3 text-xs font-black text-slate-800 shadow-md"
                  >
                    👋 Quay lại chọn hồ sơ
                  </button>
                  <button
                    type="button"
                    onClick={() => openParentGate()}
                    className="w-full rounded-[1.25rem] border border-slate-200 bg-white py-3 text-xs font-black text-slate-600"
                  >
                    ⚙️ Bố mẹ mở khóa
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-[#f3fbf7] text-3xl font-black text-slate-700">
                  KM
                </div>
                <h3 className="text-xl font-black text-slate-800">Bắt đầu tính giờ sử dụng?</h3>
                <p className="mt-2 text-xs font-bold leading-relaxed text-slate-500">
                  Nếu phụ huynh đồng ý, hệ thống sẽ bắt đầu theo dõi phiên child mode, screen time và thời gian nghỉ ngoài màn hình theo thời gian thực.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleStartSession}
                    disabled={sessionBusy}
                    className="w-full rounded-[1.25rem] bg-[#9dd9c6] py-3 text-xs font-black text-slate-800 shadow-md"
                  >
                    {sessionBusy ? "Đang bắt đầu..." : "Bắt đầu theo dõi"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipSession}
                    className="w-full rounded-[1.25rem] border border-slate-200 bg-white py-3 text-xs font-black text-slate-600"
                  >
                    Không tính giờ lần này
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {showChildEndModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-white/40 bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-[#fff7ea] text-3xl font-black text-slate-700">
              🌙
            </div>
            <h3 className="text-xl font-black text-slate-800">Kết thúc phiên của cậu?</h3>
            <p className="mt-2 text-xs font-bold leading-relaxed text-slate-500">
              App sẽ lưu thời gian của phiên này rồi quay về màn hình chọn hồ sơ trẻ.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                disabled={sessionBusy}
                onClick={() => void endChildMode("select-profile")}
                className="w-full rounded-[1.25rem] bg-[#91d0f6] py-3 text-xs font-black text-slate-800 shadow-md"
              >
                {sessionBusy ? "Đang kết thúc..." : "Kết thúc phiên"}
              </button>
              <button
                type="button"
                onClick={() => setShowChildEndModal(false)}
                className="w-full rounded-[1.25rem] border border-slate-200 bg-white py-3 text-xs font-black text-slate-600"
              >
                Chơi thêm một chút
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showParentExitModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-white/40 bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-[#f3fbff] text-3xl font-black text-slate-700">
              KM
            </div>
            <h3 className="text-xl font-black text-slate-800">Vào khu phụ huynh?</h3>
            <p className="mt-2 text-xs font-bold leading-relaxed text-slate-500">
              Hệ thống sẽ kết thúc child mode hiện tại, lưu thời gian dùng app và mở khu phụ huynh.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                disabled={sessionBusy}
                onClick={() => void endChildMode("parent-dashboard")}
                className="w-full rounded-[1.25rem] bg-[#91d0f6] py-3 text-xs font-black text-slate-800 shadow-md"
              >
                {sessionBusy ? "Đang mở..." : "Kết thúc và vào khu phụ huynh"}
              </button>
              <button
                type="button"
                onClick={() => setShowParentExitModal(false)}
                className="w-full rounded-[1.25rem] border border-slate-200 bg-white py-3 text-xs font-black text-slate-600"
              >
                Tiếp tục child mode
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isChildTone && limitState && (limitState.state === "break_required" || limitState.state === "offscreen_only") && !isOffscreenLocked ? (
        <div className="fixed inset-x-4 bottom-20 z-40 mx-auto max-w-lg rounded-[2rem] border border-white/80 bg-white/95 p-5 shadow-2xl backdrop-blur">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
            {limitState.state === "break_required" ? "Nghỉ màn hình" : "Chỉ còn hoạt động ngoài màn hình"}
          </p>
          <h3 className="mt-2 text-xl font-black text-slate-800">
            {limitState.state === "break_required"
              ? "Đến lúc cho mắt nghỉ một chút."
              : "Phiên này đã hết screen time."}
          </h3>
          <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
            {limitState.state === "break_required"
              ? `Cậu cần nghỉ thêm ${remainingBreakMinutes} phút và hoàn thành một việc ngoài màn hình trước khi quay lại hoạt động trên app.`
              : "Cậu vẫn có thể sang thảm tập hoặc góc vẽ để tiếp tục phiên này mà không cần thêm màn hình."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={childId ? `/child/${childId}/move` : "/child/select-profile"} className="child-mini-badge bg-[#eef8ff]">
              <span>🤸</span>
              <span>Thảm tập</span>
            </Link>
            <Link href={childId ? `/child/${childId}/create` : "/child/select-profile"} className="child-mini-badge bg-[#fff7ea]">
              <span>🎨</span>
              <span>Góc vẽ</span>
            </Link>
            {isBreakTaskRoute ? (
              <button type="button" onClick={() => void markBreakTaskDone()} className="child-mini-badge bg-[#f3fbf7]">
                <span>✅</span>
                <span>Tớ đã nghỉ xong</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* 15-Minute Soft Nudges */}
      {(showSessionNudge || showBedtimeNudge) && (
        <div className="fixed bottom-24 right-4 z-40 max-w-sm rounded-[1.6rem] bg-white/95 p-4 shadow-xl border border-amber-200/60 backdrop-blur flex items-center gap-3 animate-slide-up">
          <div className="text-3xl">💬</div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Milo mách nhỏ</p>
            <p className="text-xs font-bold leading-relaxed text-slate-700">
              {showBedtimeNudge
                ? `Sắp đến giờ đi ngủ rồi (còn ${Math.ceil((bedtimeCountdownSeconds ?? 0) / 60)} phút)! Chúng mình chơi nốt một chút rồi chuẩn bị nghỉ nhé! 🛌`
                : `Phiên chơi sắp hết giờ rồi (còn ${Math.ceil(limitState?.remaining_session_minutes ?? 0)} phút)! Hãy chuẩn bị hoàn thành nhiệm vụ nha! ⏰`}
            </p>
          </div>
        </div>
      )}

      {/* Bedtime Lock Overlay */}
      {isBedtimeLocked ? (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0B0F19] text-white p-8 text-center animate-fade-in select-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-transparent to-transparent opacity-80 pointer-events-none" />
          
          <div className="relative mb-6 animate-pulse duration-4000">
            <span className="text-8xl filter drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]">🌙</span>
            <span className="absolute top-0 right-[-10px] text-3xl animate-bounce">✨</span>
          </div>

          <div className="scale-110 mb-8">
            <MascotVisual mood="sleep" size="lg" message="" />
          </div>

          <h2 className="text-3xl font-black tracking-tight text-amber-200">Đã đến giờ đi ngủ rồi cậu ơi! 🛌💤</h2>
          <p className="mt-4 max-w-md text-sm font-medium leading-relaxed text-indigo-200/90">
            Hôm nay chúng mình đã học tập và vui chơi thật chăm chỉ rồi. Giờ là lúc để máy xuống, đi ngủ sớm để ngày mai tràn đầy năng lượng nhé! Milo chúc cậu ngủ ngon! 🌟🌙
          </p>

          <div className="mt-8 flex flex-col gap-3 min-w-[200px]">
            <button
              type="button"
              onClick={() => void endChildMode("select-profile")}
              className="rounded-[1.25rem] bg-[#91d0f6] px-6 py-3 text-xs font-black text-slate-800 shadow-lg shadow-blue-500/20 active:scale-95 transition"
            >
              👋 Hẹn gặp lại sau nhé
            </button>
          </div>

          <button
            type="button"
            onClick={() => openParentGate()}
            className="absolute bottom-6 right-6 opacity-30 hover:opacity-100 transition text-[10px] uppercase font-black tracking-widest text-slate-400"
          >
            ⚙️ Cổng phụ huynh
          </button>
        </div>
      ) : null}

      {/* Session ended Lock Overlay */}
      {isSessionLocked && !isBedtimeLocked ? (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-[#FFFDF7] via-[#FFF3E3] to-[#FFF9F0] text-slate-800 p-8 text-center animate-fade-in select-none">
          <div className="relative mb-6">
            <span className="text-8xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.08)]">⏰</span>
          </div>

          <div className="scale-110 mb-8">
            <MascotVisual mood="sleep" size="lg" message="" />
          </div>

          <h2 className="text-3xl font-black tracking-tight text-slate-800">Hết giờ chơi rồi cậu ơi! ⏰</h2>
          <p className="mt-4 max-w-md text-sm font-bold leading-relaxed text-slate-600">
            Phiên sử dụng của chúng mình hôm nay đã kết thúc rồi. Cậu hãy cất máy, để đôi mắt nghỉ ngơi và hẹn gặp lại cậu ở phiên chơi tiếp theo nhé! 🥰🌱
          </p>

          <div className="mt-8 flex flex-col gap-3 min-w-[200px]">
            <button
              type="button"
              onClick={() => void endChildMode("select-profile")}
              className="rounded-[1.25rem] bg-[#9dd9c6] px-6 py-3 text-xs font-black text-slate-800 shadow-lg active:scale-95 transition"
            >
              👋 Kết thúc phiên chơi
            </button>
          </div>

          <button
            type="button"
            onClick={() => openParentGate()}
            className="absolute bottom-6 right-6 opacity-30 hover:opacity-100 transition text-[10px] uppercase font-black tracking-widest text-slate-400"
          >
            ⚙️ Cổng phụ huynh
          </button>
        </div>
      ) : null}

      {/* Offscreen Screen Time Lock Overlay */}
      {isOffscreenLocked ? (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-[#FFFDF7] via-[#EBF6FF] to-[#E9FAFF] text-slate-800 p-8 text-center animate-fade-in select-none">
          <div className="relative mb-6 animate-bounce">
            <span className="text-8xl">🔌👁️</span>
          </div>

          <div className="scale-110 mb-8">
            <MascotVisual mood="rest" size="lg" message="" />
          </div>

          <h2 className="text-2xl font-black tracking-tight text-indigo-900">Hãy bảo vệ đôi mắt nhé! 🔌👁️</h2>
          <p className="mt-4 max-w-md text-sm font-bold leading-relaxed text-indigo-950/80">
            Thời gian dùng màn hình của cậu đã hết rồi. Để đôi mắt của chúng mình luôn tinh anh, hãy đứng dậy vận động hoặc vẽ tranh nha! Milo có sẵn bài tập cực vui cho cậu đó! 🏃🎨
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href={`/child/${childId}/move`}
              className="rounded-[1.25rem] bg-[#91d0f6] px-6 py-3.5 text-xs font-black text-slate-800 shadow-md shadow-blue-500/10 active:scale-95 transition flex items-center gap-2"
            >
              🤸 Thảm tập thể dục
            </Link>
            <Link
              href={`/child/${childId}/create`}
              className="rounded-[1.25rem] bg-[#ffe39a] px-6 py-3.5 text-xs font-black text-slate-800 shadow-md shadow-amber-500/10 active:scale-95 transition flex items-center gap-2"
            >
              🎨 Góc sáng tạo vẽ tranh
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
