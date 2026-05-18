"use client";

import { useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/common/Cards";
import { type AuthResponse, apiPost } from "@/lib/api";
import { saveAuthSession } from "@/lib/auth";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // Validate password strength according to secure policies
  function validatePassword(pass: string, userEmail: string): string | null {
    if (pass.length < 8) {
      return "Mật khẩu phải chứa ít nhất 8 ký tự.";
    }
    if (!/[a-z]/.test(pass) || !/[A-Z]/.test(pass)) {
      return "Mật khẩu phải chứa cả chữ in hoa và in thường.";
    }
    if (!/\d/.test(pass)) {
      return "Mật khẩu phải chứa ít nhất 1 chữ số (0-9).";
    }
    
    // Check relation to email (not matching email prefix or entire email)
    if (userEmail) {
      const emailParts = userEmail.split("@");
      const emailPrefix = emailParts[0].toLowerCase();
      const lowerPass = pass.toLowerCase();
      
      if (lowerPass.includes(emailPrefix) || lowerPass.includes(userEmail.toLowerCase())) {
        return "Mật khẩu bảo mật cao không được chứa hoặc liên quan đến địa chỉ Email của bạn.";
      }
    }
    return null;
  }

  async function submit() {
    setStatus("");
    
    // Check registration validation
    if (mode === "register") {
      if (password !== confirmPassword) {
        setStatus("Mật khẩu nhập lại không trùng khớp!");
        return;
      }
      
      const pwdError = validatePassword(password, email);
      if (pwdError) {
        setStatus(pwdError);
        return;
      }
    }

    setLoading(true);
    try {
      const auth =
        mode === "login"
          ? await apiPost<AuthResponse>("/auth/login/", { username: email, password })
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
        
        {/* Username field (Registration only) */}
        {mode === "register" && (
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
        )}

        {/* Email field (Always required) */}
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
            placeholder={mode === "register" ? "Chữ hoa, chữ thường, số, từ 8 ký tự trở lên" : "Nhập mật khẩu của bạn"}
            type="password"
            value={password}
          />
        </label>

        {/* Confirm Password (Registration only) */}
        {mode === "register" && (
          <label className="grid gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
            Xác nhận lại mật khẩu
            <input
              className="min-h-12 rounded-xl border border-slate-200 bg-white/70 px-4 font-bold text-slate-800 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100/50"
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Nhập lại mật khẩu giống hệt phía trên"
              type="password"
              value={confirmPassword}
            />
          </label>
        )}

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
          disabled={
            loading || 
            !password || 
            !email || 
            (mode === "register" && (!username || !confirmPassword || !consent))
          }
          onClick={submit}
          type="button"
        >
          {loading ? "Đang xử lý dữ liệu..." : mode === "login" ? "Đăng nhập tài khoản" : "Kích hoạt tài khoản"}
        </button>
      </div>

      {/* Transition Flow Link */}
      <div className="mt-6 text-center border-t border-slate-100 pt-5">
        {mode === "register" ? (
          <p className="text-xs font-bold text-slate-500">
            Bạn đã có tài khoản phụ huynh?{" "}
            <Link className="text-emerald-500 font-black hover:underline transition" href="/auth/login">
              Đăng nhập ngay!
            </Link>
          </p>
        ) : (
          <p className="text-xs font-bold text-slate-500">
            Chưa có tài khoản phụ huynh?{" "}
            <Link className="text-emerald-500 font-black hover:underline transition" href="/auth/register">
              Đăng ký ngay!
            </Link>
          </p>
        )}
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
