"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Metric, Panel } from "@/components/common/Cards";
import { apiGet, apiGetRequired } from "@/lib/api";

type ChildProfile = {
  id: string;
  nickname: string;
  age: number;
};

type BreakdownItem = {
  key: string;
  label: string;
  minutes: number;
  count: number;
  share: number;
  screen_based: boolean;
};

type SessionItem = {
  id: string;
  session_type: string;
  content_title?: string;
  status: string;
  activity_category: string;
  display_category: string;
  duration_minutes: number;
  notes: string;
  started_at: string;
  ended_at?: string | null;
};

type DashboardData = {
  child: ChildProfile;
  report_date: string;
  rules: {
    voice_enabled: boolean;
    camera_enabled: boolean;
    entertainment_paused: boolean;
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
    life_skill_minutes: number;
    discovery_minutes: number;
    healthy_entertainment_minutes: number;
    mascot_minutes: number;
    break_minutes: number;
    idle_minutes: number;
    screen_time_minutes: number;
    offscreen_time_minutes: number;
    total_app_minutes: number;
    completed_activity_count: number;
    active_minutes: number;
    passive_minutes: number;
  };
  comparisons: {
    active_vs_passive: {
      active_minutes: number;
      passive_minutes: number;
      active_ratio: number;
      passive_ratio: number;
    };
    screen_vs_offscreen: {
      screen_minutes: number;
      offscreen_minutes: number;
      screen_ratio: number;
      offscreen_ratio: number;
    };
  };
  today_breakdown: BreakdownItem[];
  alerts: string[];
  weekly_summary: string;
  recent_sessions: SessionItem[];
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
    current_segment_started_at: string | null;
    last_heartbeat_at: string | null;
  } | null;
};

type HourlyData = {
  hour: number;
  label: string;
  total_minutes: number;
  breakdown: Record<string, number>;
};

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

