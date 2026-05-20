"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Metric, Panel } from "@/components/common/Cards";
import { apiGet, apiGetRequired } from "@/lib/api";
import { prepareChildEntry } from "@/lib/child-entry";

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
    session_duration_limit_minutes: number;
    total_screen_time_limit_minutes: number;
    continuous_screen_time_limit_minutes: number;
    minimum_offscreen_break_minutes: number;
    time_profile: string;
  };
  metrics: {
    learning_minutes: number;
    reading_minutes: number;
    movement_minutes: number;
    creative_minutes: number;
    discovery_minutes: number;
    healthy_entertainment_minutes: number;
    mascot_minutes: number;
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
  current_session: {
    id: string;
    status: string;
    current_session_minutes: number;
    current_screen_minutes: number;
    current_continuous_screen_minutes: number;
    current_offscreen_minutes: number;
    remaining_session_minutes: number;
    remaining_screen_minutes: number;
    remaining_continuous_screen_minutes: number;
    current_activity_type: string;
    current_activity_title: string;
    last_heartbeat_at: string | null;
  } | null;
  limit_state: {
    state: string;
    break_required: boolean;
    remaining_session_minutes: number;
    remaining_screen_minutes: number;
    remaining_continuous_screen_minutes: number;
    active_break_requirement: {
      status: string;
      required_minutes: number;
      started_at: string;
      timer_completed_at: string | null;
      task_completed_at: string | null;
    } | null;
    current_activity_type: string;
    current_activity_title: string;
    session_status: string;
    last_heartbeat_at: string | null;
  };
};

type HourlyData = {
  hour: number;
  label: string;
  total_minutes: number;
  breakdown: Record<string, number>;
};

