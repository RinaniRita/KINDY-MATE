"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { readAuthSession } from "@/lib/auth";

type AppShellProps = {
  title: string;
  subtitle: string;
  nav: Array<{ href: string; label: string }>;
  children: ReactNode;
  tone?: "public" | "parent" | "child";
};

export function AppShell({ children, nav, subtitle, title, tone = "public" }: AppShellProps) {
  const router = useRouter();
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  const accentClass = 
    tone === "child" 
      ? "bg-gradient-to-r from-blue-400 to-indigo-400 shadow-blue-200" 
      : tone === "parent"
      ? "bg-gradient-to-r from-violet-500 to-indigo-500 shadow-indigo-100"
      : "bg-gradient-to-r from-emerald-400 to-teal-400 shadow-emerald-100";

  const themeTag = 
    tone === "child" 
      ? "🎈 Chế độ Trẻ Em" 
      : tone === "parent"
      ? "🛡️ Bảng Phụ Huynh"
      : "✨ Kindy-Mate";

  // Append Parent lock link automatically in child mode
  const resolvedNav = [...nav];
  if (tone === "child") {
    resolvedNav.push({ href: "#parent-lock", label: "🔒 Thoát về Bố Mẹ" });
  }

  // Dynamic logo link to prevent unwanted parent logouts
  let logoHref = "/";
  if (tone === "parent") {
    logoHref = "/parent/dashboard";
  } else if (tone === "child") {
    let activeChildId = "";
    if (typeof window !== "undefined") {
      activeChildId = window.localStorage.getItem("active_child_id") || "";
    }
    logoHref = activeChildId ? `/child/${activeChildId}/home` : "/child/select-profile";
  } else {
    // If public tone but logged in, route to parent dashboard
    if (typeof window !== "undefined") {
      const session = readAuthSession();
      if (session?.access) {
        logoHref = "/parent/dashboard";
      }
    }
  }

  function handleKeyPress(num: string) {
    setPinError("");
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      
      // Auto-validate once 4 digits are typed
      if (newPin === "1234") {
        router.push("/parent/dashboard");
      } else if (newPin.length === 4) {
        // Trigger shake & error
        setIsShaking(true);
        setPinError("Mã PIN không đúng, Bố Mẹ thử lại nhé!");
        setTimeout(() => {
          setIsShaking(false);
          setPin("");
        }, 800);
      }
    }
  }

  function handleClear() {
    setPin("");
    setPinError("");
  }

  return (
    <main className="min-h-screen pb-16 selection:bg-emerald-200 selection:text-emerald-900 bg-[#f8fafc]">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-30 border-b border-white/40 bg-white/70 backdrop-blur-md transition-all duration-300">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center justify-between">
              <Link className="group flex items-center gap-3 transition-transform active:scale-95" href={logoHref}>
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accentClass} text-xl font-black text-white shadow-lg animate-float-slow`}>
                  KM
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="block text-2xl font-black tracking-tight text-slate-800">{title}</span>
                    <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-500 shadow-sm border border-slate-100">
                      {themeTag}
                    </span>
                  </div>
                  <span className="block text-xs font-semibold text-slate-500">{subtitle}</span>
                </div>
              </Link>
            </div>

            {/* Navigation links */}
            <nav className="flex flex-wrap gap-2">
              {resolvedNav.map((item) => {
                if (item.href === "#parent-lock") {
                  return (
                    <button
                      key={item.href}
                      onClick={() => {
                        handleClear();
                        setShowPasscodeModal(true);
                      }}
                      className="bubbly-btn rounded-xl border border-rose-200/60 bg-rose-50/80 px-4 py-2 text-xs font-black text-rose-700 shadow-sm hover:border-rose-350 hover:bg-rose-100 md:text-sm transition-all"
                    >
                      {item.label}
                    </button>
                  );
                }

                return (
                  <Link
                    className="bubbly-btn rounded-xl border border-slate-200/60 bg-white/80 px-4 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 md:text-sm transition-all"
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-fade-in duration-500">
          {children}
        </div>
      </div>

      {/* Parent Passcode Lock Modal */}
      {showPasscodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div 
            className={`w-full max-w-md rounded-[2.5rem] border border-white/40 bg-white/80 p-8 text-center shadow-2xl backdrop-blur-md transition-transform duration-300 ${
              isShaking ? "animate-shake" : ""
            }`}
          >
            {/* Lock Header */}
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-3xl mb-4 animate-bounce-gentle">
              🔐
            </div>
            
            <h3 className="text-xl font-black text-slate-800">Cổng Bảo Vệ Cha Mẹ</h3>
            <p className="mt-2 text-xs font-bold leading-relaxed text-slate-500">
              Bé ơi, đây là khu vực cài đặt của Bố Mẹ. <br />
              Vui lòng nhờ Bố Mẹ nhập mã PIN 4 số để tiếp tục.
            </p>
            <p className="text-[10px] font-black text-indigo-550 mt-1 uppercase tracking-wider">
              (Mã PIN mặc định: 1234)
            </p>

            {/* Bubble Pin Display */}
            <div className="mt-6 flex justify-center gap-4">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`h-4 w-4 rounded-full border transition-all duration-200 ${
                    idx < pin.length
                      ? "bg-indigo-500 border-indigo-600 scale-110 shadow-inner"
                      : "bg-slate-100 border-slate-200"
                  }`}
                />
              ))}
            </div>

            {/* Error Message */}
            {pinError && (
              <p className="mt-3 text-xs font-black text-rose-600 animate-pulse">{pinError}</p>
            )}

            {/* Numeric Keypad Grid */}
            <div className="mt-8 grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num)}
                  className="h-14 rounded-2xl bg-white border border-slate-200 text-lg font-black text-slate-700 shadow-sm active:scale-95 active:bg-slate-50 transition-all flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              
              {/* Back / Clear button */}
              <button
                type="button"
                onClick={handleClear}
                className="h-14 rounded-2xl bg-slate-100 text-xs font-black text-slate-500 active:scale-95 transition-all flex items-center justify-center"
              >
                Xóa
              </button>

              <button
                type="button"
                onClick={() => handleKeyPress("0")}
                className="h-14 rounded-2xl bg-white border border-slate-200 text-lg font-black text-slate-700 shadow-sm active:scale-95 active:bg-slate-50 transition-all flex items-center justify-center"
              >
                0
              </button>

              {/* Close Modal button */}
              <button
                type="button"
                onClick={() => {
                  handleClear();
                  setShowPasscodeModal(false);
                }}
                className="h-14 rounded-2xl bg-rose-50 text-xs font-black text-rose-600 active:scale-95 transition-all flex items-center justify-center"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
