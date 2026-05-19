"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiGetRequired } from "@/lib/api";

import { MascotVisual } from "./MascotVisual";
import type { ChildDashboardData, ChildProfileData, MissionData } from "./types";

type MiloPrompt = "start" | "rest" | "points";

const promptMeta: Record<MiloPrompt, { label: string; reply: string; ctaLabel: string; ctaHref: (childId: string) => string }> = {
  start: {
    label: "Tớ nên bắt đầu ở đâu?",
    reply: "Tớ nghĩ cậu nên ghé bàn học trước, rồi sau đó nếu thích mình ra góc vẽ.",
    ctaLabel: "Đi tới bàn học",
    ctaHref: (childId) => `/child/${childId}/study`,
  },
  rest: {
    label: "Tớ muốn nhẹ nhàng thôi",
    reply: "Vậy mình chọn một việc ngắn hoặc xem một mục khoa học thật êm nhé.",
    ctaLabel: "Đi tới TV",
    ctaHref: (childId) => `/child/${childId}/watch`,
  },
  points: {
    label: "Tớ muốn kiếm thêm điểm",
    reply: "Điểm đến nhanh nhất là hoàn thành một việc ở khu phát triển. Thảm tập cũng vui lắm.",
    ctaLabel: "Đi tới thảm tập",
    ctaHref: (childId) => `/child/${childId}/move`,
  },
};

function chooseSuggestion(missions: MissionData[], dashboard: ChildDashboardData | null) {
  if ((dashboard?.metrics.cap_left_today ?? 0) <= 0) {
    return "Hôm nay mình nghỉ khu vui chơi và chọn một việc thật nhẹ nhé.";
  }
  const creative = missions.find((mission) => mission.display_category === "sang_tao");
  if (creative) return `Tớ đang nghĩ tới "${creative.title}".`;
  const study = missions.find((mission) => mission.display_category === "hoc_hanh");
  if (study) return `Bàn học đang có "${study.title}" cho cậu.`;
  return "Cậu có thể chạm vào một góc trong phòng để bắt đầu.";
}

export function MiloHub({ childId }: { childId: string }) {
  const [child, setChild] = useState<ChildProfileData | null>(null);
  const [dashboard, setDashboard] = useState<ChildDashboardData | null>(null);
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<MiloPrompt>("start");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [childData, dashboardData, missionData] = await Promise.all([
          apiGetRequired<ChildProfileData>(`/children/${childId}/`),
          apiGetRequired<ChildDashboardData>(`/activity/dashboard/?child_id=${childId}`),
          apiGetRequired<MissionData[]>(`/missions/?child_id=${childId}`),
        ]);
        setChild(childData);
        setDashboard(dashboardData);
        setMissions(missionData);
      } finally {
        setLoading(false);
      }
    }
    load().catch(() => setLoading(false));
  }, [childId]);

  const suggestion = useMemo(() => chooseSuggestion(missions, dashboard), [missions, dashboard]);
  const prompt = promptMeta[selectedPrompt];

  if (loading || !child) {
    return (
      <div className="child-scene-shell rounded-[2.2rem] px-6 py-20 text-center">
        <p className="relative z-10 text-sm font-black text-slate-500">Milo đang nghĩ cho cậu...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="child-scene-shell rounded-[2.4rem] px-5 py-6 md:px-8 md:py-8">
        <div className="relative z-10 space-y-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Milo</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-800 sm:text-5xl">Tớ ở đây để đi cùng cậu.</h1>
            <p className="mt-4 max-w-xl text-base font-bold leading-8 text-slate-600">{suggestion}</p>
          </div>

          <div className="child-stage-board rounded-[2.1rem] px-5 py-6">
            <div className="relative z-10 flex justify-center">
              <MascotVisual mood="hello" size="lg" message="Cậu chọn một ô hỏi nhanh nhé. Tớ sẽ trả lời ngay." />
            </div>
          </div>

          <div className="grid gap-3">
            {Object.entries(promptMeta).map(([key, meta]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedPrompt(key as MiloPrompt)}
                className={`child-orbit-chip rounded-[1.6rem] px-4 py-4 text-left ${
                  selectedPrompt === key ? "bg-gradient-to-r from-[#dff6ee] to-[#dff0ff]" : "bg-white/88"
                }`}
              >
                <span className="text-base font-black text-slate-800">{meta.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6">
        <section className="child-stage-board rounded-[2.2rem] px-5 py-6 md:px-7 md:py-7">
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Hộp thoại của Milo</p>
            <div className="mt-5 space-y-4">
              <div className="ml-auto max-w-[85%] rounded-[1.7rem] border border-white/70 bg-white/90 px-4 py-3 text-sm font-black leading-7 text-slate-700 shadow-sm">
                {prompt.label}
              </div>
              <div className="max-w-[88%] rounded-[1.9rem] bg-gradient-to-r from-[#dff6ee] to-[#dff0ff] px-5 py-4 text-sm font-bold leading-7 text-slate-700 shadow-sm">
                {prompt.reply}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={prompt.ctaHref(childId)} className="rounded-[1.4rem] bg-gradient-to-r from-[#9dd9c6] to-[#bde6d9] px-5 py-3 text-sm font-black text-slate-800 shadow-md">
                {prompt.ctaLabel}
              </Link>
              <Link href={`/child/${childId}/mascot`} className="rounded-[1.4rem] border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm">
                Đổi đồ cho Milo
              </Link>
            </div>
          </div>
        </section>

        <section className="child-stage-board rounded-[2.2rem] px-5 py-6 md:px-7 md:py-7">
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Hôm nay của cậu</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="child-island-card rounded-[1.6rem] px-4 py-4">
                <p className="relative z-10 text-2xl font-black text-slate-800">{dashboard?.wallet.points_balance ?? child.wallet_balance}</p>
                <p className="relative z-10 text-xs font-bold text-slate-500">Điểm</p>
              </div>
              <div className="child-island-card rounded-[1.6rem] px-4 py-4">
                <p className="relative z-10 text-2xl font-black text-slate-800">{dashboard?.metrics.mission_completion_count ?? 0}</p>
                <p className="relative z-10 text-xs font-bold text-slate-500">Việc xong</p>
              </div>
              <div className="child-island-card rounded-[1.6rem] px-4 py-4">
                <p className="relative z-10 text-2xl font-black text-slate-800">{dashboard?.metrics.cap_left_today ?? 0}p</p>
                <p className="relative z-10 text-xs font-bold text-slate-500">Còn lại</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
