"use client";

import { useEffect, useState } from "react";

import { Panel } from "@/components/common/Cards";
import { apiGetRequired, apiPatch, type AuthResponse } from "@/lib/api";
import { updateAuthUser } from "@/lib/auth";

type ParentUser = AuthResponse["user"] & {
  created_at?: string;
};

const avatars = [
  { id: "parent-mint", label: "Xanh bạc hà", swatch: "bg-emerald-300" },
  { id: "parent-sky", label: "Xanh trời", swatch: "bg-sky-300" },
  { id: "parent-sun", label: "Vàng ấm", swatch: "bg-amber-300" },
  { id: "parent-cream", label: "Kem dịu", swatch: "bg-orange-100" },
];

export function ParentProfile() {
  const [user, setUser] = useState<ParentUser | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarId, setAvatarId] = useState("parent-mint");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    apiGetRequired<ParentUser>("/auth/me/")
      .then((data) => {
        setUser(data);
        setUsername(data.username);
        setEmail(data.email);
        setAvatarId(data.avatar_id ?? "parent-mint");
        updateAuthUser(data);
      })
      .catch((err) => {
        setStatus(err instanceof Error ? err.message : "Không thể tải hồ sơ phụ huynh.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      const payload: Record<string, string> = {
        avatar_id: avatarId,
        email: email.trim(),
        username: username.trim(),
      };
      if (password.trim()) payload.password = password.trim();
      const updated = await apiPatch<ParentUser>("/auth/me/", payload);
      setUser(updated);
      updateAuthUser(updated);
      setPassword("");
      setStatus("Đã cập nhật hồ sơ phụ huynh.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Không thể cập nhật hồ sơ.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !user) {
    return (
      <Panel eyebrow="Tài khoản phụ huynh" title="Đang tải hồ sơ">
        <p className="text-sm font-semibold text-slate-500">Kindy-Mate đang lấy thông tin tài khoản từ hệ thống.</p>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <Panel eyebrow="Tài khoản phụ huynh" title="Hồ sơ đăng nhập">
        <div className="flex items-center gap-4 rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-black text-emerald-700 shadow-sm">
            {username.slice(0, 2).toUpperCase() || "PH"}
          </div>
          <div>
            <p className="text-lg font-black text-slate-800">{username || "Phụ huynh"}</p>
            <p className="text-sm font-bold text-slate-500">{email || "Chưa có email"}</p>
            <p className="mt-1 text-xs font-bold text-emerald-700">Vai trò: phụ huynh quản lý tài khoản trẻ</p>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-amber-100 bg-amber-50/70 p-5 text-sm font-semibold leading-6 text-slate-600">
          Trẻ không có tài khoản riêng trong phiên bản này. Mọi hồ sơ trẻ, luật sử dụng và dữ liệu báo cáo đều nằm dưới tài khoản phụ huynh.
        </div>
      </Panel>

      <Panel eyebrow="Chỉnh sửa" title="Cập nhật thông tin cá nhân">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            Tên đăng nhập
            <input
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              onChange={(event) => setUsername(event.target.value)}
              required
              value={username}
            />
          </label>

          <label className="grid gap-2 text-sm font-black text-slate-700">
            Email
            <input
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label className="grid gap-2 text-sm font-black text-slate-700">
            Mật khẩu mới
            <input
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Để trống nếu không đổi mật khẩu"
              type="password"
              value={password}
            />
          </label>

          <div className="grid gap-3">
            <span className="text-sm font-black text-slate-700">Ảnh đại diện</span>
            <div className="grid gap-3 sm:grid-cols-4">
              {avatars.map((avatar) => (
                <button
                  className={`rounded-2xl border p-4 text-left transition ${
                    avatarId === avatar.id
                      ? "border-emerald-400 bg-emerald-50 ring-4 ring-emerald-100"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                  key={avatar.id}
                  onClick={() => setAvatarId(avatar.id)}
                  type="button"
                >
                  <span className={`block h-9 w-9 rounded-xl ${avatar.swatch}`} />
                  <span className="mt-3 block text-xs font-black text-slate-700">{avatar.label}</span>
                </button>
              ))}
            </div>
          </div>

          {status && (
            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-bold text-slate-700">
              {status}
            </div>
          )}

          <button
            className="min-h-13 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-100 disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </form>
      </Panel>
    </div>
  );
}
