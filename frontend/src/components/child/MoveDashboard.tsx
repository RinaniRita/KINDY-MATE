"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

import { apiGetRequired } from "@/lib/api";
import { YouTubeEmbed } from "@/components/common/YouTubeEmbed";
import { MascotVisual } from "./MascotVisual";
import type { MissionData } from "./types";

type MoveDashboardProps = {
  childId: string;
};

export function MoveDashboard({ childId }: { childId: string }) {
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>("https://www.youtube.com/watch?v=ET8rdp2b1a4");
  const [showQuickPlayer, setShowQuickPlayer] = useState(false);

  // Gamified daily health states
  const [streakDays, setStreakDays] = useState([true, true, true, false, false, false, false]); // Mon-Sun
  const [energyLevel, setEnergyLevel] = useState(85);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGetRequired<MissionData[]>(`/missions/?child_id=${childId}`);
        // Filter for active movement missions
        const activeMissions = data.filter(
          (m) => m.display_category === "van_dong" || m.title?.toLowerCase().includes("vận động")
        );
        setMissions(activeMissions);
      } catch (err) {
        console.error("Failed to load movement missions:", err);
      } finally {
        setLoading(false);
      }
    }
    load().catch(() => setLoading(false));
  }, [childId]);

  if (loading) {
    return (
      <div className="child-scene-shell rounded-[2.3rem] px-6 py-20 text-center">
        <p className="relative z-10 text-sm font-black text-slate-500">Milo đang trải thảm tập cho cậu...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* 🤸 ACTIVE KIDS FITNESS HEADER */}
      <section className="relative overflow-hidden rounded-[2.8rem] border border-white/80 bg-gradient-to-br from-[#fff2cc] via-[#fffbeb] to-[#e0f2fe] px-6 py-8 shadow-[0_28px_54px_rgba(145,163,179,0.18)] md:px-10 md:py-10">
        {/* Floating background decorative circles */}
        <div className="absolute -left-12 -top-12 h-44 w-44 rounded-full bg-white/40 blur-2xl animate-pulse" />
        <div className="absolute bottom-0 right-6 h-56 w-56 rounded-full bg-[#ffd880]/30 blur-2xl" />

        <div className="relative z-10 grid gap-6 xl:grid-cols-[1.2fr_0.8fr] items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 rounded-[1.8rem] border border-white/90 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md">
              <span className="text-4xl animate-bounce">🤸‍♀️</span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Khu Vận Động</p>
                <p className="text-base font-black text-slate-800">{missions.length} hoạt động thể chất sẵn sàng</p>
              </div>
            </div>

            <div className="max-w-2xl">
              <h1 className="text-4xl font-black tracking-tight text-slate-800 sm:text-5xl md:text-6xl leading-[1.15]">
                Thảm tập vui vẻ <br />
                <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-600 bg-clip-text text-transparent">
                  khỏe khoắn cùng Milo!
                </span>
              </h1>
              <p className="mt-4 text-base font-bold leading-relaxed text-slate-600 md:text-lg">
                Chỉ vài phút nhảy cao, duỗi người hoặc tập theo các bài nhảy ngắn là cơ thể cậu sẽ tràn ngập năng lượng cực đỉnh đấy!
              </p>
            </div>
          </div>

          {/* Gamified Weekly Health Dashboard */}
          <div className="rounded-[2.4rem] bg-white/70 border border-white/90 p-5 shadow-lg backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm font-black text-slate-700">🔋 Năng lượng của cậu</span>
              <span className="text-lg font-black text-orange-500">{energyLevel}%</span>
            </div>

            {/* Energy Bar */}
            <div className="relative h-6 w-full rounded-full bg-slate-100 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000"
                style={{ width: `${energyLevel}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-700">
                Cực kỳ sung sức! 🔥
              </div>
            </div>

            {/* 7-Day Streak Calendar */}
            <div className="pt-2">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Thử thách 7 ngày vận động</p>
              <div className="grid grid-cols-7 gap-2 text-center">
                {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day, idx) => (
                  <div key={day} className="space-y-1">
                    <div className="text-[10px] font-black text-slate-500">{day}</div>
                    <div className={`h-8 w-8 mx-auto flex items-center justify-center rounded-full text-base transition ${
                      streakDays[idx] 
                        ? "bg-emerald-100 border-2 border-emerald-300 text-emerald-600" 
                        : "bg-slate-100 border border-slate-200 text-slate-400"
                    }`}>
                      {streakDays[idx] ? "✅" : "⚡"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Left is Mascot Coach & Video Spotlight, Right is Mission Adventure Quests */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          {/* Milo Active Mascot Coach Box */}
          <section className="relative overflow-hidden rounded-[2.4rem] p-6 bg-gradient-to-br from-[#e0f2fe] via-[#f0f9ff] to-white border border-white/80 shadow-md">
            <div className="absolute top-3 right-3 opacity-[0.08] text-7xl select-none">🤸‍♀️</div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              {/* Mascot Visual with compact and no bubble inside, allowing it to act as a clean avatar */}
              <div className="flex-shrink-0 flex items-center justify-center bg-white/40 p-4 rounded-[2rem] border border-white/60 shadow-sm">
                <MascotVisual
                  mood="victory"
                  size="md"
                  compact={true}
                  message=""
                />
              </div>

              {/* Speech bubble style card for coach advice */}
              <div className="flex-1 space-y-3 w-full">
                <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-250 px-3 py-1 text-xs font-black text-emerald-600 shadow-sm">
                    🥇 Huấn Luyện Viên Milo
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-black text-blue-600 animate-pulse">
                    ⚡ Thể Lực Siêu Cấp
                  </span>
                </div>

                <div className="relative rounded-[2rem] bg-white p-5 border border-slate-100 shadow-sm before:content-[''] before:absolute before:left-1/2 before:-top-3 before:-translate-x-1/2 before:h-6 before:w-6 before:rotate-45 before:bg-white before:border-l before:border-t before:border-slate-100 md:before:left-[-10px] md:before:top-1/2 md:before:-translate-y-1/2 md:before:translate-x-0 md:before:border-t-0 md:before:border-r-0 md:before:border-l md:before:border-b">
                  <h4 className="text-lg font-black text-slate-800 flex items-center gap-1.5 justify-center md:justify-start">
                    Milo mách nhỏ cậu nè:
                  </h4>
                  <p className="mt-2 text-sm font-bold leading-relaxed text-slate-650 text-slate-600 text-center md:text-left">
                    "Mỗi khi cậu hoàn thành một bài vận động trên thảm, tớ sẽ tặng ngay sao may mắn ⭐ cực giá trị để cậu mua thêm thật nhiều đồ chơi cho tớ nhé! Cùng nhấc chân lên tập luyện thôi nào!"
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Quick-Play Embedded Exercise Challenge */}
          <section className="child-island-card overflow-hidden rounded-[2.4rem] p-6 bg-white/70 border border-white/80 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <span>🎬</span> Tập nhanh cùng Milo ngay:
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickPlayer(!showQuickPlayer)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 transition"
              >
                {showQuickPlayer ? "Đóng trình phát ✕" : "Mở trình phát ▶️"}
              </button>
            </div>

            {showQuickPlayer ? (
              <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-inner animate-in zoom-in-95 duration-350">
                <YouTubeEmbed urlOrId="https://www.youtube.com/watch?v=ET8rdp2b1a4" />
              </div>
            ) : (
              <div 
                onClick={() => setShowQuickPlayer(true)}
                className="group relative cursor-pointer overflow-hidden rounded-[2rem] aspect-video border border-slate-200 bg-gradient-to-br from-[#ffd59c]/40 to-[#9dd9c6]/40 flex flex-col items-center justify-center text-center p-6 space-y-3"
              >
                <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/0 transition-colors" />
                <div className="h-16 w-16 flex items-center justify-center rounded-full bg-white/90 text-2xl shadow-lg group-hover:scale-110 transition-transform text-orange-500 animate-pulse">
                  ▶️
                </div>
                <h4 className="text-lg font-black text-slate-800 group-hover:text-orange-600 transition-colors">Video: Tập nhảy vui vẻ cùng Milo 🏃🚀</h4>
                <p className="text-xs font-bold text-slate-500">Bấm vào để mở trình phát video và khởi động cùng Milo!</p>
              </div>
            )}
          </section>
        </div>

        {/* Adventure Quests Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <span>🎯</span> Danh sách thử thách vận động:
            </h2>
            <span className="rounded-full bg-orange-100 text-orange-700 text-xs font-black px-3 py-1">
              Active Quests
            </span>
          </div>

          <div className="grid gap-4">
            {missions.length > 0 ? (
              missions.map((mission, index) => (
                <Link
                  key={mission.id}
                  href={`/child/${childId}/missions/${mission.id}`}
                  className="group relative overflow-hidden rounded-[2.2rem] border border-white/80 bg-gradient-to-br from-[#fffbf0] via-[#ffffff] to-[#fffcf5] p-5 shadow-[0_12px_32px_rgba(145,163,179,0.08)] hover:shadow-[0_20px_44px_rgba(145,163,179,0.16)] hover:-translate-y-1 transition duration-300"
                >
                  <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-b from-orange-300 to-amber-400 group-hover:from-emerald-400 group-hover:to-teal-500 transition-all duration-300" />

                  <div className="pl-3 relative z-10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="rounded-[1.2rem] bg-orange-50 border border-orange-100 px-3 py-1.5 text-xs font-black text-orange-600">
                        Thử thách {index + 1} 🏃
                      </div>
                      <div className="rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-600 shadow-sm animate-pulse">
                        +{mission.points_reward} Điểm thưởng ⭐
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">van_dong</p>
                      <h3 className="mt-1 text-xl font-black leading-snug text-slate-800 group-hover:text-orange-600 transition-colors">
                        {mission.title}
                      </h3>
                      <p className="mt-2 text-sm font-bold text-slate-500 line-clamp-2 leading-relaxed">
                        {mission.description}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 items-center justify-between border-t border-slate-100 pt-4">
                      <div className="flex gap-2">
                        <span className="rounded-full bg-slate-50 border border-slate-150 px-3 py-1 text-xs font-black text-slate-500">
                          ⏱️ {mission.estimated_duration_minutes} phút
                        </span>
                        <span className="rounded-full bg-slate-50 border border-slate-150 px-3 py-1 text-xs font-black text-slate-500">
                          {mission.requires_camera ? "📷 Chụp ảnh" : "🫶 Tự làm"}
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1 text-sm font-black text-orange-500 group-hover:text-emerald-600 transition-colors">
                        Bắt đầu ngay 🚀
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-12 rounded-[2rem] bg-white border border-slate-100 p-6 space-y-3">
                <span className="text-4xl">😴</span>
                <h4 className="text-lg font-black text-slate-700">Hôm nay cậu đã tập đủ rồi!</h4>
                <p className="text-xs text-slate-500">Hãy tiếp tục thói quen lành mạnh vào ngày mai nhé!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