function UsageChart({ data }: { data: HourlyData[] }) {
  const maxVal = Math.max(...data.map((d) => d.total_minutes), 1);

  return (
    <div className="mt-4">
      <div className="flex h-32 items-end gap-[2px]">
        {data.map((hour) => {
          const height = (hour.total_minutes / maxVal) * 100;
          const hasData = hour.total_minutes > 0;
          return (
            <div key={hour.hour} className="group relative flex-1" title={`${hour.label}: ${hour.total_minutes} phút`}>
              <div
                className={`w-full rounded-t transition-all duration-500 ${
                  hasData
                    ? "bg-gradient-to-t from-emerald-400 to-teal-300 group-hover:from-emerald-500 group-hover:to-teal-400"
                    : "bg-slate-100"
                }`}
                style={{ height: `${Math.max(height, 3)}%` }}
              />
              {hasData ? (
                <div className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-slate-800 px-2 py-1 text-[9px] font-bold whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {hour.total_minutes}p
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-[2px]">
        {data.map((hour) => (
          <div key={hour.hour} className="flex-1 text-center text-[8px] font-bold text-slate-400">
            {hour.hour % 3 === 0 ? hour.label.slice(0, 2) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function MissionMixBar({ mix }: { mix: Record<string, number> }) {
  const labels: Record<string, { label: string; color: string }> = {
    learning: { label: "Học", color: "bg-emerald-400" },
    reading: { label: "Đọc", color: "bg-blue-400" },
    movement: { label: "Vận động", color: "bg-amber-400" },
    creative: { label: "Sáng tạo", color: "bg-violet-400" },
    reflection: { label: "Kỹ năng sống", color: "bg-pink-400" },
  };
  const total = Object.values(mix).reduce((sum, value) => sum + value, 0) || 1;

  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
        {Object.entries(mix).map(([key, value]) => (
          <div
            key={key}
            className={`${labels[key]?.color || "bg-slate-300"} transition-all duration-500`}
            style={{ width: `${(value / total) * 100}%` }}
            title={`${labels[key]?.label || key}: ${value}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        {Object.entries(mix).map(([key, value]) => (
          <span key={key} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
            <span className={`inline-block h-2 w-2 rounded-full ${labels[key]?.color || "bg-slate-300"}`} />
            {labels[key]?.label || key}: {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
        const activeChildId = typeof window !== "undefined" ? window.localStorage.getItem("active_child_id") : "";
        const nextChildId = data.find((child) => child.id === activeChildId)?.id ?? data[0]?.id ?? "";
        setSelectedChildId(nextChildId);
        if (!nextChildId) setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải danh sách trẻ.");
        setLoading(false);
      }
    }
    void loadChildren();
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
    void loadDashboard();
  }, [selectedChildId]);

  const capPercent = useMemo(() => {
    if (!dashboard) return 0;
    const cap = dashboard.rules.daily_entertainment_cap_minutes || 1;
    const used = dashboard.metrics.discovery_minutes + dashboard.metrics.healthy_entertainment_minutes;
    return Math.min((used / cap) * 100, 100);
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
          onClick={() => prepareChildEntry(selectedChildId)}
          className="bubbly-btn ml-auto rounded-2xl bg-gradient-to-r from-blue-400 to-indigo-400 px-5 py-2.5 text-xs font-black text-white shadow-md"
        >
          ▶ Vào khu trẻ em
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-6">
          <Panel eyebrow="📊 Cân bằng phát triển" title="Hoạt động trong ngày">
            <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Tổng thời gian app" value={`${dashboard.metrics.total_app_minutes} phút`} variant="purple" />
              <Metric label="📚 Học tập" value={`${dashboard.metrics.learning_minutes} phút`} variant="green" />
              <Metric label="📖 Đọc sách" value={`${dashboard.metrics.reading_minutes} phút`} variant="blue" />
              <Metric label="🏃 Vận động" value={`${dashboard.metrics.movement_minutes} phút`} variant="yellow" />
              <Metric label="🎨 Sáng tạo" value={`${dashboard.metrics.creative_minutes} phút`} variant="purple" />
              <Metric label="🔬 Khám phá" value={`${dashboard.metrics.discovery_minutes} phút`} variant="blue" />
              <Metric label="🎮 Giải trí lành mạnh" value={`${dashboard.metrics.healthy_entertainment_minutes} phút`} variant="yellow" />
              <Metric label="🧸 Mascot" value={`${dashboard.metrics.mascot_minutes} phút`} variant="green" />
            </div>

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
                Còn {dashboard.metrics.cap_left_today} phút trong hạn mức ngày · Tạm dừng:{" "}
                {dashboard.rules.entertainment_paused ? "🔴 Bật" : "🟢 Tắt"}
              </p>
            </div>
          </Panel>

          <Panel eyebrow="⏰ Biểu đồ sử dụng" title="Thời gian hoạt động theo giờ trong ngày">
            {hourlyData.some((hour) => hour.total_minutes > 0) ? (
              <UsageChart data={hourlyData} />
            ) : (
              <p className="py-6 text-center text-xs font-bold text-slate-400">Chưa có dữ liệu sử dụng hôm nay.</p>
            )}
          </Panel>

          <Panel eyebrow="🧭 Phiên hiện tại" title="Theo dõi realtime child mode">
            {dashboard.current_session ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Tổng phiên hiện tại" value={`${dashboard.current_session.current_session_minutes} phút`} variant="purple" />
                <Metric label="Screen time hiện tại" value={`${dashboard.current_session.current_screen_minutes} phút`} variant="blue" />
                <Metric label="Liên tục hiện tại" value={`${dashboard.current_session.current_continuous_screen_minutes} phút`} variant="yellow" />
                <Metric label="Ngoài màn hình" value={`${dashboard.current_session.current_offscreen_minutes} phút`} variant="green" />
                <Metric label="Còn lại của phiên" value={`${dashboard.current_session.remaining_session_minutes} phút`} variant="green" />
                <Metric label="Còn lại screen time" value={`${dashboard.current_session.remaining_screen_minutes} phút`} variant="blue" />
                <Metric label="Còn trước khi phải nghỉ" value={`${dashboard.current_session.remaining_continuous_screen_minutes} phút`} variant="yellow" />
                <Metric label="Trạng thái" value={dashboard.limit_state.state} variant="purple" />
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-500">Hiện chưa có phiên child mode nào đang mở.</p>
            )}

            {dashboard.current_session ? (
              <div className="mt-4 rounded-2xl border border-[#dff6ee] bg-[#f3fbf7] p-4 text-sm font-bold leading-7 text-slate-700">
                Đang ở: <strong>{dashboard.limit_state.current_activity_title || "—"}</strong> · Loại hoạt động:{" "}
                <strong>{dashboard.limit_state.current_activity_type || "—"}</strong> · Heartbeat gần nhất:{" "}
                <strong>{formatDateTime(dashboard.limit_state.last_heartbeat_at)}</strong>
              </div>
            ) : null}

            {dashboard.limit_state.active_break_requirement ? (
              <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-7 text-slate-700">
                Break đang mở · Yêu cầu nghỉ {dashboard.limit_state.active_break_requirement.required_minutes} phút · Timer xong:{" "}
                {dashboard.limit_state.active_break_requirement.timer_completed_at ? "Đã đủ" : "Chưa"} · Task xong:{" "}
                {dashboard.limit_state.active_break_requirement.task_completed_at ? "Đã xong" : "Chưa"}
              </div>
            ) : null}
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <Panel eyebrow="🛡️ An toàn" title="Gợi ý cho phụ huynh">
            <div className="space-y-2">
              {dashboard.alerts.length ? (
                dashboard.alerts.map((alert, index) => (
                  <div key={index} className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3 text-xs font-bold leading-relaxed text-slate-700">
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

          {dashboard.recent_transactions.length > 0 ? (
            <Panel eyebrow="💎 Giao dịch gần đây" title="Lịch sử điểm thưởng">
              <div className="mt-2 space-y-2">
                {dashboard.recent_transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3">
                    <div>
                      <span className="block text-xs font-black text-slate-700">{transaction.reason}</span>
                      <span className="text-[10px] font-bold text-slate-400">{formatDateTime(transaction.created_at)}</span>
                    </div>
                    <span
                      className={`text-xs font-black ${
                        transaction.type === "earn" ? "text-emerald-600" : transaction.type === "spend" ? "text-rose-500" : "text-slate-500"
                      }`}
                    >
                      {transaction.type === "earn" ? "+" : transaction.type === "spend" ? "-" : ""}
                      {transaction.points}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}

          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5">
            <p className="text-xs font-black uppercase tracking-wider text-amber-700">📈 Tóm tắt tuần</p>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-700">{dashboard.weekly_summary}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
