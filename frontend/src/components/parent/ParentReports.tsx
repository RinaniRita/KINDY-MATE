"use client";

import { useEffect, useMemo, useState } from "react";

import { Metric, Panel } from "@/components/common/Cards";
import { apiGetRequired } from "@/lib/api";

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

type ReportData = {
  child: ChildProfile;
  report_date: string;
  start_date?: string | null;
  end_date?: string | null;
  weekly_metrics: {
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
  weekly_breakdown: BreakdownItem[];
  radar_balance: BreakdownItem[];
  daily_series: Array<{
    date: string;
    label: string;
    weekday: string;
    total_minutes: number;
    screen_minutes: number;
    offscreen_minutes: number;
    active_minutes: number;
    passive_minutes: number;
  }>;
  weekly_summary: string;
  eda_highlights: string[];
  recent_sessions: SessionItem[];
};

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPeriodRange(period: string, customStart: string, customEnd: string) {
  const today = new Date();
  
  const format = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  if (period === "7-days") {
    const start = new Date();
    start.setDate(today.getDate() - 6);
    return { start: format(start), end: format(today) };
  }
  
  if (period === "this-week") {
    const currentDay = today.getDay();
    const distance = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + distance);
    return { start: format(monday), end: format(new Date()) };
  }
  
  if (period === "last-week") {
    const currentDay = today.getDay();
    const distance = currentDay === 0 ? -6 : 1 - currentDay;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() + distance);
    
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    
    const lastSunday = new Date(thisMonday);
    lastSunday.setDate(thisMonday.getDate() - 1);
    
    return { start: format(lastMonday), end: format(lastSunday) };
  }
  
  if (period === "30-days") {
    const start = new Date();
    start.setDate(today.getDate() - 29);
    return { start: format(start), end: format(today) };
  }
  
  if (period === "custom") {
    return { start: customStart || format(today), end: customEnd || format(today) };
  }
  
  const start = new Date();
  start.setDate(today.getDate() - 6);
  return { start: format(start), end: format(today) };
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

