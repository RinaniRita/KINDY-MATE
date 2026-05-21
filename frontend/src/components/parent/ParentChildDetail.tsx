"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Metric, Panel } from "@/components/common/Cards";
import { apiGetRequired, apiPatch } from "@/lib/api";
import { triggerChildEntry } from "@/lib/parent-actions";

type ChildDetail = {
  id: string;
  nickname: string;
  age: number;
  avatar_id: string;
  interests: string;
  favorite_subjects: string;
  default_language: string;
  wallet_balance: number;
  rules: {
    allowed_categories: string[];
    bedtime_lock_start: string | null;
    bedtime_lock_end: string | null;
    voice_enabled: boolean;
    camera_enabled: boolean;
    entertainment_paused: boolean;
    session_duration_limit_minutes: number;
    total_screen_time_limit_minutes: number;
    continuous_screen_time_limit_minutes: number;
    minimum_offscreen_break_minutes: number;
    time_profile: "low_screen" | "balanced" | "learning_focused" | "custom";
  };
};

type RuleMeta = {
  age_band: "3-5" | "6-8";
  current_profile: "low_screen" | "balanced" | "learning_focused" | "custom";
  presets: Record<
    string,
    {
      session: number;
      total_screen: number;
      continuous: number;
      break: number;
    }
  >;
  ceiling: {
    session: number;
    total_screen: number;
    continuous: number;
  };
};

type DashboardData = {
  metrics: {
    total_app_minutes: number;
    screen_time_minutes: number;
    offscreen_time_minutes: number;
    active_minutes: number;
    passive_minutes: number;
    learning_minutes: number;
    reading_minutes: number;
    movement_minutes: number;
    creative_minutes: number;
    discovery_minutes: number;
    healthy_entertainment_minutes: number;
    completed_activity_count: number;
  };
  alerts: string[];
  weekly_summary: string;
  recent_sessions: Array<{
    id: string;
    session_type: string;
    content_title?: string;
    activity_category: string;
    display_category: string;
    duration_minutes: number;
    notes: string;
    status: string;
    started_at: string;
    ended_at?: string | null;
  }>;
  current_session: {
    id: string;
    current_session_minutes: number;
    current_screen_minutes: number;
    remaining_session_minutes: number;
    remaining_screen_minutes: number;
    current_activity_title: string;
    last_heartbeat_at: string | null;
  } | null;
};

type RuleForm = {
  bedtimeStart: string;
  bedtimeEnd: string;
  voice: boolean;
  camera: boolean;
  paused: boolean;
  sessionDuration: number;
  totalScreen: number;
  continuousScreen: number;
  minimumBreak: number;
  timeProfile: "low_screen" | "balanced" | "learning_focused" | "custom";
  allowedCategories: string[];
};

const tabs = [
  { id: "tong-quan", label: "Tổng quan" },
  { id: "luat", label: "Luật sử dụng" },
  { id: "noi-dung", label: "Nội dung được phép" },
  { id: "thiet-bi", label: "Quyền AI & thiết bị" },
  { id: "lich-su", label: "Lịch sử gần đây" },
] as const;

const categoryToggles = [
  {
    id: "learning",
    label: "Học tập & game giáo dục",
    note: "Quiz, bài học ngắn và hoạt động học có mục tiêu rõ ràng.",
    values: ["learning"],
  },
  {
    id: "reading",
    label: "Đọc sách",
    note: "Truyện ngắn, đọc hiểu và nội dung luyện đọc.",
    values: ["reading"],
  },
  {
    id: "documentary",
    label: "Khám phá",
    note: "Documentary và nội dung khoa học, thiên nhiên, khám phá.",
    values: ["documentary"],
  },
  {
    id: "entertainment",
    label: "Giải trí lành mạnh",
    note: "Video và hoạt động giải trí đã được tuyển chọn trước.",
    values: ["entertainment"],
  },
  {
    id: "movement",
    label: "Vận động",
    note: "Bài tập ngắn, thảm tập và nhiệm vụ cần rời màn hình.",
    values: ["movement"],
  },
  {
    id: "creative",
    label: "Tô màu / sáng tạo",
    note: "Hoạt động vẽ, làm thủ công và sáng tạo nhẹ nhàng.",
    values: ["creative"],
  },
  {
    id: "reflection",
    label: "Kỹ năng sống",
    note: "Nhiệm vụ phản tư, thói quen nhỏ và hoạt động kỹ năng sống.",
    values: ["reflection"],
  },
  {
    id: "mascot",
    label: "Tùy chỉnh Milo",
    note: "Đồ cho Milo và các tương tác thay đổi mascot.",
    values: ["mascot_item", "customization"],
  },
] as const;

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function childEmoji(avatarId: string) {
  if (avatarId === "astronaut") return "🧑‍🚀";
  if (avatarId === "explorer") return "🧭";
  if (avatarId === "artist") return "🎨";
  return "🐹";
}

