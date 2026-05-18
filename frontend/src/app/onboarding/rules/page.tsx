"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/common/AppShell";
import { Panel } from "@/components/common/Cards";
import { parentRoutes } from "@/lib/routes";
import { apiPatch, apiGet } from "@/lib/api";

type RuleData = {
  daily_entertainment_cap_minutes: number;
  cooldown_minutes: number;
  voice_enabled: boolean;
  camera_enabled: boolean;
  entertainment_paused: boolean;
};

function RulesOnboardingForm() {
  const searchParams = useSearchParams();
  const childId = searchParams.get("childId");

  const [dailyCap, setDailyCap] = useState(20);
  const [cooldown, setCooldown] = useState(15);
  const [voice, setVoice] = useState(false);
  const [camera, setCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  // Fetch initial child rules if childId is active
  useEffect(() => {
    if (!childId) return;
    apiGet<{ rules: RuleData } | null>(`/children/${childId}/`, null)
      .then((data) => {
        if (data?.rules) {
          setDailyCap(data.rules.daily_entertainment_cap_minutes);
          setCooldown(data.rules.cooldown_minutes);
          setVoice(data.rules.voice_enabled);
          setCamera(data.rules.camera_enabled);
        }
      })
      .catch(() => {});
  }, [childId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!childId) {
      setStatus("Không tìm thấy thông tin hồ sơ của bé. Vui lòng tạo hồ sơ trước.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      await apiPatch(`/children/${childId}/rules/`, {
        daily_entertainment_cap_minutes: Number(dailyCap),
        cooldown_minutes: Number(cooldown),
        voice_enabled: voice,
        camera_enabled: camera,
      });

      // On successful rules setup, redirect to parent dashboard!
      window.location.href = "/parent/dashboard";
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Không thể thiết lập luật lệ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-4">
      <Panel eyebrow="Bước 3/3: Luật lệ bảo vệ" title="Thiết lập giới hạn & quyền hạn của trẻ 🛡️">
        <p className="text-xs font-bold leading-relaxed text-slate-550 mb-6 bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50">
          ⚖️ <strong>Luật phụ huynh ghi đè ví điểm:</strong> Mọi cài đặt ở đây là tuyệt đối. Cho dù bé có tích lũy được hàng ngàn điểm thưởng, khi hết hạn mức ngày hoặc ứng dụng bị khóa, bé sẽ tự động dừng giải trí.
        </p>

        <form onSubmit={handleSave} className="grid gap-6">
          {/* Daily Cap */}
          <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-black text-slate-800 text-xs uppercase tracking-wider">Hạn mức giải trí ngày</span>
              <span className="text-blue-500 font-black text-sm bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">{dailyCap} phút</span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={dailyCap}
              onChange={(e) => setDailyCap(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-[10px] font-bold text-slate-400">
              Tổng thời lượng tối đa con được dùng điểm đổi thời gian xem phim/chơi game học tập mỗi ngày.
            </p>
          </div>

          {/* Cooldown */}
          <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-black text-slate-800 text-xs uppercase tracking-wider">Thời gian nghỉ tối thiểu</span>
              <span className="text-emerald-500 font-black text-sm bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">{cooldown} phút</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={cooldown}
              onChange={(e) => setCooldown(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-[10px] font-bold text-slate-400">
              Quãng nghỉ bắt buộc giữa mỗi đợt đổi điểm giải trí để bảo vệ đôi mắt và tinh thần của bé.
            </p>
          </div>

          {/* Permissions Toggles */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Voice Enabled */}
            <div className="p-4 rounded-xl border border-slate-100 bg-white flex items-center justify-between shadow-sm">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Quyền Microphone</h4>
                <p className="text-[9px] font-bold text-slate-400 mt-0.5">Dành cho nhiệm vụ tập đọc</p>
              </div>
              <button
                type="button"
                className={`h-6 w-12 rounded-full p-0.5 transition-colors duration-300 ${voice ? "bg-emerald-400" : "bg-slate-200"}`}
                onClick={() => setVoice(!voice)}
              >
                <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${voice ? "translate-x-6" : ""}`} />
              </button>
            </div>

            {/* Camera Enabled */}
            <div className="p-4 rounded-xl border border-slate-100 bg-white flex items-center justify-between shadow-sm">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Quyền Camera</h4>
                <p className="text-[9px] font-bold text-slate-400 mt-0.5">Xác thực vận động cơ thể</p>
              </div>
              <button
                type="button"
                className={`h-6 w-12 rounded-full p-0.5 transition-colors duration-300 ${camera ? "bg-emerald-400" : "bg-slate-200"}`}
                onClick={() => setCamera(!camera)}
              >
                <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${camera ? "translate-x-6" : ""}`} />
              </button>
            </div>
          </div>

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
            className="bubbly-btn mt-2 min-h-14 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 text-sm font-black text-white shadow-lg shadow-emerald-100 disabled:opacity-60"
          >
            {loading ? "Đang áp dụng..." : "Kích hoạt tài khoản & Vào Bảng quản trị ➔"}
          </button>
        </form>
      </Panel>
    </div>
  );
}

export default function RulesOnboardingPage() {
  return (
    <AppShell nav={parentRoutes} subtitle="Thiết lập luật an toàn" title="Khu phụ huynh">
      <Suspense fallback={<div className="text-center py-10 font-bold text-slate-500">Đang tải thiết lập...</div>}>
        <RulesOnboardingForm />
      </Suspense>
    </AppShell>
  );
}
