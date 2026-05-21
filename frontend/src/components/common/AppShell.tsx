"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { PersistentMascot } from "@/components/child/PersistentMascot";
import { apiPatch, apiPost, apiPostWithStatus, type AuthResponse } from "@/lib/api";
import {
  clearChildModeSession,
  isChildModePrompted,
  markChildPromptSkipped,
  readChildModeSession,
  segmentDescriptorForPath,
  updateChildModeSegment,
  type LimitState,
  writeChildModeSession,
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

export function AppShell({ children, nav, subtitle, title, tone = "public", childId }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleStartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showPasscodeModal, setShowPasscodeModal] = useState(() => tone === "child" && !hasParentPin());
  const [pinMode, setPinMode] = useState<PinMode>(() => (tone === "child" && !hasParentPin() ? "setup" : "verify"));
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

  const isChildTone = tone === "child";
  const isChildHome = isChildTone && pathname?.endsWith("/home");
  const isBreakTaskRoute = Boolean(pathname?.includes("/move") || pathname?.includes("/create"));
  const childHomeHref = childId ? `/child/${childId}/home` : "/child/select-profile";
  const currentSegmentDescriptor = useMemo(() => segmentDescriptorForPath(pathname), [pathname]);
  const remainingBreakMinutes = breakRemainingMinutes(limitState);

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

  useEffect(() => {
    if (!limitState || !isChildTone) return;
    if (limitState.state === "session_limit_reached" || limitState.state === "ended") {
      clearChildModeSession();
      router.push("/child/select-profile");
    }
  }, [isChildTone, limitState, router]);

  async function handleStartSession() {
    if (typeof window === "undefined") return;
    const activeChildId = childId || window.localStorage.getItem("active_child_id") || "";
    if (!activeChildId) return;
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
  }, [showPasscodeModal]);

  return (
    <main className={`min-h-screen ${!isChildTone ? "pb-16" : ""} selection:bg-[#dff6ee] selection:text-slate-800 ${isChildTone ? "bg-gradient-to-b from-[#fff7ea] via-[#eef8ff] to-[#ecfaf3]" : "bg-[#fffdf7]"}`}>
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
          <div className="pointer-events-auto flex gap-2">
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

      {isChildTone && limitState && (limitState.state === "break_required" || limitState.state === "offscreen_only") ? (
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
    </main>
  );
}
