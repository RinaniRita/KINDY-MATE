"use client";

import { useEffect, useMemo, useState } from "react";

import { apiGetRequired, apiPost } from "@/lib/api";

import { rewardCategoryMeta, rewardCategoryOrder } from "./categoryMaps";
import type { ChildDashboardData, ChildProfileData, RewardItemData } from "./types";

type SpendResponse = {
  allowed: boolean;
  detail: string;
  wallet: {
    points_balance: number;
  };
};

type EntertainmentPageProps = {
  childId: string;
  allowedCategories?: string[];
  zoneLabel?: string;
  zoneTitle?: string;
  zoneDescription?: string;
};

function groupRewards(items: RewardItemData[]) {
  return rewardCategoryOrder
    .map((categoryKey) => ({
      key: categoryKey,
      meta: rewardCategoryMeta[categoryKey],
      items: items.filter((item) => item.display_category === categoryKey),
    }))
    .filter((group) => group.items.length > 0);
}

export function EntertainmentPage({
  childId,
  allowedCategories,
  zoneLabel = "Khu vui chơi",
  zoneTitle = "Đổi điểm để vào một góc chơi an toàn.",
  zoneDescription = "Mỗi mục đều được kiểm tra theo luật của phụ huynh trước khi mở cho cậu.",
}: EntertainmentPageProps) {
  const [child, setChild] = useState<ChildProfileData | null>(null);
  const [dashboard, setDashboard] = useState<ChildDashboardData | null>(null);
  const [rewards, setRewards] = useState<RewardItemData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [busyId, setBusyId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"success" | "warning">("warning");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [childData, dashboardData, rewardData] = await Promise.all([
          apiGetRequired<ChildProfileData>(`/children/${childId}/`),
          apiGetRequired<ChildDashboardData>(`/activity/dashboard/?child_id=${childId}`),
          apiGetRequired<RewardItemData[]>(`/gamification/reward-items/?child_id=${childId}`),
        ]);
        setChild(childData);
        setDashboard(dashboardData);
        setRewards(rewardData);
        setWalletBalance(dashboardData.wallet.points_balance);
      } finally {
        setLoading(false);
      }
    }
    load().catch(() => setLoading(false));
  }, [childId]);

  const filteredRewards = useMemo(() => {
    if (!allowedCategories?.length) return rewards;
    return rewards.filter((reward) => allowedCategories.includes(reward.display_category));
  }, [allowedCategories, rewards]);

  const grouped = useMemo(() => groupRewards(filteredRewards), [filteredRewards]);
  const resolvedCategory = grouped.some((group) => group.key === selectedCategory) ? selectedCategory : grouped[0]?.key || "";
  const resolvedGroup = grouped.find((group) => group.key === resolvedCategory);
  const showSelector = grouped.length > 1;

  async function refreshRewards() {
    const [dashboardData, rewardData] = await Promise.all([
      apiGetRequired<ChildDashboardData>(`/activity/dashboard/?child_id=${childId}`),
      apiGetRequired<RewardItemData[]>(`/gamification/reward-items/?child_id=${childId}`),
    ]);
    setDashboard(dashboardData);
    setRewards(rewardData);
    setWalletBalance(dashboardData.wallet.points_balance);
  }

  async function handleSpend(reward: RewardItemData) {
    setBusyId(reward.id);
    setFeedback("");
    try {
      const response = await apiPost<SpendResponse>("/gamification/spend/", {
        child_id: childId,
        reward_item_id: reward.id,
      });
      setWalletBalance(response.wallet.points_balance);
      setFeedback(response.detail);
      setFeedbackTone(response.allowed ? "success" : "warning");
      await refreshRewards();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Không thể đổi mục vui chơi này.");
      setFeedbackTone("warning");
      await refreshRewards();
    } finally {
      setBusyId("");
    }
  }

  if (loading || !child) {
    return (
      <div className="child-scene-shell rounded-[2.2rem] px-6 py-20 text-center">
        <p className="relative z-10 text-sm font-black text-slate-500">Milo đang mở khu này cho cậu...</p>
      </div>
    );
  }

  if (!grouped.length) {
    return (
      <section className="child-scene-shell rounded-[2.2rem] px-6 py-10">
        <div className="relative z-10 mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white/90 text-4xl shadow-lg">🎠</div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-800">{zoneLabel} đang nghỉ một chút</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-slate-600">
            Hôm nay chưa có mục nào phù hợp với luật hiện tại. Cậu có thể quay lại sau nhé.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="child-scene-shell rounded-[2.4rem] px-5 py-6 md:px-8 md:py-7">
        <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_1.08fr] xl:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">{zoneLabel}</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-800 sm:text-5xl">{zoneTitle}</h1>
            <p className="mt-4 max-w-xl text-base font-bold leading-8 text-slate-600">{zoneDescription}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="child-mini-badge">⭐ {walletBalance} điểm</span>
              <span className="child-mini-badge">🎬 {dashboard?.metrics.entertainment_minutes_today ?? 0} phút hôm nay</span>
              <span className="child-mini-badge">⏱️ {dashboard?.metrics.cap_left_today ?? 0} phút còn lại</span>
            </div>
          </div>

          {showSelector ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {grouped.map((group) => {
                const isActive = resolvedCategory === group.key;
                return (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => setSelectedCategory(group.key)}
                    className={`child-orbit-chip rounded-[1.9rem] bg-gradient-to-br ${group.meta.tone} px-4 py-4 text-left ${
                      isActive ? "ring-2 ring-white/80" : ""
                    }`}
                  >
                    <div className="text-3xl">{group.meta.icon}</div>
                    <p className="mt-3 text-base font-black text-slate-800">{group.meta.label}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{group.items.length} mục</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="justify-self-start xl:justify-self-end">
              <div className={`child-orbit-chip rounded-[2rem] bg-gradient-to-br ${grouped[0].meta.tone} px-5 py-5`}>
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{grouped[0].meta.icon}</span>
                  <div>
                    <p className="text-sm font-black text-slate-800">{grouped[0].meta.label}</p>
                    <p className="text-xs font-bold text-slate-500">{grouped[0].items.length} mục cho cậu</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {feedback ? (
        <div
          className={`rounded-[1.8rem] px-5 py-4 text-sm font-bold leading-7 shadow-sm ${
            feedbackTone === "success"
              ? "border border-[#dff6ee] bg-[#f3fbf7] text-slate-700"
              : "border border-[#fff1bf] bg-[#fffaf0] text-slate-700"
          }`}
        >
          {feedback}
        </div>
      ) : null}

      {resolvedGroup ? (
        <section className={`child-stage-board rounded-[2.2rem] bg-gradient-to-br ${resolvedGroup.meta.tone} px-5 py-6 md:px-7 md:py-7`}>
          <div className="relative z-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[2rem] bg-white/90 text-4xl shadow-lg">
                  {resolvedGroup.meta.icon}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Đang mở</p>
                  <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-800">{resolvedGroup.meta.label}</h2>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="child-mini-badge">
                  {child.rules.entertainment_paused ? "⏸️ Tạm dừng" : "✅ Đang mở"}
                </span>
                <span className="child-mini-badge">🕒 Cooldown {child.rules.cooldown_minutes} phút</span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {resolvedGroup.items.map((reward) => {
                const blockedMessage =
                  reward.is_accessible === false
                    ? reward.blocked_reason || "Mục này đang tạm thời chưa dùng được."
                    : walletBalance < reward.points_cost
                      ? "Cậu chưa đủ điểm cho mục này."
                      : "";
                const canRedeem = reward.is_accessible !== false && walletBalance >= reward.points_cost;

                return (
                  <article key={reward.id} className="child-island-card rounded-[2rem] px-5 py-5">
                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{reward.reward_type_label}</p>
                          <h3 className="mt-2 text-2xl font-black leading-tight text-slate-800">{reward.title}</h3>
                        </div>
                        <div className="child-mini-badge">{reward.points_cost} điểm</div>
                      </div>

                      <p className="mt-4 line-clamp-2 text-sm font-bold leading-7 text-slate-600">
                        {reward.description || "Một mục vui chơi nhẹ nhàng và an toàn."}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <span className="child-mini-badge">
                          {reward.duration_minutes > 0 ? `⏱️ ${reward.duration_minutes} phút` : "✨ Đổi ngay"}
                        </span>
                        <span className="child-mini-badge">{reward.display_category_label}</span>
                      </div>

                      <div
                        className={`mt-5 rounded-[1.5rem] px-4 py-3 text-sm font-bold leading-6 ${
                          blockedMessage
                            ? "border border-[#fff1bf] bg-[#fffaf0] text-slate-600"
                            : "border border-[#dff6ee] bg-[#f3fbf7] text-slate-600"
                        }`}
                      >
                        {blockedMessage || "Mục này đang sẵn sàng cho cậu."}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSpend(reward)}
                        disabled={!canRedeem || busyId === reward.id}
                        className={`mt-5 min-h-12 w-full rounded-[1.5rem] text-sm font-black shadow-md transition ${
                          canRedeem
                            ? "bg-gradient-to-r from-[#9dd9c6] to-[#bde6d9] text-slate-800 hover:-translate-y-0.5"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {busyId === reward.id ? "Đang kiểm tra..." : canRedeem ? "Mở khu này" : "Chưa thể mở"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
