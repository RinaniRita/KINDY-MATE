"use client";

import { useEffect, useRef } from "react";

interface MicPermissionModalProps {
  /** Called after the user clicked "Cho phép" AND the browser granted mic access */
  onGranted: () => void;
  /** Called when the user dismissed the modal or the browser denied access */
  onDenied: (reason: "user-dismissed" | "not-allowed" | "no-device" | "unknown") => void;
  /** Called to close the modal without requesting permission (user clicked X) */
  onClose: () => void;
}

/**
 * MicPermissionModal
 *
 * Shows an explanatory dialog before requesting microphone access.
 * After the user confirms, it calls `navigator.mediaDevices.getUserMedia`
 * and forwards the result via `onGranted` or `onDenied`.
 *
 * Usage:
 *   {showMicModal && (
 *     <MicPermissionModal
 *       onGranted={() => { setShowMicModal(false); startListening(); }}
 *       onDenied={(reason) => { setShowMicModal(false); handleDenied(reason); }}
 *       onClose={() => setShowMicModal(false)}
 *     />
 *   )}
 */
export function MicPermissionModal({ onGranted, onDenied, onClose }: MicPermissionModalProps) {
  const allowBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-focus the primary button for keyboard accessibility
  useEffect(() => {
    allowBtnRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleAllow() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      onGranted();
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          onDenied("not-allowed");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          onDenied("no-device");
        } else {
          onDenied("unknown");
        }
      } else {
        onDenied("unknown");
      }
    }
  }

  return (
    // Backdrop
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mic-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-[2rem] bg-white px-7 py-8 shadow-2xl"
        style={{ animation: "mic-modal-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          ✕
        </button>

        {/* Icon */}
        <div className="mb-5 flex justify-center">
          <span
            className="flex h-20 w-20 items-center justify-center rounded-full text-4xl shadow-inner"
            style={{ background: "linear-gradient(135deg,#dff6ee,#bde6d9)" }}
          >
            🎤
          </span>
        </div>

        {/* Heading */}
        <h2
          id="mic-modal-title"
          className="text-center text-xl font-black tracking-tight text-slate-800"
        >
          Cho phép dùng Micro
        </h2>

        {/* Body */}
        <p className="mt-3 text-center text-sm font-semibold leading-relaxed text-slate-500">
          Milo cần quyền truy cập micro để nghe giọng của bạn.
          <br />
          Khi trình duyệt hỏi, hãy nhấn <strong className="text-slate-700">Cho phép</strong>.
        </p>

        {/* Steps */}
        <ul className="mt-5 space-y-2 rounded-[1.2rem] bg-slate-50 px-5 py-4 text-xs font-bold text-slate-600">
          <li className="flex items-center gap-2">
            <span className="text-base">1️⃣</span> Nhấn nút <em>&ldquo;Cho phép&rdquo;</em> bên dưới
          </li>
          <li className="flex items-center gap-2">
            <span className="text-base">2️⃣</span> Trình duyệt hiện hộp thoại — chọn <em>&ldquo;Allow&rdquo;</em>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-base">3️⃣</span> Bắt đầu nói chuyện với Milo!
          </li>
        </ul>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            ref={allowBtnRef}
            type="button"
            id="mic-modal-allow-btn"
            onClick={handleAllow}
            className="w-full rounded-[1.4rem] py-3 text-sm font-black text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#34d399,#059669)" }}
          >
            🎤 Cho phép dùng Micro
          </button>
          <button
            type="button"
            id="mic-modal-cancel-btn"
            onClick={() => onDenied("user-dismissed")}
            className="w-full rounded-[1.4rem] py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Không, thôi vậy
          </button>
        </div>
      </div>

      {/* Keyframe for modal pop-in */}
      <style>{`
        @keyframes mic-modal-in {
          from { opacity: 0; transform: scale(0.85) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
