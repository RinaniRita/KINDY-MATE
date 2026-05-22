"use client";

import { useEffect, useMemo, useState } from "react";

import { Panel } from "@/components/common/Cards";
import { apiGetRequired, apiPostRequired } from "@/lib/api";

type ChildProfile = {
  id: string;
  nickname: string;
  age: number;
};

type DashboardData = {
  child: ChildProfile;
  report_date: string;
  metrics: {
    total_app_minutes: number;
    screen_time_minutes: number;
    offscreen_time_minutes: number;
    active_minutes: number;
    passive_minutes: number;
    completed_activity_count: number;
  };
  weekly_metrics: {
    total_app_minutes: number;
    screen_time_minutes: number;
    offscreen_time_minutes: number;
    active_minutes: number;
    passive_minutes: number;
    completed_activity_count: number;
  };
  alerts: string[];
  weekly_summary: string;
  eda_highlights: string[];
  current_session: {
    current_session_minutes: number;
    current_screen_minutes: number;
    remaining_session_minutes: number;
    current_activity_title: string;
  } | null;
  latest_activity: {
    duration_minutes: number;
    notes: string;
    content_title?: string;
    started_at: string;
  } | null;
  recent_sessions?: Array<{
    id: string;
    content_title?: string;
    notes: string;
    duration_minutes: number;
    activity_category: string;
    display_category: string;
    started_at: string;
    ended_at?: string | null;
  }>;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  link?: string;
  status?: "success" | "fallback";
};

type InsightsResponse = {
  reply: string;
  status: "success" | "fallback";
  source_scope: string;
  link_target?: string;
  detail?: string;
};

const starterQuestions = [
  "Hôm nay con dùng app bao lâu rồi?",
  "Phiên gần nhất của con có gì đáng chú ý?",
  "Tuần này xu hướng dùng app của con ra sao?",
  "Con đang thiên về hoạt động chủ động hay thụ động?",
];

function buildPresetAnswer(question: string, dashboard: DashboardData): { reply: string; link: string } | null {
  const childName = dashboard.child.nickname;
  const reportDate = new Date(dashboard.report_date).toLocaleDateString("vi-VN");

  if (question === "Hôm nay con dùng app bao lâu rồi?") {
    return {
      reply: `Dựa trên dữ liệu ngày ${reportDate}, ${childName} đã dùng app ${dashboard.metrics.total_app_minutes} phút, trong đó ${dashboard.metrics.screen_time_minutes} phút trên màn hình và ${dashboard.metrics.offscreen_time_minutes} phút ngoài màn hình.`,
      link: "/parent/dashboard",
    };
  }

  if (question === "Phiên gần nhất của con có gì đáng chú ý?") {
    const latest = dashboard.latest_activity;
    if (!latest) {
      return {
        reply: `Hiện chưa có phiên gần đây đủ dữ liệu để tóm tắt cho ${childName}.`,
        link: "/parent/dashboard",
      };
    }
    const title = latest.content_title || latest.notes || "một hoạt động trong app";
    return {
      reply: `Phiên gần nhất của ${childName} là "${title}", kéo dài ${latest.duration_minutes} phút. ${latest.notes || "Đây là hoạt động mới nhất đã được ghi nhận."}`,
      link: "/parent/dashboard",
    };
  }

  if (question === "Tuần này xu hướng dùng app của con ra sao?") {
    return {
      reply:
        dashboard.weekly_summary ||
        `Trong 7 ngày gần đây, ${childName} đã có ${dashboard.weekly_metrics.total_app_minutes} phút dùng app và ${dashboard.weekly_metrics.completed_activity_count} hoạt động được ghi nhận.`,
      link: "/parent/reports",
    };
  }

  if (question === "Con đang thiên về hoạt động chủ động hay thụ động?") {
    return {
      reply: `Trong 7 ngày gần đây, ${childName} có ${dashboard.weekly_metrics.active_minutes} phút hoạt động chủ động và ${dashboard.weekly_metrics.passive_minutes} phút nội dung thụ động.`,
      link: "/parent/reports",
    };
  }

  return null;
}

