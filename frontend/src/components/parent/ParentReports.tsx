"use client";

import { useEffect, useMemo, useState } from "react";

import { Metric, Panel } from "@/components/common/Cards";
import { apiGetRequired } from "@/lib/api";

type ChildProfile = {
  id: string;
  nickname: string;
  age: number;
};

type ReportData = {
  child: ChildProfile;
  wallet: {
    points_balance: number;
    points_earned_total: number;
    points_spent_total: number;
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
  weekly_summary: string;
  recent_transactions: Array<{
    id: string;
    type: string;
    points: number;
    reason: string;
    created_at: string;
  }>;
  recent_sessions: Array<{
    id: string;
    session_type: string;
    duration_minutes: number;
    blocked_reason?: string;
    started_at: string;
    ended_at?: string | null;
  }>;
};

const missionLabels: Record<string, string> = {
  creative: "Sáng tạo",
  documentary: "Khám phá khoa học",
  entertainment: "Giải trí",
  learning: "Học tập",
  movement: "Vận động",
  reading: "Đọc sách",
  reflection: "Kỹ năng sống",
  screen_time: "Dùng app",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ParentReports() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    loadChildren();
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;
    async function loadReport() {
      setLoading(true);
      try {
        const data = await apiGetRequired<ReportData>(`/activity/dashboard/?child_id=${selectedChildId}`);
        setReport(data);
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
    loadReport();
  }, [selectedChildId]);

  const derived = useMemo(() => {
    if (!report) {
      return {
        activeMinutes: 0,
        passiveMinutes: 0,
        activeRatio: 0,
        passiveRatio: 0,
        averagePointsPerMission: 0,
      };
    }
    const activeMinutes =
      report.metrics.learning_minutes +
      report.metrics.reading_minutes +
      report.metrics.movement_minutes +
      report.metrics.creative_minutes;
    const passiveMinutes = report.metrics.entertainment_minutes_today + report.metrics.documentary_minutes;
    const totalTracked = Math.max(activeMinutes + passiveMinutes, 1);
    return {
      activeMinutes,
      passiveMinutes,
      activeRatio: Math.round((activeMinutes / totalTracked) * 100),
      passiveRatio: Math.round((passiveMinutes / totalTracked) * 100),
      averagePointsPerMission: report.metrics.mission_completion_count
        ? Math.round(report.wallet.points_earned_total / report.metrics.mission_completion_count)
        : 0,
    };
  }, [report]);

  if (loading) {
    return (
      <Panel eyebrow="Báo cáo" title="Đang tổng hợp dữ liệu">
        <p className="text-sm font-semibold text-slate-500">Báo cáo đang được tạo từ nhiệm vụ, giao dịch điểm và phiên sử dụng thật.</p>
      </Panel>
    );
  }

  if (!children.length) {
    return (
      <Panel eyebrow="Báo cáo" title="Chưa có dữ liệu báo cáo">
        <p className="text-sm font-semibold text-slate-600">Hãy tạo hồ sơ trẻ và ghi nhận vài hoạt động đầu tiên để hệ thống có dữ liệu phân tích.</p>
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
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Panel eyebrow="Phân tích" title={`Báo cáo của ${report.child.nickname}`}>
        <select
          className="mb-6 min-h-11 rounded-[1.25rem] border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 outline-none focus:border-emerald-400"
          value={selectedChildId}
          onChange={(event) => setSelectedChildId(event.target.value)}
        >
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.nickname}, {child.age} tuổi
            </option>
          ))}
        </select>

        <div className="grid gap-4 sm:grid-cols-2">
          <Metric label="Điểm hiện có" value={`${report.wallet.points_balance}`} variant="green" />
          <Metric label="Tổng thời gian app hôm nay" value={`${report.metrics.total_app_minutes} phút`} variant="purple" />
          <Metric label="Tổng điểm đã nhận" value={`${report.wallet.points_earned_total}`} variant="blue" />
          <Metric label="Tổng điểm đã dùng" value={`${report.wallet.points_spent_total}`} variant="yellow" />
          <Metric label="Lượt bị chặn hôm nay" value={`${report.metrics.blocked_attempts}`} variant="rose" />
          <Metric label="Nhiệm vụ hoàn thành hôm nay" value={`${report.metrics.mission_completion_count}`} variant="green" />
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-[#dff6ee] bg-[#f3fbf7] p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Phân tích sâu</p>
          <div className="mt-4 grid gap-3">
            <div className="flex items-center justify-between rounded-[1.25rem] bg-white px-4 py-3 text-sm font-bold text-slate-700">
              <span>Tỷ lệ hoạt động chủ động</span>
              <span>{derived.activeRatio}%</span>
            </div>
            <div className="flex items-center justify-between rounded-[1.25rem] bg-white px-4 py-3 text-sm font-bold text-slate-700">
              <span>Tỷ lệ giải trí và nội dung thụ động</span>
              <span>{derived.passiveRatio}%</span>
            </div>
            <div className="flex items-center justify-between rounded-[1.25rem] bg-white px-4 py-3 text-sm font-bold text-slate-700">
              <span>Điểm trung bình mỗi nhiệm vụ</span>
              <span>{derived.averagePointsPerMission} điểm</span>
            </div>
            <div className="flex items-center justify-between rounded-[1.25rem] bg-white px-4 py-3 text-sm font-bold text-slate-700">
              <span>Phút chủ động / thụ động</span>
              <span>
                {derived.activeMinutes} / {derived.passiveMinutes}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-[#dff0ff] bg-[#f6fbff] p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Tóm tắt hệ thống</p>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">{report.weekly_summary}</p>
        </div>
      </Panel>

      <div className="grid gap-6">
        <Panel eyebrow="Mẫu sử dụng" title="Timeline phiên sử dụng gần đây">
          <div className="space-y-3">
            {report.recent_sessions.length ? (
              report.recent_sessions.map((session) => (
                <div key={session.id} className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-800">
                        {missionLabels[session.session_type] ?? session.session_type}
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
                  {session.blocked_reason ? (
                    <p className="mt-3 rounded-[1rem] bg-amber-50 px-3 py-2 text-xs font-bold leading-6 text-amber-700">
                      Lý do chặn: {session.blocked_reason}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-slate-500">Chưa có phiên sử dụng nào.</p>
            )}
          </div>
        </Panel>

        <Panel eyebrow="Phân bổ nhiệm vụ" title="Nhóm nhiệm vụ nổi bật trong vài ngày gần đây">
          <div className="grid gap-3">
            {Object.keys(report.mission_mix).length ? (
              Object.entries(report.mission_mix).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between rounded-[1.25rem] bg-[#f6fbff] px-4 py-3 text-sm font-bold text-slate-700">
                  <span>{missionLabels[type] ?? type}</span>
                  <span>{count} lần</span>
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-slate-500">Chưa có nhiệm vụ hoàn thành gần đây.</p>
            )}
          </div>
        </Panel>

        <Panel eyebrow="Điểm thưởng" title="Timeline giao dịch gần đây">
          <div className="space-y-3">
            {report.recent_transactions.length ? (
              report.recent_transactions.map((transaction) => (
                <div key={transaction.id} className="flex flex-col gap-2 rounded-[1.5rem] bg-[#fffaf0] px-4 py-4 text-sm font-bold text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span>{transaction.reason}</span>
                    <span className="mt-1 block text-xs text-slate-400">{formatDateTime(transaction.created_at)}</span>
                  </div>
                  <span>{transaction.points > 0 ? "+" : ""}{transaction.points} điểm</span>
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-slate-500">Chưa có giao dịch điểm nào.</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
