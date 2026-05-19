"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiGetRequired } from "@/lib/api";

import { missionCategoryMeta, missionCategoryOrder } from "./categoryMaps";
import type { MissionData } from "./types";

type MissionListProps = {
  childId: string;
  allowedCategories?: string[];
  zoneLabel?: string;
  zoneTitle?: string;
  zoneDescription?: string;
};

function groupByCategory(missions: MissionData[]) {
  return missionCategoryOrder
    .map((categoryKey) => ({
      key: categoryKey,
      meta: missionCategoryMeta[categoryKey],
      items: missions.filter((mission) => mission.display_category === categoryKey),
    }))
    .filter((group) => group.items.length > 0);
}

function missionDecor(categoryKey: string) {
  if (categoryKey === "doc_sach") return "Êm và tập trung";
  if (categoryKey === "van_dong") return "Năng lượng vừa phải";
  if (categoryKey === "ky_nang_song") return "Làm được ngay";
  if (categoryKey === "sang_tao") return "Bay bổng";
  return "Khám phá từng chút";
}

function zoneEmoji(zoneLabel: string) {
  if (zoneLabel.includes("Bàn học")) return "✏️";
  if (zoneLabel.includes("Thảm tập")) return "🤸";
  if (zoneLabel.includes("Góc vẽ")) return "🎨";
  return "🌱";
}