function formFromChild(child: ChildDetail): RuleForm {
  return {
    bedtimeStart: child.rules.bedtime_lock_start ?? "",
    bedtimeEnd: child.rules.bedtime_lock_end ?? "",
    voice: child.rules.voice_enabled,
    camera: child.rules.camera_enabled,
    paused: child.rules.entertainment_paused,
    sessionDuration: child.rules.session_duration_limit_minutes,
    totalScreen: child.rules.total_screen_time_limit_minutes,
    continuousScreen: child.rules.continuous_screen_time_limit_minutes,
    minimumBreak: child.rules.minimum_offscreen_break_minutes,
    timeProfile: child.rules.time_profile,
    allowedCategories: child.rules.allowed_categories,
  };
}

export function ParentChildDetail({ childId }: { childId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryTab = useMemo(() => {
    const tab = searchParams.get("tab");
    return tab && tabs.some((item) => item.id === tab) ? (tab as (typeof tabs)[number]["id"]) : "tong-quan";
  }, [searchParams]);
  const [manualTab, setManualTab] = useState<(typeof tabs)[number]["id"] | null>(null);
  const [child, setChild] = useState<ChildDetail | null>(null);
  const [meta, setMeta] = useState<RuleMeta | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [form, setForm] = useState<RuleForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [showAllSessions, setShowAllSessions] = useState(false);
  const activeTab = manualTab ?? queryTab;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setStatus("");
      try {
        const [childData, metaData, dashboardData] = await Promise.all([
          apiGetRequired<ChildDetail>(`/children/${childId}/`),
          apiGetRequired<RuleMeta>(`/children/${childId}/rules/meta/`),
          apiGetRequired<DashboardData>(`/activity/dashboard/?child_id=${childId}`),
        ]);
        setChild(childData);
        setMeta(metaData);
        setDashboard(dashboardData);
        setForm(formFromChild(childData));
        if (typeof window !== "undefined") {
          window.localStorage.setItem("active_child_id", childId);
        }
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Không thể tải hồ sơ trẻ.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [childId]);

  function updateForm<K extends keyof RuleForm>(key: K, value: RuleForm[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function toggleCategory(values: readonly string[]) {
    setForm((current) => {
      if (!current) return current;
      const enabled = values.every((value) => current.allowedCategories.includes(value));
      const next = enabled
        ? current.allowedCategories.filter((item) => !values.includes(item))
        : [...new Set([...current.allowedCategories, ...values])];
      return { ...current, allowedCategories: next };
    });
  }

  function applyPreset(profile: RuleForm["timeProfile"]) {
    if (!form || !meta) return;
    if (profile === "custom") {
      updateForm("timeProfile", "custom");
      return;
    }
    const preset = meta.presets[profile];
    if (!preset) return;
    setForm({
      ...form,
      timeProfile: profile,
      sessionDuration: preset.session,
      totalScreen: preset.total_screen,
      continuousScreen: preset.continuous,
      minimumBreak: preset.break,
    });
  }

  async function saveRules() {
    if (!form) return;
    setSaving(true);
    setStatus("");
    try {
      if (!child) return;
      const payload = {
        allowed_categories: form.allowedCategories,
        bedtime_lock_start: form.bedtimeStart || null,
        bedtime_lock_end: form.bedtimeEnd || null,
        voice_enabled: form.voice,
        camera_enabled: form.camera,
        entertainment_paused: form.paused,
        session_duration_limit_minutes: form.sessionDuration,
        total_screen_time_limit_minutes: form.totalScreen,
        continuous_screen_time_limit_minutes: form.continuousScreen,
        minimum_offscreen_break_minutes: form.minimumBreak,
        time_profile: form.timeProfile,
      };
      const updated = await apiPatch<ChildDetail["rules"]>(`/children/${childId}/rules/`, payload);
      const nextChild: ChildDetail = { ...child, rules: updated };
      setChild(nextChild);
      setForm(formFromChild(nextChild));
      const dashboardData = await apiGetRequired<DashboardData>(`/activity/dashboard/?child_id=${childId}`);
      setDashboard(dashboardData);
      setStatus("Đã cập nhật hồ sơ và luật của bé.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Không thể lưu thay đổi.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Panel eyebrow="Con của tôi" title="Đang tải hồ sơ trẻ">
        <p className="text-sm font-semibold text-slate-500">Kindy-Mate đang tải hồ sơ, luật và lịch sử gần đây của bé.</p>
      </Panel>
    );
  }

  if (!child || !form || !dashboard) {
    return (
      <Panel eyebrow="Con của tôi" title="Không thể tải hồ sơ trẻ">
        <p className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-slate-700">
          {status || "Dữ liệu hồ sơ trẻ chưa sẵn sàng."}
        </p>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-emerald-300 to-sky-300 text-3xl shadow-md">
            {childEmoji(child.avatar_id)}
          </span>
          <div>
            <Link href="/parent/children" className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              ← Quay về danh sách trẻ
            </Link>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-800">{child.nickname}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {child.age} tuổi · {child.default_language.toUpperCase()} · {child.interests || "Chưa thêm sở thích"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => triggerChildEntry(child.id)}
            className="rounded-2xl bg-slate-800 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-200"
          >
            Vào khu trẻ em
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.localStorage.setItem("active_child_id", child.id);
              }
              router.push("/parent/reports");
            }}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700"
          >
            Xem báo cáo
          </button>
        </div>
      </div>

      <div className="grid gap-2 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setManualTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-black transition ${
                activeTab === tab.id
                  ? "bg-slate-800 text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "tong-quan" ? (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Panel eyebrow="Tổng quan" title="Snapshot của hôm nay">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Tổng app hôm nay" value={`${dashboard.metrics.total_app_minutes} phút`} variant="purple" />
              <Metric label="Thời gian màn hình" value={`${dashboard.metrics.screen_time_minutes} phút`} variant="blue" />
              <Metric label="Ngoài màn hình" value={`${dashboard.metrics.offscreen_time_minutes} phút`} variant="green" />
              <Metric label="Hoạt động đã ghi nhận" value={`${dashboard.metrics.completed_activity_count}`} variant="yellow" />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Môn yêu thích</p>
                <p className="mt-2 text-sm font-bold text-slate-700">{child.favorite_subjects || "Chưa thêm môn yêu thích"}</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Preset hiện tại</p>
                <p className="mt-2 text-sm font-bold text-slate-700">{form.timeProfile}</p>
              </div>
            </div>

            {dashboard.current_session ? (
              <div className="mt-6 rounded-[1.5rem] border border-[#dff6ee] bg-[#f3fbf7] p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Phiên đang mở</p>
                <p className="mt-2 text-sm font-bold text-slate-700">
                  {dashboard.current_session.current_activity_title || "Đang dùng app"} · {dashboard.current_session.current_session_minutes} phút
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Còn {dashboard.current_session.remaining_session_minutes} phút của phiên · cập nhật {formatDateTime(dashboard.current_session.last_heartbeat_at)}
                </p>
              </div>
            ) : null}
          </Panel>

          <Panel eyebrow="An toàn" title="Gợi ý và cảnh báo">
            <div className="grid gap-3">
              {dashboard.alerts.length ? (
                dashboard.alerts.map((alert, index) => (
                  <div key={index} className="rounded-[1.5rem] border border-sky-100 bg-sky-50/80 p-4 text-sm font-bold leading-6 text-slate-700">
                    {alert}
                  </div>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/80 p-4 text-sm font-bold leading-6 text-slate-700">
                  Chưa có gợi ý an toàn mới.
                </div>
              )}
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === "luat" ? (
        <Panel eyebrow="Luật sử dụng" title="Điều chỉnh phiên dùng app theo từng trẻ">
          <div className="grid gap-5">
            <div className="flex flex-wrap gap-2">
              {(["low_screen", "balanced", "learning_focused", "custom"] as const).map((profile) => (
                <button
                  key={profile}
                  type="button"
                  onClick={() => applyPreset(profile)}
                  className={`rounded-full px-4 py-2 text-xs font-black ${
                    form.timeProfile === profile
                      ? "bg-slate-800 text-white"
                      : "border border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {profile === "low_screen"
                    ? "Ít màn hình"
                    : profile === "balanced"
                      ? "Cân bằng"
                      : profile === "learning_focused"
                        ? "Ưu tiên học tập"
                        : "Tùy chỉnh"}
                </button>
              ))}
            </div>

            <div className="rounded-[1.5rem] border border-[#dff6ee] bg-[#f3fbf7] p-4 text-sm font-bold leading-6 text-slate-700">
              Nhóm tuổi {meta?.age_band ?? "—"} · Trần an toàn: phiên {meta?.ceiling.session ?? "—"} phút · screen{" "}
              {meta?.ceiling.total_screen ?? "—"} phút · liên tục {meta?.ceiling.continuous ?? "—"} phút.
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Giới hạn thời lượng phiên
                <input
                  type="number"
                  min={15}
                  max={meta?.ceiling.session ?? 120}
                  value={form.sessionDuration}
                  onChange={(event) => updateForm("sessionDuration", Number(event.target.value))}
                  className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Giới hạn tổng thời gian màn hình
                <input
                  type="number"
                  min={10}
                  max={meta?.ceiling.total_screen ?? 90}
                  value={form.totalScreen}
                  onChange={(event) => updateForm("totalScreen", Number(event.target.value))}
                  className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Giới hạn thời gian màn hình liên tục
                <input
                  type="number"
                  min={5}
                  max={meta?.ceiling.continuous ?? 20}
                  value={form.continuousScreen}
                  onChange={(event) => updateForm("continuousScreen", Number(event.target.value))}
                  className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Thời gian nghỉ giữa các lần nhìn màn hình
                <input
                  type="number"
                  min={3}
                  max={15}
                  value={form.minimumBreak}
                  onChange={(event) => updateForm("minimumBreak", Number(event.target.value))}
                  className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Bedtime bắt đầu
                <input
                  type="time"
                  value={form.bedtimeStart}
                  onChange={(event) => updateForm("bedtimeStart", event.target.value)}
                  className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Bedtime kết thúc
                <input
                  type="time"
                  value={form.bedtimeEnd}
                  onChange={(event) => updateForm("bedtimeEnd", event.target.value)}
                  className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none"
                />
              </label>
            </div>

            <div className="flex items-center justify-between rounded-[1.5rem] border border-rose-100 bg-rose-50/70 px-5 py-4">
              <div>
                <p className="text-sm font-black text-slate-800">Tạm dừng khẩn cấp</p>
                <p className="text-xs font-semibold text-slate-500">Tạm dừng nhanh việc bắt đầu phiên mới để phụ huynh xem lại cấu hình khi cần.</p>
              </div>
              <button
                type="button"
                onClick={() => updateForm("paused", !form.paused)}
                className={`rounded-full px-4 py-2 text-xs font-black ${
                  form.paused ? "bg-rose-500 text-white" : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {form.paused ? "Đang bật" : "Đang tắt"}
              </button>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void saveRules()}
              className="rounded-2xl bg-slate-800 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu luật sử dụng"}
            </button>
          </div>
        </Panel>
      ) : null}

      {activeTab === "noi-dung" ? (
        <Panel eyebrow="Nội dung được phép" title="Bật hoặc tắt nhóm nội dung theo nhu cầu của con">
          <p className="rounded-[1.5rem] border border-[#dff6ee] bg-[#f3fbf7] p-4 text-sm font-bold leading-6 text-slate-700">
            Tất cả nội dung trong Kindy-Mate đã được tuyển chọn sẵn. Phụ huynh có thể bật/tắt nhóm nội dung phù hợp với con.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {categoryToggles.map((category) => {
              const enabled = category.values.every((value) => form.allowedCategories.includes(value));
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.values)}
                  className={`rounded-[1.5rem] border p-4 text-left transition ${
                    enabled
                      ? "border-emerald-200 bg-emerald-50/80 shadow-sm"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-800">{category.label}</p>
                      <p className="mt-1 text-xs font-semibold leading-6 text-slate-500">{category.note}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        enabled ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {enabled ? "Bật" : "Tắt"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => void saveRules()}
            className="mt-5 rounded-2xl bg-slate-800 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Lưu nội dung được phép"}
          </button>
        </Panel>
      ) : null}

      {activeTab === "thiet-bi" ? (
        <Panel eyebrow="Quyền AI & thiết bị" title="Micro, camera và quyền liên quan AI">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-800">Micro</p>
                  <p className="mt-1 text-xs font-semibold leading-6 text-slate-500">Dùng cho nhiệm vụ đọc thành tiếng và tương tác giọng nói an toàn.</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateForm("voice", !form.voice)}
                  className={`rounded-full px-4 py-2 text-xs font-black ${
                    form.voice ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {form.voice ? "Đang bật" : "Đang tắt"}
                </button>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-800">Camera</p>
                  <p className="mt-1 text-xs font-semibold leading-6 text-slate-500">Dùng cho bài vận động và các xác minh cần hình ảnh trong phạm vi an toàn.</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateForm("camera", !form.camera)}
                  className={`rounded-full px-4 py-2 text-xs font-black ${
                    form.camera ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {form.camera ? "Đang bật" : "Đang tắt"}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => void saveRules()}
            className="mt-5 rounded-2xl bg-slate-800 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Lưu quyền AI & thiết bị"}
          </button>
        </Panel>
      ) : null}

      {activeTab === "lich-su" ? (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Panel eyebrow="Lịch sử phiên" title="Session gần đây">
            <div className="grid gap-3">
              {dashboard.recent_sessions.length ? (
                <>
                  {(showAllSessions ? dashboard.recent_sessions : dashboard.recent_sessions.slice(0, 5)).map((session) => (
                    <div key={session.id} className="rounded-[1.5rem] border border-slate-100 bg-white p-4">
                      <p className="text-sm font-black text-slate-800">
                        {session.content_title || session.notes || humanActivityKey(session.activity_category)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {formatDateTime(session.started_at)}
                        {session.ended_at ? ` → ${formatDateTime(session.ended_at)}` : ""}
                      </p>
                      <p className="mt-2 text-sm font-bold text-slate-700">{session.duration_minutes} phút</p>
                    </div>
                  ))}
                  {dashboard.recent_sessions.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllSessions(!showAllSessions)}
                      className="mt-2 text-xs font-black text-slate-500 hover:text-slate-800 self-center border border-slate-200 bg-white px-4 py-2 rounded-full shadow-sm hover:shadow transition"
                    >
                      {showAllSessions ? "Thu gọn bớt" : `Xem tất cả (${dashboard.recent_sessions.length})`}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-sm font-semibold text-slate-500">Chưa có session nào gần đây.</p>
              )}
            </div>
          </Panel>

          <Panel eyebrow="Tóm tắt" title="Nhận định gần đây">
            <div className="grid gap-3">
              <div className="rounded-[1.5rem] border border-[#dff6ee] bg-[#f3fbf7] p-4 text-sm font-semibold leading-7 text-slate-700">
                {dashboard.weekly_summary}
              </div>
              {dashboard.current_session ? (
                <div className="rounded-[1.5rem] border border-sky-100 bg-sky-50/80 p-4 text-sm font-bold leading-6 text-slate-700">
                  Hiện đang có một phiên mở trong khu trẻ em. Báo cáo đầy đủ sẽ được khóa lại sau khi phiên này kết thúc.
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 text-sm font-semibold leading-7 text-slate-600">
                  Hiện không có phiên nào đang mở. Phụ huynh có thể xem lịch sử bên cạnh để đối chiếu lại hoạt động gần đây của bé.
                </div>
              )}
            </div>
          </Panel>
        </div>
      ) : null}

      {status ? (
        <div className="rounded-[1.5rem] border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold text-slate-700">
          {status}
        </div>
      ) : null}
    </div>
  );
}
