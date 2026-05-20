"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Metric, Panel, StatusBadge } from "@/components/common/Cards";
import { apiGet, apiGetRequired, apiPatch } from "@/lib/api";
import { prepareChildEntry } from "@/lib/child-entry";
import { categories } from "@/lib/mock-data";

type ChildProfileData = {
  id: string;
  nickname: string;
  age: number;
  avatar_id: string;
  interests: string;
  favorite_subjects: string;
  default_language: string;
  wallet_balance: number;
  rules: {
    daily_entertainment_cap_minutes: number;
    cooldown_minutes: number;
    session_duration_limit_minutes: number;
    total_screen_time_limit_minutes: number;
    continuous_screen_time_limit_minutes: number;
    minimum_offscreen_break_minutes: number;
    time_profile: "low_screen" | "balanced" | "learning_focused" | "custom";
    voice_enabled: boolean;
    camera_enabled: boolean;
    entertainment_paused: boolean;
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

type RuleFormState = {
  paused: boolean;
  dailyCap: number;
  cooldown: number;
  sessionDuration: number;
  totalScreen: number;
  continuousScreen: number;
  minimumBreak: number;
  timeProfile: "low_screen" | "balanced" | "learning_focused" | "custom";
  voice: boolean;
  camera: boolean;
};

const defaultRuleState: RuleFormState = {
  paused: false,
  dailyCap: 20,
  cooldown: 15,
  sessionDuration: 60,
  totalScreen: 35,
  continuousScreen: 15,
  minimumBreak: 5,
  timeProfile: "balanced",
  voice: false,
  camera: false,
};

function childEmoji(avatarId: string) {
  if (avatarId === "astronaut") return "🧑‍🚀";
  if (avatarId === "explorer") return "🧭";
  if (avatarId === "artist") return "🎨";
  return "🐹";
}

function stateFromRules(child?: ChildProfileData | null): RuleFormState {
  if (!child?.rules) return defaultRuleState;
  return {
    paused: child.rules.entertainment_paused,
    dailyCap: child.rules.daily_entertainment_cap_minutes,
    cooldown: child.rules.cooldown_minutes,
    sessionDuration: child.rules.session_duration_limit_minutes,
    totalScreen: child.rules.total_screen_time_limit_minutes,
    continuousScreen: child.rules.continuous_screen_time_limit_minutes,
    minimumBreak: child.rules.minimum_offscreen_break_minutes,
    timeProfile: child.rules.time_profile,
    voice: child.rules.voice_enabled,
    camera: child.rules.camera_enabled,
  };
}

export function ChildrenManager() {
  const [children, setChildren] = useState<ChildProfileData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetRequired<ChildProfileData[]>("/children/")
      .then((data) => {
        setChildren(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  function handleSelectChild(childId: string) {
    prepareChildEntry(childId);
  }

  if (loading) {
    return (
      <Panel eyebrow="Quản lý hồ sơ" title="Hồ sơ trẻ nhỏ trong gia đình">
        <div className="py-10 text-center font-bold text-slate-500">Đang tải hồ sơ của bé...</div>
      </Panel>
    );
  }

  if (children.length === 0) {
    return (
      <Panel eyebrow="Quản lý hồ sơ" title="Hồ sơ trẻ nhỏ trong gia đình">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
          <span className="text-4xl">👧👦</span>
          <h4 className="mt-4 text-lg font-black text-slate-800">Chưa có hồ sơ trẻ nhỏ nào</h4>
          <p className="mx-auto mt-2 max-w-sm text-xs font-semibold leading-relaxed text-slate-500">
            Để bắt đầu cho bé học tập, vận động và nhận quà, phụ huynh vui lòng thiết lập hồ sơ ban đầu cho bé trước.
          </p>
          <Link
            href="/onboarding/child-profile"
            className="bubbly-btn mt-6 inline-flex rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 px-6 py-3 text-xs font-black text-white shadow-md shadow-emerald-100 hover:shadow-emerald-200"
          >
            ➕ Tạo hồ sơ cho bé ngay
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <Panel eyebrow="Quản lý hồ sơ" title="Hồ sơ trẻ nhỏ trong gia đình">
      <div className="grid gap-6">
        {children.map((child) => (
          <div
            key={child.id}
            className="flex flex-col items-start justify-between gap-6 rounded-[2.5rem] border border-indigo-100/50 bg-gradient-to-br from-indigo-50/50 to-blue-50/30 p-6 shadow-sm transition duration-300 hover:shadow-md lg:flex-row lg:items-center"
          >
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-400 text-2xl font-black text-white shadow-md animate-float-slow">
                {childEmoji(child.avatar_id)}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-800">{child.nickname}</h3>
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-600">
                    {child.age} tuổi
                  </span>
                </div>
                {child.interests ? <p className="text-xs font-bold text-slate-500">🎯 Sở thích: {child.interests}</p> : null}
                {child.favorite_subjects ? (
                  <p className="text-xs font-bold text-indigo-600">📚 Môn học thích nhất: {child.favorite_subjects}</p>
                ) : null}
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">
              <div className="flex gap-2">
                <span className="rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-xs font-black text-slate-700 shadow-sm">
                  ⭐ Ví: {child.wallet_balance} điểm
                </span>
                <span className="rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-xs font-black uppercase text-slate-700 shadow-sm">
                  🌐 Ngôn ngữ: {child.default_language}
                </span>
              </div>

              <Link
                href={`/child/${child.id}/home`}
                onClick={() => handleSelectChild(child.id)}
                className="bubbly-btn block w-full rounded-xl bg-gradient-to-r from-blue-400 to-indigo-400 px-5 py-3 text-center text-xs font-black text-white shadow-md shadow-blue-100 hover:shadow-blue-200 sm:w-auto"
              >
                🎈 Vào Khu Trẻ Em →
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <Link
          href="/onboarding/child-profile"
          className="bubbly-btn inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-5 py-3 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ➕ Thêm tài khoản bé khác
        </Link>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
        <span className="text-xl">🛡️</span>
        <p className="text-xs font-bold leading-relaxed text-slate-500">
          <strong className="text-amber-800">Cam kết bảo mật dữ liệu trẻ nhỏ:</strong> Kindy-Mate tuyệt đối tuân thủ
          chính sách COPPA/GDPR-K. Chúng tôi không thu thập tên thật, hình ảnh camera thật, số điện thoại,
          trường lớp hay địa chỉ của con để bảo vệ con tối đa.
        </p>
      </div>
    </Panel>
  );
}

export function RulesManager() {
  const [children, setChildren] = useState<ChildProfileData[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [ruleMeta, setRuleMeta] = useState<RuleMeta | null>(null);
  const [configMode, setConfigMode] = useState<"simple" | "advanced">("simple");
  const [form, setForm] = useState<RuleFormState>(defaultRuleState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function loadChildren() {
      try {
        const data = await apiGetRequired<ChildProfileData[]>("/children/");
        setChildren(data);
        if (data.length > 0) {
          setSelectedChildId(data[0].id);
          setForm(stateFromRules(data[0]));
          setConfigMode(data[0].rules.time_profile === "custom" ? "advanced" : "simple");
          const meta = await apiGetRequired<RuleMeta>(`/children/${data[0].id}/rules/meta/`);
          setRuleMeta(meta);
        }
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Không thể tải cấu hình.");
      } finally {
        setLoading(false);
      }
    }
    void loadChildren();
  }, []);

  async function handleChildRuleSelection(childId: string) {
    setSelectedChildId(childId);
    const selected = children.find((child) => child.id === childId);
    setForm(stateFromRules(selected));
    setConfigMode(selected?.rules.time_profile === "custom" ? "advanced" : "simple");
    try {
      const meta = await apiGetRequired<RuleMeta>(`/children/${childId}/rules/meta/`);
      setRuleMeta(meta);
    } catch {}
  }

  function updateForm<K extends keyof RuleFormState>(key: K, value: RuleFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyPreset(profile: "low_screen" | "balanced" | "learning_focused" | "custom") {
    updateForm("timeProfile", profile);
    if (!ruleMeta || profile === "custom") {
      setConfigMode("advanced");
      return;
    }
    const preset = ruleMeta.presets[profile];
    if (!preset) return;
    setConfigMode("simple");
    setForm((current) => ({
      ...current,
      timeProfile: profile,
      sessionDuration: preset.session,
      totalScreen: preset.total_screen,
      continuousScreen: preset.continuous,
      minimumBreak: preset.break,
    }));
  }

  async function handleSaveRules() {
    if (!selectedChildId) return;
    setSaving(true);
    setStatus("");
    try {
      await apiPatch(`/children/${selectedChildId}/rules/`, {
        daily_entertainment_cap_minutes: form.dailyCap,
        cooldown_minutes: form.cooldown,
        session_duration_limit_minutes: form.sessionDuration,
        total_screen_time_limit_minutes: form.totalScreen,
        continuous_screen_time_limit_minutes: form.continuousScreen,
        minimum_offscreen_break_minutes: form.minimumBreak,
        time_profile: configMode === "simple" ? form.timeProfile : "custom",
        voice_enabled: form.voice,
        camera_enabled: form.camera,
        entertainment_paused: form.paused,
      });
      setStatus("Cập nhật cấu hình luật bảo vệ thành công.");
      const refreshedChildren = await apiGetRequired<ChildProfileData[]>("/children/");
      setChildren(refreshedChildren);
      const nextSelected = refreshedChildren.find((child) => child.id === selectedChildId) || null;
      if (nextSelected) {
        setForm(stateFromRules(nextSelected));
      }
      const meta = await apiGetRequired<RuleMeta>(`/children/${selectedChildId}/rules/meta/`);
      setRuleMeta(meta);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Không thể cập nhật luật lệ.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Panel eyebrow="Cài đặt luật lệ" title="Luật phụ huynh luôn ghi đè ví điểm">
        <div className="py-10 text-center font-bold text-slate-500">Đang tải dữ liệu thiết lập...</div>
      </Panel>
    );
  }

  if (children.length === 0) {
    return (
      <Panel eyebrow="Cài đặt luật lệ" title="Luật phụ huynh luôn ghi đè ví điểm">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
          <p className="text-xs font-black text-slate-500">Vui lòng tạo hồ sơ cho bé trước khi thiết lập luật lệ.</p>
          <Link href="/onboarding/child-profile" className="bubbly-btn mt-4 inline-flex rounded-xl bg-emerald-400 px-6 py-2.5 text-xs font-black text-white">
            ➕ Tạo hồ sơ ngay
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <Panel eyebrow="Cài đặt luật lệ" title="Luật phụ huynh luôn ghi đè ví điểm">
      <div className="space-y-6">
        {children.length > 1 ? (
          <label className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs font-black uppercase tracking-wider text-slate-500">
            Chọn bé để quản lý luật lệ:
            <select
              className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 font-bold text-slate-800 outline-none"
              value={selectedChildId}
              onChange={(event) => void handleChildRuleSelection(event.target.value)}
            >
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  Bé {child.nickname} ({child.age} tuổi)
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-rose-100 bg-rose-50/30 p-5 sm:flex-row">
          <div>
            <h4 className="font-black text-slate-800">Tạm dừng giải trí tức thì</h4>
            <p className="mt-0.5 text-xs font-bold text-slate-400">Tạm khóa toàn bộ luồng đổi điểm giải trí của trẻ ngay lập tức.</p>
          </div>
          <button
            className={`bubbly-btn min-h-12 rounded-xl px-6 text-xs font-black text-white shadow-md ${form.paused ? "bg-emerald-400 shadow-emerald-100" : "bg-rose-500 shadow-rose-100"}`}
            onClick={() => updateForm("paused", !form.paused)}
            type="button"
          >
            {form.paused ? "🔓 Kích hoạt lại" : "🛑 Khóa giải trí ngay"}
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-slate-800">Hạn mức giải trí ngày</span>
              <span className="text-sm font-black text-blue-500">{form.dailyCap} phút</span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={form.dailyCap}
              onChange={(event) => updateForm("dailyCap", Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-100 accent-blue-500"
            />
            <p className="text-[10px] font-bold text-slate-400">Thời gian tối đa trẻ được đổi điểm xem video hoặc chơi game mỗi ngày.</p>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-slate-800">Thời gian nghỉ giữa các lượt giải trí</span>
              <span className="text-sm font-black text-emerald-500">{form.cooldown} phút</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={form.cooldown}
              onChange={(event) => updateForm("cooldown", Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-100 accent-emerald-500"
            />
            <p className="text-[10px] font-bold text-slate-400">Khoảng nghỉ tối thiểu giữa hai lượt giải trí đổi điểm.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setConfigMode("simple")}
              className={`rounded-xl px-4 py-2 text-xs font-black ${configMode === "simple" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              Simple Mode
            </button>
            <button
              type="button"
              onClick={() => {
                setConfigMode("advanced");
                updateForm("timeProfile", "custom");
              }}
              className={`rounded-xl px-4 py-2 text-xs font-black ${configMode === "advanced" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              Advanced Mode
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-[#dff6ee] bg-[#f3fbf7] p-4 text-xs font-bold leading-6 text-slate-700">
            {ruleMeta ? (
              <>
                Nhóm tuổi <strong>{ruleMeta.age_band}</strong>. Trần an toàn của app: phiên tối đa{" "}
                <strong>{ruleMeta.ceiling.session} phút</strong>, screen time tối đa{" "}
                <strong>{ruleMeta.ceiling.total_screen} phút</strong>, liên tục tối đa{" "}
                <strong>{ruleMeta.ceiling.continuous} phút</strong>.
              </>
            ) : (
              "Đang tải preset và trần an toàn theo độ tuổi..."
            )}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {([
              ["low_screen", "Low-screen"],
              ["balanced", "Balanced"],
              ["learning_focused", "Learning-focused"],
              ["custom", "Custom"],
            ] as const).map(([key, label]) => {
              const preset = ruleMeta?.presets[key];
              const active = form.timeProfile === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={`rounded-2xl border p-4 text-left shadow-sm ${active ? "border-slate-800 bg-slate-800 text-white" : "border-slate-100 bg-slate-50 text-slate-700"}`}
                >
                  <p className="text-xs font-black uppercase tracking-wide">{label}</p>
                  <p className={`mt-2 text-[11px] font-bold leading-6 ${active ? "text-slate-100" : "text-slate-500"}`}>
                    {preset
                      ? `Phiên ${preset.session}p · Screen ${preset.total_screen}p · Liên tục ${preset.continuous}p · Nghỉ ${preset.break}p`
                      : "Tự chỉnh trực tiếp bốn giới hạn."}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 rounded-2xl bg-slate-50 p-4 text-xs font-black text-slate-700">
              Session Duration Limit
              <input
                type="number"
                min={15}
                max={ruleMeta?.ceiling.session ?? 120}
                value={form.sessionDuration}
                onChange={(event) => {
                  setConfigMode("advanced");
                  setForm((current) => ({
                    ...current,
                    timeProfile: "custom",
                    sessionDuration: Number(event.target.value),
                  }));
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-800 outline-none"
              />
            </label>
            <label className="grid gap-2 rounded-2xl bg-slate-50 p-4 text-xs font-black text-slate-700">
              Total Screen Time Limit
              <input
                type="number"
                min={10}
                max={ruleMeta?.ceiling.total_screen ?? 90}
                value={form.totalScreen}
                onChange={(event) => {
                  setConfigMode("advanced");
                  setForm((current) => ({
                    ...current,
                    timeProfile: "custom",
                    totalScreen: Number(event.target.value),
                  }));
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-800 outline-none"
              />
            </label>
            <label className="grid gap-2 rounded-2xl bg-slate-50 p-4 text-xs font-black text-slate-700">
              Continuous Screen Time Limit
              <input
                type="number"
                min={5}
                max={ruleMeta?.ceiling.continuous ?? 20}
                value={form.continuousScreen}
                onChange={(event) => {
                  setConfigMode("advanced");
                  setForm((current) => ({
                    ...current,
                    timeProfile: "custom",
                    continuousScreen: Number(event.target.value),
                  }));
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-800 outline-none"
              />
            </label>
            <label className="grid gap-2 rounded-2xl bg-slate-50 p-4 text-xs font-black text-slate-700">
              Minimum Off-screen Break
              <input
                type="number"
                min={3}
                max={15}
                value={form.minimumBreak}
                onChange={(event) => {
                  setConfigMode("advanced");
                  setForm((current) => ({
                    ...current,
                    timeProfile: "custom",
                    minimumBreak: Number(event.target.value),
                  }));
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-800 outline-none"
              />
            </label>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-xs font-bold leading-6 text-slate-700">
            Minimum off-screen time = Session Duration - Total Screen Time ={" "}
            <strong>{Math.max(form.sessionDuration - form.totalScreen, 0)} phút</strong>.
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎙️</span>
              <div>
                <span className="block text-xs font-black text-slate-800">Cho phép dùng Micro</span>
                <span className="text-[10px] font-bold text-slate-400">Dùng cho nhiệm vụ tập đọc</span>
              </div>
            </div>
            <button
              className={`h-6 w-12 rounded-full p-0.5 transition-colors duration-300 ${form.voice ? "bg-emerald-400" : "bg-slate-200"}`}
              onClick={() => updateForm("voice", !form.voice)}
              type="button"
            >
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${form.voice ? "translate-x-6" : ""}`} />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">📷</span>
              <div>
                <span className="block text-xs font-black text-slate-800">Cho phép dùng Camera</span>
                <span className="text-[10px] font-bold text-slate-400">Dành cho vận động cơ thể</span>
              </div>
            </div>
            <button
              className={`h-6 w-12 rounded-full p-0.5 transition-colors duration-300 ${form.camera ? "bg-emerald-400" : "bg-slate-200"}`}
              onClick={() => updateForm("camera", !form.camera)}
              type="button"
            >
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${form.camera ? "translate-x-6" : ""}`} />
            </button>
          </div>
        </div>

        {status ? (
          <div
            className={`rounded-xl border p-4 text-xs font-bold ${
              status.toLowerCase().includes("không") || status.toLowerCase().includes("lỗi")
                ? "border-amber-100 bg-amber-50 text-slate-700"
                : "border-emerald-100 bg-emerald-50 text-emerald-800"
            }`}
          >
            {status}
          </div>
        ) : null}

        <button
          onClick={handleSaveRules}
          disabled={saving}
          type="button"
          className="bubbly-btn min-h-12 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-xs font-black text-white shadow-md"
        >
          {saving ? "Đang lưu cấu hình..." : "Lưu cấu hình luật bảo vệ 💾"}
        </button>
      </div>
    </Panel>
  );
}

export type APIRewardItem = {
  id: string;
  title: string;
  description: string;
  reward_type: "entertainment" | "documentary" | "mascot_item";
  points_cost: number;
  duration_minutes: number;
  approval_status: "approved" | "pending" | "blocked" | "demo_only";
  active: boolean;
  demo_only: boolean;
};

export function ContentApproval() {
  const [items, setItems] = useState<APIRewardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<APIRewardItem[]>("/gamification/reward-items/", [])
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await apiPatch(`/gamification/reward-items/${id}/`, {
        approval_status: "approved",
      });
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, approval_status: "approved" } : item)));
    } catch (err) {
      console.error("Lỗi khi duyệt nội dung:", err);
    }
  };

  const handleBlock = async (id: string) => {
    try {
      await apiPatch(`/gamification/reward-items/${id}/`, {
        approval_status: "blocked",
      });
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, approval_status: "blocked" } : item)));
    } catch (err) {
      console.error("Lỗi khi chặn nội dung:", err);
    }
  };

  if (loading) {
    return (
      <Panel eyebrow="Kho nội dung số" title="Hàng đợi duyệt nội dung & quà tặng">
        <div className="py-8 text-center text-xs font-bold text-slate-400">🔄 Đang tải kho nội dung từ máy chủ...</div>
      </Panel>
    );
  }

  return (
    <Panel eyebrow="Kho nội dung số" title="Quản lý nội dung & quà tặng an toàn">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs font-bold leading-relaxed text-slate-700">
        Quà tặng đã được hệ thống duyệt an toàn sẽ tự mở cho trẻ khi trẻ đủ điểm và không vi phạm giới hạn hoặc
        cooldown. Phụ huynh không cần duyệt lại từng lần đổi quà.
      </div>
      <div className="mt-4 overflow-x-auto px-6 -mx-6">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-black uppercase tracking-wider text-slate-400">
              <th className="pb-3">Nội dung</th>
              <th className="pb-3">Phân loại</th>
              <th className="pb-3">Hạn mức</th>
              <th className="pb-3">Trạng thái</th>
              <th className="pb-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm text-slate-600">
            {items.map((item) => (
              <tr className="transition-colors hover:bg-slate-50/50" key={item.id}>
                <td className="py-4">
                  <div className="font-black text-slate-800">{item.title}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{item.description || "Nội dung do hệ thống chọn lọc."}</div>
                </td>
                <td className="py-4 text-xs font-bold uppercase text-slate-500">{item.reward_type}</td>
                <td className="py-4 font-semibold">{item.duration_minutes > 0 ? `${item.duration_minutes} phút` : "Mascot Item"}</td>
                <td className="py-4">
                  <StatusBadge state={item.approval_status} />
                </td>
                <td className="space-x-2 py-4 text-right">
                  {item.approval_status === "pending" ? (
                    <>
                      <button
                        className="bubbly-btn rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-white shadow-sm"
                        onClick={() => handleApprove(item.id)}
                        type="button"
                      >
                        ✓ Duyệt
                      </button>
                      <button
                        className="bubbly-btn rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-black text-white shadow-sm"
                        onClick={() => handleBlock(item.id)}
                        type="button"
                      >
                        ✕ Chặn
                      </button>
                    </>
                  ) : null}
                  {item.approval_status === "approved" ? (
                    <button
                      className="bubbly-btn rounded-lg border border-rose-100 bg-slate-100 px-3 py-1.5 text-xs font-black text-rose-500"
                      onClick={() => handleBlock(item.id)}
                      type="button"
                    >
                      🚫 Chặn lại
                    </button>
                  ) : null}
                  {item.approval_status === "blocked" ? (
                    <button
                      className="bubbly-btn rounded-lg border border-emerald-100 bg-slate-100 px-3 py-1.5 text-xs font-black text-emerald-600"
                      onClick={() => handleApprove(item.id)}
                      type="button"
                    >
                      🔓 Mở duyệt
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function Reports() {
  return (
    <Panel eyebrow="Báo cáo phát triển" title="Báo cáo cân bằng tuần này của con">
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Metric label="⭐ Tổng điểm tích lũy" value="31 điểm" variant="yellow" />
        <Metric label="🛍️ Điểm đã quy đổi" value="18 điểm" variant="blue" />
        <Metric label="🚫 Số lượt bị tạm dừng" value="2 lần" variant="rose" />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-gradient-to-tr from-emerald-50/50 to-blue-50/30 p-5">
        <h4 className="flex items-center gap-2 text-sm font-black text-slate-800">
          <span>📈</span> Phân tích cân bằng số:
        </h4>
        <p className="mt-2 text-xs font-bold leading-relaxed text-slate-600">
          Trẻ đang có thói quen đọc sách tốt vào đầu giờ tối. Hạn mức giải trí được duy trì dưới mức phụ huynh đặt.
          Gợi ý hiện tại là tăng nhẹ các nhiệm vụ học và giữ ổn định nhóm đọc hiểu.
        </p>
      </div>

      <p className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-center text-xs font-bold leading-relaxed text-slate-400">
        Báo cáo chỉ nhằm hỗ trợ phụ huynh điều hướng và không mang ý nghĩa chẩn đoán.
      </p>
    </Panel>
  );
}

export function Settings() {
  return (
    <Panel eyebrow="Cài đặt hệ thống" title="Danh mục hoạt động được bật">
      <p className="mb-4 text-xs font-bold text-slate-500">
        Phụ huynh có quyền bật hoặc tắt hoàn toàn các nhóm chức năng để phù hợp với triết lý giáo dục của gia đình.
      </p>

      <div className="mt-2 grid gap-3">
        {categories.map((category) => (
          <div key={category.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-colors hover:border-indigo-200">
            <div>
              <span className="text-sm font-black text-slate-800">{category.label}</span>
              <span className="mt-0.5 block text-[10px] font-bold text-slate-400">Mã danh mục: {category.id}</span>
            </div>
            <span className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-600">
              ✓ Hoạt động
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