function formatDateOnly(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function humanActivityKey(value: string) {
  const mapping: Record<string, string> = {
    learning: "Học tập",
    reading: "Đọc sách",
    movement: "Vận động",
    creativity: "Sáng tạo",
    life_skill: "Kỹ năng sống",
    discovery: "Khám phá",
    healthy_entertainment: "Giải trí lành mạnh",
    mascot: "Milo & mascot",
    break: "Nghỉ màn hình",
    idle: "Mở app nhưng chưa vào hoạt động",
  };
  return mapping[value] ?? value;
}

function humanStatus(value: string) {
  const mapping: Record<string, string> = {
    active: "Đang mở",
    completed: "Đã hoàn tất",
    paused: "Tạm dừng",
    abandoned: "Bỏ dở",
    blocked: "Không ghi vào báo cáo",
  };
  return mapping[value] ?? value;
}

function StackedBarChart({
  data,
  primaryKey,
  secondaryKey,
  primaryColor,
  secondaryColor,
  legend,
}: {
  data: ReportData["daily_series"];
  primaryKey: "active_minutes" | "screen_minutes";
  secondaryKey: "passive_minutes" | "offscreen_minutes";
  primaryColor: string;
  secondaryColor: string;
  legend: [string, string];
}) {
  const max = Math.max(...data.map((item) => item.total_minutes), 1);
  const hasData = data.some((item) => item.total_minutes > 0);

  if (!hasData) {
    return (
      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-6 text-sm font-semibold text-slate-500">
        Chưa có dữ liệu để dựng biểu đồ trong chu kỳ hiện tại.
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex h-52 items-stretch gap-3">
        {data.map((item) => {
          const totalHeight = Math.max((item.total_minutes / max) * 100, 8);
          const primary = item[primaryKey];
          const secondary = item[secondaryKey];
          const total = Math.max(primary + secondary, 1);
          const primaryHeight = `${(primary / total) * 100}%`;
          const secondaryHeight = `${(secondary / total) * 100}%`;

          return (
            <div key={item.date} className="flex h-full flex-1 flex-col items-center gap-2">
              <div className="relative flex h-full w-full items-end">
                <div
                  className="mx-auto flex w-full max-w-[54px] flex-col overflow-hidden rounded-t-[1.35rem] rounded-b-md bg-slate-100 shadow-inner"
                  style={{ height: `${totalHeight}%` }}
                  title={`${item.label}: ${item.total_minutes} phút`}
                >
                  <div style={{ height: secondaryHeight }} className={`w-full ${secondaryColor}`} />
                  <div style={{ height: primaryHeight }} className={`w-full ${primaryColor}`} />
                </div>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-500">{item.label}</p>
                <p className="text-[9px] font-semibold text-slate-400">{item.weekday}</p>
                <p className="mt-1 text-[10px] font-black text-slate-700">{item.total_minutes} phút</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-[11px] font-black text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className={`inline-block h-3 w-3 rounded-full ${primaryColor}`} />
          {legend[0]}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className={`inline-block h-3 w-3 rounded-full ${secondaryColor}`} />
          {legend[1]}
        </span>
      </div>
    </div>
  );
}

function RadarChart({ items }: { items: BreakdownItem[] }) {
  const size = 300;
  const center = size / 2;
  const radius = 96;
  const max = Math.max(...items.map((item) => item.minutes), 1);

  const points = items.map((item, index) => {
    const angle = (Math.PI * 2 * index) / items.length - Math.PI / 2;
    const ratio = item.minutes / max;
    return {
      x: center + Math.cos(angle) * radius * ratio,
      y: center + Math.sin(angle) * radius * ratio,
      labelX: center + Math.cos(angle) * (radius + 36),
      labelY: center + Math.sin(angle) * (radius + 36),
      label: item.label,
    };
  });

  const polygon = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`-12 -12 ${size + 24} ${size + 24}`} className="h-[20rem] w-full max-w-[20rem] overflow-visible">
        {[0.25, 0.5, 0.75, 1].map((level) => (
          <polygon
            key={level}
            points={items
              .map((_, index) => {
                const angle = (Math.PI * 2 * index) / items.length - Math.PI / 2;
                return `${center + Math.cos(angle) * radius * level},${center + Math.sin(angle) * radius * level}`;
              })
              .join(" ")}
            fill="none"
            stroke="#dbeafe"
            strokeWidth="1"
          />
        ))}
        {items.map((_, index) => {
          const angle = (Math.PI * 2 * index) / items.length - Math.PI / 2;
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;
          return <line key={index} x1={center} y1={center} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
        })}
        <polygon points={polygon} fill="rgba(16, 185, 129, 0.18)" stroke="#10b981" strokeWidth="3" />
        {points.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="4.5" fill="#0f172a" />
        ))}
        {points.map((point, index) => (
          <text
            key={`label-${index}`}
            x={point.labelX}
            y={point.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-500 text-[10px] font-black"
          >
            {point.label}
          </text>
        ))}
      </svg>
      <div className="mt-2 grid w-full gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
            <span>{item.label}</span>
            <span>{item.minutes} phút</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryBars({ items }: { items: BreakdownItem[] }) {
  const filtered = items.filter((item) => item.minutes > 0);
  const max = Math.max(...filtered.map((item) => item.minutes), 1);

  return (
    <div className="grid gap-3">
      {filtered.map((item) => (
        <div key={item.key} className="grid gap-2">
          <div className="flex items-center justify-between text-sm font-bold text-slate-700">
            <span>{item.label}</span>
            <span>
              {item.minutes} phút · {item.share}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${
                item.screen_based
                  ? "bg-gradient-to-r from-sky-500 to-emerald-400"
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

export function ParentReports() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    async function loadChildren() {
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
    async function loadReport() {
      setLoading(true);
      try {
        const query = new URLSearchParams({ child_id: selectedChildId });
        if (dateFrom && dateTo) {
          query.set("start_date", dateFrom);
          query.set("end_date", dateTo);
        }
        const data = await apiGetRequired<ReportData>(`/activity/dashboard/?${query.toString()}`);
        setReport(data);
        setShowAllTimeline(false);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("active_child_id", selectedChildId);
        }
      } catch (err) {
        setReport(null);
        setError(err instanceof Error ? err.message : "Không thể tải báo cáo.");
      } finally {
        setLoading(false);
      }
    }
    void loadReport();
  }, [selectedChildId, dateFrom, dateTo]);

  const derived = useMemo(() => {
    if (!report) {
      return {
        activeRatio: 0,
        passiveRatio: 0,
        screenRatio: 0,
        offscreenRatio: 0,
        averageDailyMinutes: 0,
        averageActivityMinutes: 0,
        timeline: [] as SessionItem[],
      };
    }
    const totalWeekly = Math.max(report.weekly_metrics.total_app_minutes, 1);
    const activeDays = report.daily_series.filter((item) => item.total_minutes > 0);
    return {
      activeRatio: Math.round((report.weekly_metrics.active_minutes / totalWeekly) * 100),
      passiveRatio: Math.round((report.weekly_metrics.passive_minutes / totalWeekly) * 100),
      screenRatio: Math.round((report.weekly_metrics.screen_time_minutes / totalWeekly) * 100),
      offscreenRatio: Math.round((report.weekly_metrics.offscreen_time_minutes / totalWeekly) * 100),
      averageDailyMinutes: activeDays.length
        ? Math.round(activeDays.reduce((sum, item) => sum + item.total_minutes, 0) / activeDays.length)
        : 0,
      averageActivityMinutes: report.weekly_metrics.completed_activity_count
        ? Math.round(report.weekly_metrics.total_app_minutes / report.weekly_metrics.completed_activity_count)
        : 0,
      timeline: showAllTimeline ? report.recent_sessions : report.recent_sessions.slice(0, 4),
    };
  }, [report, showAllTimeline]);

  const isCustomRange = Boolean(dateFrom && dateTo);

  if (loading) {
    return (
      <Panel eyebrow="Báo cáo" title="Đang tổng hợp dữ liệu">
        <p className="text-sm font-semibold text-slate-500">Báo cáo đang được tạo từ các phiên hoạt động đã hoàn tất của trẻ.</p>
      </Panel>
    );
  }

  if (!children.length) {
    return (
      <Panel eyebrow="Báo cáo" title="Chưa có dữ liệu báo cáo">
        <p className="text-sm font-semibold text-slate-600">Hãy tạo hồ sơ trẻ và ghi nhận vài phiên đầu tiên để hệ thống có dữ liệu phân tích.</p>
      </Panel>
    );
  }

  if (error || !report) {
    return (
      <Panel eyebrow="Báo cáo" title="Không thể tải báo cáo">
        <p className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-slate-700">
          {error || "Báo cáo chưa sẵn sàng."}
        </p>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6">
      <Panel eyebrow="Phân tích dữ liệu" title={`Báo cáo hành vi dùng app của ${report.child.nickname}`}>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="min-h-11 rounded-[1.25rem] border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 outline-none focus:border-emerald-400"
            value={selectedChildId}
            onChange={(event) => setSelectedChildId(event.target.value)}
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.nickname}, {child.age} tuổi
              </option>
            ))}
          </select>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600">
            {isCustomRange
              ? `Khoảng ngày ${formatDateOnly(dateFrom)} - ${formatDateOnly(dateTo)}`
              : `Chu kỳ 7 ngày kết thúc ngày ${formatDateOnly(report.report_date)}`}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
          <label className="grid gap-2 text-sm font-black text-slate-700">
            Từ ngày
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => {
                const next = event.target.value;
                setDateFrom(next);
                if (dateTo && next && dateTo < next) {
                  setDateTo(next);
                }
              }}
              className="min-h-11 rounded-[1rem] border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-emerald-400"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            Đến ngày
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => {
                const next = event.target.value;
                if (dateFrom && next && next < dateFrom) {
                  setDateTo(dateFrom);
                  return;
                }
                setDateTo(next);
              }}
              className="min-h-11 rounded-[1rem] border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-emerald-400"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="min-h-11 rounded-[1rem] border border-slate-200 bg-white px-4 text-sm font-black text-slate-600"
          >
            Xóa khoảng ngày
          </button>
          <p className="text-xs font-semibold leading-6 text-slate-500">
            Chọn cả ngày bắt đầu và ngày kết thúc để xem báo cáo chuyên sâu theo khoảng thời gian.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric
            label={isCustomRange ? "Tổng thời gian trong khoảng" : "Tổng thời gian 7 ngày"}
            value={`${report.weekly_metrics.total_app_minutes} phút`}
            variant="purple"
          />
          <Metric label="Trung bình mỗi ngày" value={`${derived.averageDailyMinutes} phút`} variant="blue" />
          <Metric label="Hoạt động đã ghi nhận" value={`${report.weekly_metrics.completed_activity_count}`} variant="green" />
          <Metric label="Trung bình mỗi hoạt động" value={`${derived.averageActivityMinutes} phút`} variant="yellow" />
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel eyebrow="Xu hướng 7 ngày" title="Bar chart: nhịp hoạt động chủ động và thụ động">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Chủ động / thụ động</p>
              <p className="mt-2 text-2xl font-black text-slate-800">
                {derived.activeRatio}% / {derived.passiveRatio}%
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {report.weekly_metrics.active_minutes} phút chủ động · {report.weekly_metrics.passive_minutes} phút thụ động
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Màn hình / ngoài màn hình</p>
              <p className="mt-2 text-2xl font-black text-slate-800">
                {derived.screenRatio}% / {derived.offscreenRatio}%
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {report.weekly_metrics.screen_time_minutes} phút màn hình · {report.weekly_metrics.offscreen_time_minutes} phút ngoài màn hình
              </p>
            </div>
          </div>
          <StackedBarChart
            data={report.daily_series}
            primaryKey="active_minutes"
            secondaryKey="passive_minutes"
            primaryColor="bg-emerald-400"
            secondaryColor="bg-amber-300"
            legend={["Hoạt động chủ động", "Nội dung thụ động"]}
          />
        </Panel>

        <Panel eyebrow="Cân bằng phát triển" title="Radar chart: nhóm hoạt động nổi bật">
          <RadarChart items={report.radar_balance} />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Panel eyebrow="Phân bổ hoạt động" title="Nhóm hoạt động chiếm nhiều thời gian nhất">
          <CategoryBars items={report.weekly_breakdown} />
        </Panel>

        <Panel eyebrow="Diễn giải dữ liệu" title="Insight và nhận định cho phụ huynh">
          <div className="grid gap-3">
            {report.eda_highlights.map((insight, index) => (
              <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-700">
                {insight}
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[1.75rem] border border-[#dff6ee] bg-[#f3fbf7] p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Tóm tắt hệ thống</p>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">{report.weekly_summary}</p>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Panel eyebrow="Theo dõi theo ngày" title="Bar chart: màn hình và ngoài màn hình">
          <StackedBarChart
            data={report.daily_series}
            primaryKey="screen_minutes"
            secondaryKey="offscreen_minutes"
            primaryColor="bg-sky-500"
            secondaryColor="bg-emerald-300"
            legend={["Thời gian màn hình", "Ngoài màn hình"]}
          />
        </Panel>

        <Panel eyebrow="Timeline gần đây" title="Các hoạt động mới được ghi nhận">
          <div className="space-y-3">
            {derived.timeline.length ? (
              derived.timeline.map((session) => (
                <div key={session.id} className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-800">
                        {session.content_title || session.notes || session.display_category || "Hoạt động"}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        Bắt đầu: {formatDateTime(session.started_at)}
                        {session.ended_at ? ` · Kết thúc: ${formatDateTime(session.ended_at)}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">
                      {session.duration_minutes} phút
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black text-slate-500">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                      {humanActivityKey(session.activity_category)}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">{humanStatus(session.status)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-slate-500">Chưa có hoạt động nào gần đây.</p>
            )}
          </div>
          {report.recent_sessions.length > 4 ? (
            <button
              type="button"
              onClick={() => setShowAllTimeline((current) => !current)}
              className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
            >
              {showAllTimeline ? "Thu gọn" : "Xem thêm"}
            </button>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