export function MissionList({
  childId,
  allowedCategories,
  zoneLabel = "Khu phát triển",
  zoneTitle = "Hôm nay cậu muốn lớn lên theo cách nào?",
  zoneDescription = "Chọn một khu. Mỗi khu có những việc ngắn, rõ ràng và vừa sức với cậu.",
}: MissionListProps) {
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGetRequired<MissionData[]>(`/missions/?child_id=${childId}`);
        setMissions(data);
      } finally {
        setLoading(false);
      }
    }
    load().catch(() => setLoading(false));
  }, [childId]);

  const filteredMissions = useMemo(() => {
    if (!allowedCategories?.length) return missions;
    return missions.filter((mission) => allowedCategories.includes(mission.display_category));
  }, [allowedCategories, missions]);

  const grouped = useMemo(() => groupByCategory(filteredMissions), [filteredMissions]);
  const resolvedCategory = grouped.some((group) => group.key === selectedCategory) ? selectedCategory : grouped[0]?.key || "";
  const resolvedGroup = grouped.find((group) => group.key === resolvedCategory);
  const showSelector = grouped.length > 1;
  const emoji = zoneEmoji(zoneLabel);

  if (loading) {
    return (
      <div className="child-scene-shell rounded-[2.3rem] px-6 py-20 text-center">
        <p className="relative z-10 text-sm font-black text-slate-500">Milo đang sắp xếp hoạt động cho cậu...</p>
      </div>
    );
  }

  if (!grouped.length) {
    return (
      <section className="child-scene-shell rounded-[2.3rem] px-6 py-10">
        <div className="relative z-10 mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[#fff0cc] text-4xl shadow-lg">{emoji}</div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-800">{zoneLabel} đang nghỉ một chút</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-slate-600">
            Hôm nay chưa có hoạt động phù hợp với độ tuổi và luật hiện tại. Cậu có thể quay lại sau nhé.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="relative overflow-hidden rounded-[2.6rem] border border-white/80 bg-gradient-to-br from-[#fff6da] via-[#e8f7f0] to-[#dff0ff] px-5 py-6 shadow-[0_28px_54px_rgba(145,163,179,0.18)] md:px-8 md:py-8">
        <div className="absolute -left-12 top-10 h-40 w-40 rounded-full bg-white/35 blur-2xl" />
        <div className="absolute bottom-0 right-6 h-48 w-48 rounded-full bg-[#fff5c5]/55 blur-2xl" />

        <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_1.1fr] xl:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-3 rounded-[1.7rem] border border-white/80 bg-white/72 px-4 py-3 shadow-sm">
              <span className="text-3xl">{emoji}</span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{zoneLabel}</p>
                <p className="text-base font-black text-slate-800">{grouped.reduce((sum, group) => sum + group.items.length, 0)} việc cho cậu</p>
              </div>
            </div>

            <div className="max-w-3xl">
              <h1 className="text-4xl font-black tracking-tight text-slate-800 sm:text-5xl md:text-6xl">{zoneTitle}</h1>
              <p className="mt-4 text-base font-bold leading-8 text-slate-600 md:text-lg">{zoneDescription}</p>
            </div>
          </div>

          <div className={`${showSelector ? "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" : "justify-self-start xl:justify-self-end"}`}>
            {showSelector ? grouped.map((group) => {
              const isActive = resolvedCategory === group.key;
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setSelectedCategory(group.key)}
                  className={`child-orbit-chip rounded-[2rem] bg-gradient-to-br ${group.meta.tone} px-4 py-4 text-left ${
                    isActive ? "ring-2 ring-white/90 shadow-[0_18px_32px_rgba(145,163,179,0.2)]" : ""
                  }`}
                >
                  <div className="text-3xl">{group.meta.icon}</div>
                  <p className="mt-3 text-base font-black text-slate-800">{group.meta.label}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{group.items.length} việc</p>
                </button>
              );
            }) : (
              <div className={`child-orbit-chip rounded-[2rem] bg-gradient-to-br ${grouped[0].meta.tone} px-5 py-5`}>
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{grouped[0].meta.icon}</span>
                  <div>
                    <p className="text-sm font-black text-slate-800">{grouped[0].meta.label}</p>
                    <p className="text-xs font-bold text-slate-500">{grouped[0].items.length} việc cho cậu</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {resolvedGroup ? (
        <section className={`relative overflow-hidden rounded-[2.6rem] border border-white/80 bg-gradient-to-br ${resolvedGroup.meta.tone} px-5 py-6 shadow-[0_28px_54px_rgba(145,163,179,0.18)] md:px-7 md:py-7`}>
          <div className="absolute -right-8 top-8 text-[180px] opacity-[0.07]">{resolvedGroup.meta.icon}</div>
          <div className="absolute -left-10 bottom-0 h-44 w-44 rounded-full bg-white/35 blur-2xl" />

          <div className="relative z-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-[5rem] w-[5rem] items-center justify-center rounded-[2rem] border border-white/80 bg-white/78 text-4xl shadow-lg">
                  {resolvedGroup.meta.icon}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Đang mở</p>
                  <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-800 md:text-4xl">{resolvedGroup.meta.label}</h2>
                </div>
              </div>
              <div className="child-mini-badge bg-white/86">{missionDecor(resolvedGroup.key)}</div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {resolvedGroup.items.map((mission, index) => (
                <Link
                  key={mission.id}
                  href={`/child/${childId}/mission/${mission.id}`}
                  className={`group relative overflow-hidden rounded-[2.2rem] border border-white/82 bg-gradient-to-br ${resolvedGroup.meta.tone} px-5 py-5 shadow-[0_18px_36px_rgba(145,163,179,0.14)] transition hover:-translate-y-1 hover:shadow-[0_24px_44px_rgba(145,163,179,0.22)]`}
                >
                  <div className="absolute inset-x-0 top-0 h-16 bg-white/28" />
                  <div className="absolute -right-3 bottom-0 text-7xl opacity-[0.12] transition group-hover:scale-110">{resolvedGroup.meta.icon}</div>

                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="rounded-[1.2rem] border border-white/80 bg-white/76 px-3 py-2 text-xs font-black text-slate-500 shadow-sm">
                        Chặng {index + 1}
                      </div>
                      <div className="rounded-full border border-white/80 bg-[#fff7d8] px-3 py-2 text-xs font-black text-slate-700 shadow-sm">
                        +{mission.points_reward} điểm
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{mission.mission_type_label}</p>
                      <h3 className="mt-2 text-2xl font-black leading-tight text-slate-800">{mission.title}</h3>
                    </div>

                    <div className="mt-4 rounded-[1.5rem] bg-white/58 px-4 py-4">
                      <p className="line-clamp-2 text-sm font-bold leading-7 text-slate-650 text-slate-600">{mission.description}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/80 bg-white/70 px-3 py-2 text-xs font-black text-slate-600">
                        ⏱️ {mission.estimated_duration_minutes} phút
                      </span>
                      <span className="rounded-full border border-white/80 bg-white/70 px-3 py-2 text-xs font-black text-slate-600">
                        {mission.requires_voice ? "🎤 Micro" : mission.requires_camera ? "📷 Camera" : "🫶 Không cần thiết bị"}
                      </span>
                    </div>

                    <div className="mt-5 flex items-center justify-between rounded-[1.35rem] bg-[#fff7ea]/70 px-4 py-3">
                      <span className="text-sm font-black text-slate-700">Vào khu này</span>
                      <span className="text-2xl">{resolvedGroup.meta.icon}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
