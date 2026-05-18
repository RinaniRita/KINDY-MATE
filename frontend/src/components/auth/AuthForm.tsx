"use client";

import { useState } from "react";
import { Panel } from "@/components/common/Cards";
import { type AuthResponse, apiPost } from "@/lib/api";
import { saveAuthSession } from "@/lib/auth";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setStatus("");
    setLoading(true);
    try {
      const auth =
        mode === "login"
          ? await apiPost<AuthResponse>("/auth/login/", { username: username || email, password })
          : await apiPost<AuthResponse>("/auth/register/", {
              consent_status: consent,
              email,
              password,
              username,
            });
      saveAuthSession(auth);
      window.location.href = mode === "login" ? "/parent/dashboard" : "/onboarding/parent";
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel eyebrow="Cổng thông tin phụ huynh" title={mode === "login" ? "Đăng nhập hệ thống 🔒" : "Đăng ký tài khoản mới 🛡️"}>
      <div className="grid gap-5 mt-4">
        
        {/* Username field */}
        <label className="grid gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
          Tên đăng nhập
          <input
            className="min-h-12 rounded-xl border border-slate-200 bg-white/70 px-4 font-bold text-slate-800 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100/50"
            onChange={(event) => setUsername(event.target.value)}
            placeholder="VD: phuhuynh_mina"
            type="text"
            value={username}
          />
        </label>

        {/* Email field */}
        <label className="grid gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
          Địa chỉ Email
          <input
            className="min-h-12 rounded-xl border border-slate-200 bg-white/70 px-4 font-bold text-slate-800 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100/50"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email@domain.com"
            type="email"
            value={email}
          />
        </label>

        {/* Password field */}
        <label className="grid gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
          Mật khẩu tài khoản
          <input
            className="min-h-12 rounded-xl border border-slate-200 bg-white/70 px-4 font-bold text-slate-800 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100/50"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Tối thiểu 8 ký tự khi đăng ký"
            type="password"
            value={password}
          />
        </label>

        {/* Consent Checkbox (Registration only) */}
        {mode === "register" && (
          <label className="flex items-start gap-3 rounded-2xl bg-amber-50/60 border border-amber-100/50 p-4 text-xs font-bold leading-relaxed text-slate-600 shadow-sm cursor-pointer select-none">
            <input
              checked={consent}
              className="mt-0.5 h-5 w-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-400 accent-emerald-500 shrink-0 cursor-pointer"
              onChange={(event) => setConsent(event.target.checked)}
              type="checkbox"
            />
            <span>
              Tôi xác nhận mình là phụ huynh hoặc người giám hộ hợp pháp của trẻ. Đồng ý thiết lập tài khoản và tuân thủ các nguyên tắc bảo mật dữ liệu tối giản vì an toàn của con.
            </span>
          </label>
        )}

        {/* Submit button */}
        <button
          className="bubbly-btn min-h-14 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 text-sm font-black text-white shadow-lg shadow-emerald-100 hover:shadow-emerald-250 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          disabled={loading || !password || (!username && !email) || (mode === "register" && (!username || !email || !consent))}
          onClick={submit}
          type="button"
        >
          {loading ? "Đang xử lý dữ liệu..." : mode === "login" ? "Đăng nhập tài khoản" : "Kích hoạt tài khoản"}
        </button>
      </div>

      {/* Status banner */}
      {status && (
        <div className="mt-4 rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs font-bold leading-normal text-rose-700 animate-bounce-gentle">
          ❌ {status}
        </div>
      )}
    </Panel>
  );
}
