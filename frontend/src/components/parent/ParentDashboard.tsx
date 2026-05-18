"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Metric, Panel } from "@/components/common/Cards";
import { apiGetRequired } from "@/lib/api";

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

export function ParentDashboard() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
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
    if (!selectedChildId) {
      return;
    }

    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const data = await apiGetRequired<DashboardData>(`/activity/dashboard/?child_id=${selectedChildId}`);
        setDashboard(data);
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
        <p className="text-sm font-semibold text-slate-500">Kindy-Mate đang đồng bộ dashboard từ cơ sở dữ liệu.</p>
      </Panel>
    );
  }

  if (!children.length) {
    return (
      <Panel eyebrow="Tổng quan" title="Chưa có hồ sơ trẻ">
        <div className="rounded-3xl border border-dashed border-sky-200 bg-sky-50/70 p-6">
          <p className="text-sm font-semibold leading-6 text-slate-600">
            Tài khoản phụ huynh đã sẵn sàng. Hãy tạo hồ sơ trẻ đầu tiên để dashboard có dữ liệu nhiệm vụ, ví điểm,
            phiên giải trí và cảnh báo an toàn.
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
    <div className="grid gap-6 py-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel eyebrow={`Hồ sơ: ${dashboard.child.nickname}`} title="Cân bằng phát triển trong ngày">
        <div className="mb-6 flex flex-wrap items-center gap-3">
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
            Ví điểm: {dashboard.wallet.points_balance} điểm
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Metric label="Thời gian học" value={`${dashboard.metrics.learning_minutes} phút`} variant="green" />
          <Metric label="Thời gian đọc" value={`${dashboard.metrics.reading_minutes} phút`} variant="blue" />
          <Metric label="Vận động" value={`${dashboard.metrics.movement_minutes} phút`} variant="yellow" />
          <Metric
            label="Giải trí hôm nay"
            value={`${dashboard.metrics.entertainment_minutes_today}/${dashboard.rules.daily_entertainment_cap_minutes} phút`}
            variant="rose"
          />
        </div>

        <div className="mt-8 rounded-3xl border border-slate-100 bg-slate-50 p-6">
          <div className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500">
            <span>Hạn mức giải trí hôm nay</span>
            <span className="text-rose-600">{Math.round(capPercent)}% đã dùng</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-rose-300" style={{ width: `${capPercent}%` }} />
          </div>
          <p className="mt-3 text-xs font-bold text-slate-500">
            Còn {dashboard.metrics.cap_left_today} phút theo luật phụ huynh. Trạng thái tạm dừng:{" "}
            {dashboard.rules.entertainment_paused ? "đang bật" : "đang tắt"}.
          </p>
        </div>
      </Panel>

      <Panel eyebrow="Báo cáo an toàn" title="Gợi ý cho phụ huynh">
        <div className="space-y-3">
          {dashboard.alerts.map((alert) => (
            <div className="rounded-3xl border border-sky-100 bg-sky-50/70 p-4 text-sm font-bold leading-6 text-slate-700" key={alert}>
              {alert}
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-amber-100 bg-amber-50/70 p-5">
          <p className="text-xs font-black uppercase tracking-wider text-amber-700">Tóm tắt tuần</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{dashboard.weekly_summary}</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Metric label="Nhiệm vụ hoàn thành" value={`${dashboard.metrics.mission_completion_count}`} variant="purple" />
          <Metric label="Lượt bị chặn an toàn" value={`${dashboard.metrics.blocked_attempts}`} variant="yellow" />
        </div>
      </Panel>
    </div>
  );
}
