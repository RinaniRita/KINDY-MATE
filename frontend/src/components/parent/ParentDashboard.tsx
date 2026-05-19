"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Metric, Panel } from "@/components/common/Cards";
import { apiGet, apiGetRequired } from "@/lib/api";

type ChildProfile = {
  id: string;
  nickname: string;
  age: number;
};

type DashboardData = {
  child: ChildProfile;
  wallet: {
    points_balance: number;
    points_earned_total: number;
    points_spent_total: number;
  };
  rules: {
    daily_entertainment_cap_minutes: number;
    entertainment_paused: boolean;
    voice_enabled: boolean;
    camera_enabled: boolean;
  };
  metrics: {
    learning_minutes: number;
    reading_minutes: number;
    movement_minutes: number;
    creative_minutes: number;
    entertainment_minutes_today: number;
    documentary_minutes: number;
    screen_time_minutes: number;
    total_app_minutes: number;
    mission_completion_count: number;
    blocked_attempts: number;
    cap_left_today: number;
  };
  mission_mix: Record<string, number>;
  alerts: string[];
  weekly_summary: string;
  recent_transactions: Array<{
    id: string;
    type: string;
    points: number;
    reason: string;
    created_at: string;
  }>;
};

type HourlyData = {
  hour: number;
  label: string;
  total_minutes: number;
  breakdown: Record<string, number>;
};

