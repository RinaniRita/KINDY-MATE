"use client";

import { useState } from "react";
import { AppShell } from "@/components/common/AppShell";
import { Panel } from "@/components/common/Cards";
import { parentRoutes } from "@/lib/routes";
import { apiPost } from "@/lib/api";

const AVATARS = [
  { id: "milo", label: "Milo Thường 🐹", emoji: "🐹" },
  { id: "astronaut", label: "Milo Phi Hành Gia 🧑‍🚀", emoji: "🧑‍🚀" },
  { id: "explorer", label: "Milo Thám Hiểm 🧭", emoji: "🧭" },
  { id: "artist", label: "Milo Họa Sĩ 🎨", emoji: "🎨" },
];

export default function ChildProfileOnboardingPage() {
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState(6);
  const [interests, setInterests] = useState("");
  const [favoriteSubjects, setFavoriteSubjects] = useState("");
  const [avatarId, setAvatarId] = useState("milo");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    
    if (!nickname.trim()) {
      setStatus("Vui lòng điền biệt danh của bé.");
      return;
    }
    if (age < 2 || age > 8) {
      setStatus("Độ tuổi của trẻ phải từ 2 đến 8 tuổi.");
      return;
    }

    setLoading(true);
    try {
      const child = await apiPost<{ id: string }>(`/children/`, {
        nickname: nickname.trim(),
        age: Number(age),
        interests: interests.trim(),
        favorite_subjects: favoriteSubjects.trim(),
        avatar_id: avatarId,
      });

      // Save as the currently selected child and route to rules onboarding
      if (typeof window !== "undefined") {
        window.localStorage.setItem("active_child_id", child.id);
      }
      
      window.location.href = `/onboarding/rules?childId=${child.id}`;
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Có lỗi xảy ra khi tạo hồ sơ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell nav={parentRoutes} subtitle="Tạo hồ sơ cho bé" title="Khu phụ huynh">
      <div className="max-w-2xl mx-auto py-4">
        <Panel eyebrow="Bước 2/3: Onboarding trẻ" title="Thiết lập hồ sơ cho bé 👧👦">
          <p className="text-xs font-bold leading-relaxed text-slate-550 mb-6 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
            🛡️ <strong>Cam kết an toàn:</strong> Không nhập tên thật, ảnh thật, trường học hay bất cứ thông tin nhận dạng nào khác của bé nhằm tuân thủ tuyệt đối quy định bảo mật COPPA/GDPR-K.
          </p>

          <form onSubmit={handleCreate} className="grid gap-5">
            {/* Nickname */}
            <label className="grid gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Tên gọi / Biệt danh của bé
              <input
                className="min-h-12 rounded-xl border border-slate-200 bg-white/70 px-4 font-bold text-slate-800 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100/50"
                onChange={(e) => setNickname(e.target.value)}
                placeholder="VD: Mina, Bin, Cún..."
                type="text"
                value={nickname}
                required
              />
            </label>

            {/* Age - Only 2 to 8 */}
            <label className="grid gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Độ tuổi của bé (Kindy-Mate dành riêng cho trẻ từ 2-8 tuổi)
              <select
                className="min-h-12 rounded-xl border border-slate-200 bg-white/70 px-4 font-bold text-slate-800 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100/50"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
              >
                {[2, 3, 4, 5, 6, 7, 8].map((val) => (
                  <option key={val} value={val}>
                    {val} tuổi
                  </option>
                ))}
              </select>
            </label>

            {/* Avatar Select */}
            <div className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">Mascot đồng hành cùng bé</span>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setAvatarId(av.id)}
                    className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                      avatarId === av.id
                        ? "border-emerald-400 bg-emerald-50/50 text-emerald-800 ring-4 ring-emerald-100/50"
                        : "border-slate-200 bg-white hover:border-slate-350"
                    }`}
                  >
                    <span className="text-3xl">{av.emoji}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider leading-none">{av.label.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Interests */}
            <label className="grid gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Sở thích của bé
              <input
                className="min-h-12 rounded-xl border border-slate-200 bg-white/70 px-4 font-bold text-slate-800 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100/50"
                onChange={(e) => setInterests(e.target.value)}
                placeholder="VD: Vẽ tranh, Động vật hoang dã, Siêu nhân, Lắp ráp Lego..."
                type="text"
                value={interests}
              />
            </label>

            {/* Favorite Subjects */}
            <label className="grid gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Môn học yêu thích (phục vụ AI gợi ý nhiệm vụ phù hợp)
              <input
                className="min-h-12 rounded-xl border border-slate-200 bg-white/70 px-4 font-bold text-slate-800 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100/50"
                onChange={(e) => setFavoriteSubjects(e.target.value)}
                placeholder="VD: Toán học, Đọc truyện cổ tích, Học tiếng Anh, Khoa học tự nhiên..."
                type="text"
                value={favoriteSubjects}
              />
            </label>

            {/* Status alerts */}
            {status && (
              <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs font-bold text-rose-700 animate-bounce-gentle">
                ❌ {status}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="bubbly-btn mt-4 min-h-14 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 text-sm font-black text-white shadow-lg shadow-emerald-100 disabled:opacity-60"
            >
              {loading ? "Đang lưu hồ sơ..." : "Lưu hồ sơ và Tiếp tục ➔"}
            </button>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
