"use client";

import { useEffect, useState } from "react";

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
  }>;
};

const missionLabels: Record<string, string> = {
  creative: "Sáng tạo",
  learning: "Học tập",
  movement: "Vận động",
  reading: "Đọc",
  reflection: "Nhìn lại",
};

export function ParentReports() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGetRequired<ChildProfile[]>("/children/")
      .then((data) => {
        setChildren(data);
        const activeChildId =
          typeof window !== "undefined" ? window.localStorage.getItem("active_child_id") : "";
        const nextChildId = data.find((child) => child.id === activeChildId)?.id ?? data[0]?.id ?? "";
        setSelectedChildId(nextChildId);
        if (!nextChildId) setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Không thể tải danh sách trẻ.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;
    apiGetRequired<ReportData>(`/activity/dashboard/?child_id=${selectedChildId}`)
      .then((data) => {
        setReport(data);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("active_child_id", selectedChildId);
        }
      })
      .catch((err) => {
        setReport(null);
        setError(err instanceof Error ? err.message : "Không thể tải báo cáo.");
      })
      .finally(() => setLoading(false));
  }, [selectedChildId]);

  if (loading) {
    return (
      <Panel eyebrow="Báo cáo" title="Đang tổng hợp dữ liệu">
        <p className="text-sm font-semibold text-slate-500">Báo cáo được tạo từ nhiệm vụ, ví điểm và phiên sử dụng thật trong database.</p>
      </Panel>
    );
  }

  if (!children.length) {
    return (
      <Panel eyebrow="Báo cáo" title="Chưa có dữ liệu báo cáo">
        <p className="text-sm font-semibold text-slate-600">Hãy tạo hồ sơ trẻ và cho trẻ hoàn thành nhiệm vụ đầu tiên để báo cáo được ghi nhận.</p>
      </Panel>
    );
  }

  if (error || !report) {
    return (
      <Panel eyebrow="Báo cáo" title="Không thể tải báo cáo">
        <p className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-slate-700">
          {error || "Báo cáo chưa sẵn sàng."}
        </p>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Panel eyebrow="Báo cáo trẻ" title={`Báo cáo của ${report.child.nickname}`}>
        <select
          className="mb-6 min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 outline-none focus:border-emerald-400"
          onChange={(event) => setSelectedChildId(event.target.value)}
          value={selectedChildId}
        >
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.nickname}, {child.age} tuổi
            </option>
          ))}
        </select>

        <div className="grid gap-4 sm:grid-cols-2">
          <Metric label="Điểm hiện có" value={`${report.wallet.points_balance}`} variant="green" />
          <Metric label="Tổng điểm đã nhận" value={`${report.wallet.points_earned_total}`} variant="blue" />
          <Metric label="Tổng điểm đã dùng" value={`${report.wallet.points_spent_total}`} variant="yellow" />
          <Metric label="Lượt chặn an toàn" value={`${report.metrics.blocked_attempts}`} variant="rose" />
        </div>

        <div className="mt-6 rounded-3xl border border-sky-100 bg-sky-50/70 p-5">
          <p className="text-xs font-black uppercase tracking-wider text-sky-700">Tóm tắt hệ thống</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{report.weekly_summary}</p>
        </div>
      </Panel>

      <Panel eyebrow="Chi tiết hoạt động" title="Nhiệm vụ và giao dịch gần đây">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-100 bg-white p-5">
            <p className="text-sm font-black text-slate-800">Phân bổ nhiệm vụ</p>
            <div className="mt-4 space-y-3">
              {Object.keys(report.mission_mix).length ? (
                Object.entries(report.mission_mix).map(([type, count]) => (
                  <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold" key={type}>
                    <span>{missionLabels[type] ?? type}</span>
                    <span>{count} lần</span>
                  </div>
                ))
              ) : (
                <p className="text-sm font-semibold text-slate-500">Chưa có nhiệm vụ hoàn thành.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5">
            <p className="text-sm font-black text-slate-800">Phiên sử dụng gần đây</p>
            <div className="mt-4 space-y-3">
              {report.recent_sessions.length ? (
                report.recent_sessions.slice(0, 5).map((session) => (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700" key={session.id}>
                    <div className="flex justify-between gap-3">
                      <span>{missionLabels[session.session_type] ?? session.session_type}</span>
                      <span>{session.duration_minutes} phút</span>
                    </div>
                    {session.blocked_reason && <p className="mt-1 text-xs text-amber-700">Lý do chặn: {session.blocked_reason}</p>}
                  </div>
                ))
              ) : (
                <p className="text-sm font-semibold text-slate-500">Chưa có phiên sử dụng.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-slate-100 bg-white p-5">
          <p className="text-sm font-black text-slate-800">Giao dịch điểm</p>
          <div className="mt-4 space-y-3">
            {report.recent_transactions.length ? (
              report.recent_transactions.map((transaction) => (
                <div className="flex flex-col justify-between gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-slate-700 sm:flex-row" key={transaction.id}>
                  <span>{transaction.reason}</span>
                  <span>{transaction.points > 0 ? "+" : ""}{transaction.points} điểm</span>
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-slate-500">Chưa có giao dịch điểm.</p>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