export function ParentInsights() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Tôi chỉ trả lời dựa trên dashboard, báo cáo và lịch sử hoạt động hiện có của con. Nếu dữ liệu chưa đủ, tôi sẽ nói rõ điều đó.",
      link: "/parent/reports",
      status: "success",
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadChildren() {
      setLoading(true);
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
      setMessages([
        {
          role: "assistant",
          content:
            "Tôi chỉ trả lời dựa trên dashboard, báo cáo và lịch sử hoạt động hiện có của con. Nếu dữ liệu chưa đủ, tôi sẽ nói rõ điều đó.",
          link: "/parent/reports",
          status: "success",
        },
      ]);
      try {
        const data = await apiGetRequired<DashboardData>(`/activity/dashboard/?child_id=${selectedChildId}`);
        setDashboard(data);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("active_child_id", selectedChildId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu trợ lý.");
        setDashboard(null);
      } finally {
        setLoading(false);
      }
    }
    void loadDashboard();
  }, [selectedChildId]);

  const suggestionButtons = useMemo(() => starterQuestions, []);

  async function ask(question: string) {
    if (!dashboard) return;
    const trimmed = question.trim();
    if (!trimmed || asking) return;

    setAsking(true);
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    setDraft("");

    const presetAnswer = buildPresetAnswer(trimmed, dashboard);
    if (presetAnswer) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: presetAnswer.reply,
          link: presetAnswer.link,
          status: "success",
        },
      ]);
      setAsking(false);
      return;
    }

    try {
      const history = messages.map((message) => ({
        role: message.role,
        content: message.content,
      }));
      const response = await apiPostRequired<InsightsResponse>("/parent-insights/", {
        child_id: selectedChildId,
        message: trimmed,
        history,
        context: dashboard,
      });
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response.reply,
          link: response.link_target,
          status: response.status,
        },
      ]);
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Không thể lấy phản hồi từ trợ lý phụ huynh.",
          link: "/parent/reports",
          status: "fallback",
        },
      ]);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="grid gap-6 py-4 xl:grid-cols-[0.72fr_1.28fr]">
      <Panel eyebrow="Trợ lý phụ huynh" title="Hỏi nhanh từ dữ liệu của con">
        <p className="text-sm font-semibold leading-7 text-slate-600">
          Hỏi nhanh về thời gian dùng app, phiên gần nhất, xu hướng 7 ngày và các ghi chú quan trọng mà không cần đọc
          toàn bộ báo cáo.
        </p>

        <label className="mt-5 grid gap-2 text-sm font-black text-slate-700">
          Chọn trẻ
          <select
            value={selectedChildId}
            onChange={(event) => setSelectedChildId(event.target.value)}
            className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none"
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.nickname}, {child.age} tuổi
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5 grid gap-2">
          {suggestionButtons.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => void ask(question)}
              className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700 shadow-sm"
            >
              {question}
            </button>
          ))}
        </div>

        {dashboard ? (
          <div className="mt-5 rounded-[1.5rem] border border-[#dff6ee] bg-[#f3fbf7] p-4 text-sm font-bold leading-6 text-slate-700">
            Tóm tắt nhanh: trong chu kỳ kết thúc ngày {new Date(dashboard.report_date).toLocaleDateString("vi-VN")},{" "}
            {dashboard.child.nickname} đã dùng app {dashboard.metrics.total_app_minutes} phút. Trong 7 ngày gần đây có{" "}
            {dashboard.weekly_metrics.completed_activity_count} hoạt động được ghi nhận.
          </div>
        ) : null}
      </Panel>

      <Panel eyebrow="Trợ lý phụ huynh" title="Dữ liệu đã tuyển chọn">
        {loading ? (
          <p className="text-sm font-semibold text-slate-500">Đang tải dữ liệu để trả lời.</p>
        ) : error ? (
          <p className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-slate-700">{error}</p>
        ) : (
          <>
            <div className="grid gap-3">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-[1.5rem] px-4 py-4 text-sm leading-7 ${
                    message.role === "assistant"
                      ? "border border-sky-100 bg-sky-50/80 text-slate-700"
                      : "bg-slate-800 text-white"
                  }`}
                >
                  <p className="font-semibold">{message.content}</p>
                  {message.role === "assistant" && message.link ? (
                    <a href={message.link} className="mt-2 inline-flex text-xs font-black text-sky-700 underline">
                      {message.link.includes("/reports") ? "Xem chi tiết trong Báo cáo" : "Xem chi tiết trong Tổng quan"}
                    </a>
                  ) : null}
                  {message.role === "assistant" && message.status === "fallback" ? (
                    <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">Chế độ dự phòng</p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ví dụ: Tuần này con đang thiên về hoạt động gì?"
                className="min-h-28 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-300"
              />
              <button
                type="button"
                onClick={() => void ask(draft)}
                disabled={asking}
                className="justify-self-end rounded-2xl bg-slate-800 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                {asking ? "Đang hỏi..." : "Gửi câu hỏi"}
              </button>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