/* ───── Hourly Usage Chart (pure CSS) ───── */
function UsageChart({ data }: { data: HourlyData[] }) {
  const maxVal = Math.max(...data.map((d) => d.total_minutes), 1);

  return (
    <div className="mt-4">
      <div className="flex items-end gap-[2px] h-32">
        {data.map((h) => {
          const height = (h.total_minutes / maxVal) * 100;
          const hasData = h.total_minutes > 0;
          return (
            <div key={h.hour} className="relative flex-1 group" title={`${h.label}: ${h.total_minutes} phút`}>
              <div
                className={`w-full rounded-t transition-all duration-500 ${
                  hasData
                    ? "bg-gradient-to-t from-emerald-400 to-teal-300 group-hover:from-emerald-500 group-hover:to-teal-400"
                    : "bg-slate-100"
                }`}
                style={{ height: `${Math.max(height, 3)}%` }}
              />
              {/* Tooltip */}
              {hasData && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none z-10">
                  {h.total_minutes}p
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-[2px] mt-1">
        {data.map((h) => (
          <div key={h.hour} className="flex-1 text-center text-[8px] font-bold text-slate-400">
            {h.hour % 3 === 0 ? h.label.slice(0, 2) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───── Mission Mix Bar ───── */
function MissionMixBar({ mix }: { mix: Record<string, number> }) {
  const labels: Record<string, { label: string; color: string }> = {
    learning: { label: "Học", color: "bg-emerald-400" },
    reading: { label: "Đọc", color: "bg-blue-400" },
    movement: { label: "Vận động", color: "bg-amber-400" },
    creative: { label: "Sáng tạo", color: "bg-violet-400" },
    reflection: { label: "Suy ngẫm", color: "bg-pink-400" },
  };
  const total = Object.values(mix).reduce((a, b) => a + b, 0) || 1;

  return (
    <div>
      <div className="flex h-4 rounded-full overflow-hidden bg-slate-100">
        {Object.entries(mix).map(([key, val]) => (
          <div
            key={key}
            className={`${labels[key]?.color || "bg-slate-300"} transition-all duration-500`}
            style={{ width: `${(val / total) * 100}%` }}
            title={`${labels[key]?.label || key}: ${val}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {Object.entries(mix).map(([key, val]) => (
          <span key={key} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
            <span className={`inline-block h-2 w-2 rounded-full ${labels[key]?.color || "bg-slate-300"}`} />
            {labels[key]?.label || key}: {val}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───── Main Dashboard ───── */
export function ParentDashboard() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadChildren() {
      setLoading(true);
      setError("");
      try {
        const data = await apiGetRequired<ChildProfile[]>("/children/");
        setChildren(data);
        const activeChildId =
          typeof window !== "undefined" ? window.localStorage.getItem("active_child_id") : "";
        const nextChildId = data.find((child) => child.id === activeChildId)?.id ?? data[0]?.id ?? "";
        setSelectedChildId(nextChildId);
        if (!nextChildId) setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải danh sách trẻ.");
        setLoading(false);
      }
    }
    loadChildren();
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;
    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const [data, hourly] = await Promise.all([
          apiGetRequired<DashboardData>(`/activity/dashboard/?child_id=${selectedChildId}`),
          apiGet<{ hours: HourlyData[] }>(`/activity/hourly-usage/?child_id=${selectedChildId}`, { hours: [] }),
        ]);
        setDashboard(data);
        setHourlyData(hourly.hours || []);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("active_child_id", selectedChildId);
        }
      } catch (err) {
        setDashboard(null);
        setError(err instanceof Error ? err.message : "Không thể tải tổng quan.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [selectedChildId]);

  const capPercent = useMemo(() => {
    if (!dashboard) return 0;
    const cap = dashboard.rules.daily_entertainment_cap_minutes || 1;
    return Math.min((dashboard.metrics.entertainment_minutes_today / cap) * 100, 100);
  }, [dashboard]);

  if (loading) {
    return (
      <Panel eyebrow="Tổng quan" title="Đang tải dữ liệu gia đình">
        <div className="flex items-center gap-3 py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-500" />
          <p className="text-sm font-semibold text-slate-500">Kindy-Mate đang đồng bộ dashboard từ cơ sở dữ liệu.</p>
        </div>
      </Panel>
    );
  }

  if (!children.length) {
    return (
      <Panel eyebrow="Tổng quan" title="Chưa có hồ sơ trẻ">
        <div className="rounded-3xl border border-dashed border-sky-200 bg-sky-50/70 p-6">
          <p className="text-sm font-semibold leading-6 text-slate-600">
            Tài khoản phụ huynh đã sẵn sàng. Hãy tạo hồ sơ trẻ đầu tiên để dashboard có dữ liệu.
          </p>
          <Link
            className="mt-5 inline-flex rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-100"
            href="/onboarding/child-profile"
          >
            Tạo hồ sơ trẻ
          </Link>
        </div>
      </Panel>
    );
  }

  if (error || !dashboard) {
    return (
      <Panel eyebrow="Tổng quan" title="Chưa thể tải dashboard">
        <p className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-slate-700">
          {error || "Dữ liệu dashboard chưa sẵn sàng."}
        </p>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6 py-4">
      {/* ─── Row 1: Child Selector + Quick Stats ─── */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 outline-none focus:border-emerald-400"
          onChange={(event) => setSelectedChildId(event.target.value)}
          value={selectedChildId}
        >
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.nickname}, {child.age} tuổi
            </option>
          ))}
        </select>
        <span className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
          💰 {dashboard.wallet.points_balance} điểm
        </span>
        <span className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700">
          ⭐ Tổng tích lũy: {dashboard.wallet.points_earned_total}
        </span>
        <Link
          href={`/child/${selectedChildId}/home`}
          className="bubbly-btn ml-auto rounded-2xl bg-gradient-to-r from-blue-400 to-indigo-400 px-5 py-2.5 text-xs font-black text-white shadow-md"
        >
          ▶ Vào khu trẻ em
        </Link>
      </div>

      {/* ─── Row 2: Main Grid ─── */}
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        {/* LEFT: Activity metrics + chart */}
        <div className="grid gap-6">
          <Panel eyebrow={`📊 Cân bằng phát triển`} title="Hoạt động trong ngày">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-2">
              <Metric label="Tổng thời gian app" value={`${dashboard.metrics.total_app_minutes || 0} phút`} variant="purple" />
              <Metric label="📚 Học tập" value={`${dashboard.metrics.learning_minutes} phút`} variant="green" />
              <Metric label="📖 Đọc sách" value={`${dashboard.metrics.reading_minutes} phút`} variant="blue" />
              <Metric label="🏃 Vận động" value={`${dashboard.metrics.movement_minutes} phút`} variant="yellow" />
              <Metric label="🎨 Sáng tạo" value={`${dashboard.metrics.creative_minutes || 0} phút`} variant="purple" />
            </div>

            {/* Entertainment cap bar */}
            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500">
                <span>🎮 Hạn mức giải trí hôm nay</span>
                <span className={capPercent >= 90 ? "text-rose-600" : "text-slate-600"}>{Math.round(capPercent)}% đã dùng</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-white">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    capPercent >= 90 ? "bg-gradient-to-r from-rose-300 to-rose-400" : "bg-gradient-to-r from-amber-300 to-teal-300"
                  }`}
                  style={{ width: `${capPercent}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] font-bold text-slate-400">
                {dashboard.metrics.entertainment_minutes_today}/{dashboard.rules.daily_entertainment_cap_minutes} phút ·{" "}
                Còn {dashboard.metrics.cap_left_today} phút ·{" "}
                Tạm dừng: {dashboard.rules.entertainment_paused ? "🔴 Bật" : "🟢 Tắt"}
              </p>
            </div>
          </Panel>

          {/* Hourly usage chart */}
          <Panel eyebrow="⏰ Biểu đồ sử dụng" title="Thời gian hoạt động theo giờ trong ngày">
            {hourlyData.some((hour) => hour.total_minutes > 0) ? (
              <UsageChart data={hourlyData} />
            ) : (
              <p className="py-6 text-center text-xs font-bold text-slate-400">Chưa có dữ liệu sử dụng hôm nay.</p>
            )}
            <p className="mt-3 text-[10px] font-bold text-slate-400 text-center">
              Biểu đồ hiển thị tổng số phút hoạt động mỗi giờ trong ngày hôm nay.
            </p>
          </Panel>
        </div>

        {/* RIGHT: Alerts + Mission Mix + Transactions */}
        <div className="grid gap-6 content-start">
          <Panel eyebrow="🛡️ An toàn" title="Gợi ý cho phụ huynh">
            <div className="space-y-2">
              {dashboard.alerts.length ? (
                dashboard.alerts.map((alert, i) => (
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3 text-xs font-bold leading-relaxed text-slate-700" key={i}>
                    {alert}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs font-bold leading-relaxed text-slate-700">
                  Chưa có gợi ý an toàn mới.
                </div>
              )}
            </div>
          </Panel>

          <Panel eyebrow="🎯 Nhiệm vụ" title="Phân bổ nhiệm vụ đã hoàn thành">
            <div className="mt-2">
              <MissionMixBar mix={dashboard.mission_mix} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Metric label="✅ Hoàn thành" value={`${dashboard.metrics.mission_completion_count}`} variant="green" />
              <Metric label="🚫 Bị chặn" value={`${dashboard.metrics.blocked_attempts}`} variant="rose" />
            </div>
          </Panel>

          {/* Recent transactions */}
          {dashboard.recent_transactions.length > 0 && (
            <Panel eyebrow="💎 Giao dịch gần đây" title="Lịch sử điểm thưởng">
              <div className="space-y-2 mt-2">
                {dashboard.recent_transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3">
                    <div>
                      <span className="block text-xs font-black text-slate-700">{tx.reason}</span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(tx.created_at).toLocaleString("vi-VN", {
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-black ${
                        tx.type === "earn" ? "text-emerald-600" : tx.type === "spend" ? "text-rose-500" : "text-slate-500"
                      }`}
                    >
                      {tx.type === "earn" ? "+" : tx.type === "spend" ? "-" : ""}{tx.points}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* Weekly summary */}
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5">
            <p className="text-xs font-black uppercase tracking-wider text-amber-700">📈 Tóm tắt tuần</p>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-700">{dashboard.weekly_summary}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
