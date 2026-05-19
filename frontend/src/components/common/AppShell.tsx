"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { apiPatch, apiPost, type AuthResponse } from "@/lib/api";
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

function hasParentPin() {
  if (typeof window === "undefined") return true;
  return Boolean(readAuthSession()?.user?.pin_configured);
}

export function AppShell({ children, nav, subtitle, title, tone = "public", childId }: AppShellProps) {
  const router = useRouter();
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPasscodeModal, setShowPasscodeModal] = useState(() => tone === "child" && !hasParentPin());
  const [pinMode, setPinMode] = useState<PinMode>(() => (tone === "child" && !hasParentPin() ? "setup" : "verify"));
  const [pin, setPin] = useState("");
  const [setupDraft, setSetupDraft] = useState("");
  const [pinError, setPinError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);

  // Real-time child session tracking
  const [showStartSessionModal, setShowStartSessionModal] = useState(false);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [sessionMinutes, setSessionMinutes] = useState(0);

  useEffect(() => {
    if (tone === "child" && typeof window !== "undefined") {
      const activeChildId = childId || window.localStorage.getItem("active_child_id") || "";
      if (activeChildId) {
        const isAlreadyPrompted = sessionStorage.getItem("child_session_prompted");
        if (!isAlreadyPrompted) {
          window.setTimeout(() => setShowStartSessionModal(true), 0);
        }
      }
    }
  }, [childId, tone]);

  async function handleStartSession() {
    if (typeof window === "undefined") return;
    const activeChildId = childId || window.localStorage.getItem("active_child_id") || "";
    if (activeChildId) {
      try {
        const session = await apiPost<{ ok: boolean; session_id: string; started_at: string }>("/activity/start-session/", {
          child_id: activeChildId,
        });
        sessionStorage.setItem("child_session_prompted", "true");
        sessionStorage.setItem("child_session_active", "true");
        sessionStorage.setItem("child_session_start_time", String(Date.now()));
        sessionStorage.setItem("child_session_id", session.session_id);
        sessionStorage.setItem("child_id_active", activeChildId);
      } catch (err) {
        console.error("Start session API error", err);
        sessionStorage.setItem("child_session_prompted", "true");
        sessionStorage.setItem("child_session_active", "false");
      }
    }
    setShowStartSessionModal(false);
  }

  function handleSkipSession() {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("child_session_prompted", "true");
    sessionStorage.setItem("child_session_active", "false");
    sessionStorage.removeItem("child_session_id");
    sessionStorage.removeItem("child_session_start_time");
    sessionStorage.removeItem("child_id_active");
    setShowStartSessionModal(false);
  }

  async function handleSaveSession() {
    if (typeof window === "undefined") return;
    const activeChildId = sessionStorage.getItem("child_id_active") || window.localStorage.getItem("active_child_id") || "";
    const sessionId = sessionStorage.getItem("child_session_id") || "";
    if (activeChildId) {
      try {
        await apiPost("/activity/stop-session/", {
          child_id: activeChildId,
          session_id: sessionId,
        });
      } catch (err) {
        console.error("Stop session API error", err);
      }
    }
    sessionStorage.removeItem("child_session_prompted");
    sessionStorage.removeItem("child_session_active");
    sessionStorage.removeItem("child_session_start_time");
    sessionStorage.removeItem("child_session_id");
    sessionStorage.removeItem("child_id_active");
    setShowEndSessionModal(false);
    router.push("/parent/dashboard");
  }

  async function handleDiscardSession() {
    if (typeof window === "undefined") return;
    const activeChildId = sessionStorage.getItem("child_id_active") || window.localStorage.getItem("active_child_id") || "";
    const sessionId = sessionStorage.getItem("child_session_id") || "";
    if (activeChildId) {
      try {
        await apiPost("/activity/stop-session/", {
          child_id: activeChildId,
          discard: true,
          session_id: sessionId,
        });
      } catch (err) {
        console.error("Discard session API error", err);
      }
    }
    sessionStorage.removeItem("child_session_prompted");
    sessionStorage.removeItem("child_session_active");
    sessionStorage.removeItem("child_session_start_time");
    sessionStorage.removeItem("child_session_id");
    sessionStorage.removeItem("child_id_active");
    setShowEndSessionModal(false);
    router.push("/parent/dashboard");
  }

  const accentClass =
    tone === "child"
      ? "bg-gradient-to-r from-blue-400 to-indigo-400 shadow-blue-200"
      : tone === "parent"
        ? "bg-gradient-to-r from-violet-500 to-indigo-500 shadow-indigo-100"
        : "bg-gradient-to-r from-emerald-400 to-teal-400 shadow-emerald-100";

  const themeTag =
    tone === "child"
      ? "Chế độ trẻ em"
      : tone === "parent"
        ? "Bảng phụ huynh"
        : "Kindy-Mate";

  let logoHref = "/";
  if (tone === "parent") {
    logoHref = "/parent/dashboard";
  } else if (tone === "child") {
    const activeChildId = typeof window !== "undefined" ? window.localStorage.getItem("active_child_id") || "" : "";
    logoHref = activeChildId ? `/child/${activeChildId}/home` : "/child/select-profile";
  } else if (typeof window !== "undefined" && readAuthSession()?.access) {
    logoHref = "/parent/dashboard";
  }

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

      if (typeof window !== "undefined" && sessionStorage.getItem("child_session_active") === "true") {
        const startTime = Number(sessionStorage.getItem("child_session_start_time"));
        if (startTime) {
          const elapsed = Math.max(Math.round((Date.now() - startTime) / 60000), 1);
          setSessionMinutes(elapsed);
          setShowEndSessionModal(true);
          return;
        }
      }

      router.push("/parent/dashboard");
    } catch (err) {
      shakeWithMessage(err instanceof Error ? err.message : "Không thể xác minh mã PIN.");
    } finally {
      setPinBusy(false);
    }
  }

  function handleKeyPress(num: string) {
    if (pinBusy) return;
    setPinError("");
    if (pin.length >= 4) return;
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
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
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
    <main className="min-h-screen bg-[#f8fafc] pb-16 selection:bg-emerald-200 selection:text-emerald-900">
      <header className="sticky top-0 z-30 border-b border-white/40 bg-white/70 backdrop-blur-md transition-all duration-300">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-between">
              <Link className="group flex items-center gap-3 transition-transform active:scale-95" href={logoHref}>
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accentClass} animate-float-slow text-xl font-black text-white shadow-lg`}>
                  KM
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="block text-2xl font-black tracking-tight text-slate-800">{title}</span>
                    <span className="rounded-full border border-slate-100 bg-white/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-500 shadow-sm">
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
                  className="bubbly-btn rounded-xl border border-slate-200/60 bg-white/80 px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 md:text-sm"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-fade-in duration-500">{children}</div>
      </div>

      {tone === "child" && (
        <button
          aria-label="Cổng phụ huynh"
          className="fixed bottom-3 right-3 z-20 h-9 w-9 rounded-full border border-slate-200/50 bg-white/45 text-[10px] font-black text-slate-400 opacity-40 shadow-sm backdrop-blur transition hover:opacity-80 focus:opacity-90"
          onDoubleClick={() => openParentGate()}
          onPointerCancel={cancelGuardianHold}
          onPointerDown={startGuardianHold}
          onPointerLeave={cancelGuardianHold}
          onPointerUp={cancelGuardianHold}
          type="button"
        >
          KM
        </button>
      )}

      {showPasscodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-[2rem] border border-white/40 bg-white/90 p-8 text-center shadow-2xl backdrop-blur-md transition-transform duration-300 ${
              isShaking ? "animate-shake" : ""
            }`}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-2xl font-black text-indigo-600">
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
                : "Giữ cổng này cho phụ huynh. Có thể nhập bằng bàn phím hoặc bảng số bên dưới."}
            </p>

            <div className="mt-6 flex justify-center gap-4">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  className={`h-4 w-4 rounded-full border transition-all duration-200 ${
                    idx < pin.length ? "scale-110 border-indigo-600 bg-indigo-500 shadow-inner" : "border-slate-200 bg-slate-100"
                  }`}
                  key={idx}
                />
              ))}
            </div>

            {pinError && <p className="mt-3 text-xs font-black text-slate-600">{pinError}</p>}

            <div className="mx-auto mt-8 grid max-w-[280px] grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  className="flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg font-black text-slate-700 shadow-sm transition-all active:scale-95 active:bg-slate-50 disabled:opacity-60"
                  disabled={pinBusy}
                  key={num}
                  onClick={() => handleKeyPress(num)}
                  type="button"
                >
                  {num}
                </button>
              ))}

              <button
                className="flex h-14 items-center justify-center rounded-2xl bg-slate-100 text-xs font-black text-slate-500 transition-all active:scale-95"
                onClick={handleBackspace}
                type="button"
              >
                Xóa
              </button>

              <button
                className="flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg font-black text-slate-700 shadow-sm transition-all active:scale-95 active:bg-slate-50 disabled:opacity-60"
                disabled={pinBusy}
                onClick={() => handleKeyPress("0")}
                type="button"
              >
                0
              </button>

              <button
                className="flex h-14 items-center justify-center rounded-2xl bg-rose-50 text-xs font-black text-rose-600 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={pinMode === "setup" && !hasParentPin()}
                onClick={closePinModal}
                type="button"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Realtime Session Start Modal ─── */}
      {showStartSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-[2rem] border border-white/40 bg-white p-8 text-center shadow-2xl backdrop-blur-md">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl animate-bounce">
              👶
            </div>
            <h3 className="text-xl font-black text-slate-800">
              Bắt đầu tính giờ sử dụng?
            </h3>
            <p className="mt-2 text-xs font-bold leading-relaxed text-slate-500">
              Phụ huynh có muốn bắt đầu đếm giờ sử dụng cho bé không? Hạn mức hôm nay sẽ được theo dõi theo thời gian thực tế và ghi nhận vào Dashboard.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleStartSession}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 py-3 text-xs font-black text-white shadow-lg shadow-emerald-100 transition-transform active:scale-95"
                type="button"
              >
                ✅ Bắt đầu theo dõi (Realtime)
              </button>
              <button
                onClick={handleSkipSession}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-xs font-black text-slate-600 transition-transform active:scale-95"
                type="button"
              >
                ❌ Sử dụng tự do (Không tính giờ)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Realtime Session End Modal ─── */}
      {showEndSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-[2rem] border border-white/40 bg-white p-8 text-center shadow-2xl backdrop-blur-md">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
              🎉
            </div>
            <h3 className="text-xl font-black text-slate-800">
              Hoàn tất phiên sử dụng!
            </h3>
            <p className="mt-2 text-xs font-bold leading-relaxed text-slate-500">
              Hệ thống ghi nhận bé đã dùng ứng dụng liên tục trong <span className="text-indigo-600 font-black text-sm">{sessionMinutes}</span> phút.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleSaveSession}
                className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 py-3 text-xs font-black text-white shadow-lg shadow-indigo-100 transition-transform active:scale-95"
                type="button"
              >
                💾 Lưu và Về Bảng quản trị
              </button>
              <button
                onClick={handleDiscardSession}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-xs font-black text-slate-600 transition-transform active:scale-95"
                type="button"
              >
                🚪 Chỉ về Bảng quản trị (Không lưu)
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