function formatDateOnly(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function humanProfile(profile: string) {
  if (profile === "low_screen") return "Ít màn hình";
  if (profile === "learning_focused") return "Ưu tiên học tập";
  if (profile === "balanced") return "Cân bằng";
  return "Tùy chỉnh";
}

function UsageChart({ data }: { data: HourlyData[] }) {
  const maxVal = Math.max(...data.map((item) => item.total_minutes), 1);

  return (
    <div className="mt-4">
      <div className="flex h-44 items-end gap-1.5">
        {data.map((hour) => {
          const hasData = hour.total_minutes > 0;
          const height = hasData ? Math.max((hour.total_minutes / maxVal) * 100, 8) : 4;
          return (
            <div key={hour.hour} className="group flex h-full flex-1 flex-col justify-end">
              <div className="relative h-full">
                <div
                  className={`absolute inset-x-0 bottom-0 rounded-t-2xl transition-all duration-500 ${
                    hasData
                      ? "bg-gradient-to-t from-sky-500 via-emerald-400 to-yellow-300"
                      : "bg-slate-100"
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${hour.label}: ${hour.total_minutes} phút`}
                />
                {hasData ? (
                  <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-xl bg-slate-800 px-2.5 py-1 text-[10px] font-black whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {hour.total_minutes} phút
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5">
        {data.map((hour) => (
          <div key={hour.hour} className="flex-1 text-center text-[9px] font-black text-slate-400">
            {hour.hour % 3 === 0 ? hour.label.slice(0, 2) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function BreakdownBars({ items }: { items: BreakdownItem[] }) {
  const filtered = items.filter((item) => item.minutes > 0);
  const max = Math.max(...filtered.map((item) => item.minutes), 1);

  return (
    <div className="grid gap-3">
      {filtered.map((item) => (
        <div key={item.key} className="grid gap-2">
          <div className="flex items-center justify-between text-sm font-bold text-slate-700">
            <span>{item.label}</span>
            <span>{item.minutes} phút</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${
                item.screen_based
                  ? "bg-gradient-to-r from-sky-400 to-emerald-400"
                  : "bg-gradient-to-r from-amber-300 to-orange-300"
              }`}
              style={{ width: `${Math.max((item.minutes / max) * 100, 6)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ParentDashboard() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => getTodayString());
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
          apiGetRequired<DashboardData>(`/activity/dashboard/?child_id=${selectedChildId}&date=${selectedDate}`),
          apiGet<{ hours: HourlyData[] }>(`/activity/hourly-usage/?child_id=${selectedChildId}&date=${selectedDate}`, { hours: [] }),
        ]);
        setDashboard(data);
        setHourlyData(hourly.hours || []);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("active_child_id", selectedChildId);
        }
      } catch (err) {
        setDashboard(null);
        setHourlyData([]);
        setError(err instanceof Error ? err.message : "Không thể tải tổng quan.");
      } finally {
        setLoading(false);
      }
    }
    void loadDashboard();
  }, [selectedChildId, selectedDate]);

  const latestFinishedSession = useMemo(
    () => dashboard?.recent_sessions.find((session) => session.status !== "active") ?? null,
    [dashboard],
  );

  if (loading) {
    return (
      <Panel eyebrow="Tổng quan" title="Đang tải dữ liệu hoạt động">
        <div className="flex items-center gap-3 py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-500" />
          <p className="text-sm font-semibold text-slate-500">
            Kindy-Mate đang tổng hợp dữ liệu sau các phiên dùng app gần đây.
          </p>
        </div>
      </Panel>
    );
  }

  if (!children.length) {
    return (
      <Panel eyebrow="Tổng quan" title="Chưa có hồ sơ trẻ">
        <div className="rounded-3xl border border-dashed border-sky-200 bg-sky-50/70 p-6">
          <p className="text-sm font-semibold leading-6 text-slate-600">
            Tài khoản phụ huynh đã sẵn sàng. Hãy tạo hồ sơ trẻ đầu tiên để hệ thống bắt đầu ghi nhận các phiên hoạt động.
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
      <Panel eyebrow="Tổng quan" title="Chưa thể tải tổng quan">
        <p className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-slate-700">
          {error || "Dữ liệu tổng quan chưa sẵn sàng."}
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
        <span className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-black text-sky-700">
          Cấu hình: {humanProfile(dashboard.rules.time_profile)}
        </span>
        <span className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
          Phiên tối đa {dashboard.rules.session_duration_limit_minutes} phút
        </span>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600">
          <span>Dữ liệu ngày:</span>
          <input
            type="date"
            max={getTodayString()}
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="border-none bg-transparent font-black text-slate-700 outline-none"
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="grid gap-6">
          <Panel eyebrow="Tóm tắt ngày gần nhất" title="Các chỉ số chính của phiên hoặc ngày gần nhất">
            <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Metric label="Tổng thời gian app" value={`${dashboard.metrics.total_app_minutes} phút`} variant="purple" />
              <Metric label="Thời gian màn hình" value={`${dashboard.metrics.screen_time_minutes} phút`} variant="blue" />
              <Metric label="Ngoài màn hình" value={`${dashboard.metrics.offscreen_time_minutes} phút`} variant="green" />
              <Metric label="Hoạt động chủ động" value={`${dashboard.metrics.active_minutes} phút`} variant="green" />
              <Metric label="Nội dung thụ động" value={`${dashboard.metrics.passive_minutes} phút`} variant="yellow" />
              <Metric label="Hoạt động đã ghi nhận" value={`${dashboard.metrics.completed_activity_count}`} variant="purple" />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Tỷ lệ chủ động / thụ động</p>
                <p className="mt-2 text-2xl font-black text-slate-800">
                  {dashboard.comparisons.active_vs_passive.active_ratio}% / {dashboard.comparisons.active_vs_passive.passive_ratio}%
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {dashboard.comparisons.active_vs_passive.active_minutes} phút chủ động ·{" "}
                  {dashboard.comparisons.active_vs_passive.passive_minutes} phút thụ động
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Tỷ lệ màn hình / ngoài màn hình</p>
                <p className="mt-2 text-2xl font-black text-slate-800">
                  {dashboard.comparisons.screen_vs_offscreen.screen_ratio}% / {dashboard.comparisons.screen_vs_offscreen.offscreen_ratio}%
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {dashboard.comparisons.screen_vs_offscreen.screen_minutes} phút màn hình ·{" "}
                  {dashboard.comparisons.screen_vs_offscreen.offscreen_minutes} phút ngoài màn hình
                </p>
              </div>
            </div>
          </Panel>

          <Panel eyebrow="Theo giờ" title="Thời gian hoạt động theo giờ trong ngày">
            {hourlyData.some((hour) => hour.total_minutes > 0) ? (
              <UsageChart data={hourlyData} />
            ) : (
              <p className="py-6 text-center text-xs font-bold text-slate-400">
                Chưa có dữ liệu hoạt động theo giờ cho ngày gần nhất được chọn.
              </p>
            )}
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <Panel eyebrow="Phiên gần nhất" title="Tóm tắt sau phiên vừa ghi nhận">
            {latestFinishedSession ? (
              <div className="grid gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Hoạt động gần nhất</p>
                  <p className="mt-2 text-lg font-black text-slate-800">
                    {latestFinishedSession.content_title ||
                      latestFinishedSession.notes ||
                      latestFinishedSession.display_category ||
                      "Hoạt động gần nhất"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {latestFinishedSession.duration_minutes} phút · {formatDateTime(latestFinishedSession.started_at)}
                  </p>
                </div>

              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-500">
                Chưa có phiên hoàn chỉnh nào để tổng hợp. Sau khi bé kết thúc một phiên, phần này sẽ hiển thị ngay.
              </p>
            )}
          </Panel>

          <Panel eyebrow="Phân bổ hoạt động" title="Nhóm hoạt động trong ngày gần nhất">
            {dashboard.today_breakdown.some((item) => item.minutes > 0) ? (
              <BreakdownBars items={dashboard.today_breakdown} />
            ) : (
              <p className="text-sm font-semibold text-slate-500">Chưa có hoạt động nào được ghi nhận cho ngày gần nhất.</p>
            )}
          </Panel>

          <Panel eyebrow="Gợi ý cho phụ huynh" title="Điểm cần chú ý">
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
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Tóm tắt gần đây</p>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-700">{dashboard.weekly_summary}</p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
