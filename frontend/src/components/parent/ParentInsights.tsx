"use client";

import { useEffect, useMemo, useState } from "react";

import { Panel } from "@/components/common/Cards";
import { apiGetRequired } from "@/lib/api";

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
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  source?: "dashboard" | "reports";
  link?: string;
};

const starterQuestions = [
  "Hôm nay con dùng app bao lâu rồi?",
  "Phiên gần nhất của con có gì đáng chú ý?",
  "Tuần này xu hướng dùng app của con ra sao?",
  "Con đang thiên về hoạt động chủ động hay thụ động?",
  "Có điều gì phụ huynh nên chú ý không?",
];

const diagnosisKeywords = ["nghiện", "tâm lý", "trầm cảm", "adhd", "bệnh", "rối loạn", "thiếu tập trung", "chẩn đoán"];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hasEnoughData(data: DashboardData) {
  return data.weekly_metrics.total_app_minutes > 0 || data.metrics.total_app_minutes > 0;
}

function buildAnswer(question: string, data: DashboardData): ChatMessage {
  const normalized = question.toLowerCase();

  if (diagnosisKeywords.some((keyword) => normalized.includes(keyword))) {
    return {
      role: "assistant",
      content:
        "Tôi không thể chẩn đoán hay gắn nhãn tâm lý hoặc y tế cho trẻ. Tôi chỉ có thể tóm tắt dữ liệu hoạt động và thời gian dùng app hiện có.",
      source: "reports",
      link: "/parent/reports",
    };
  }

  if (!hasEnoughData(data)) {
    return {
      role: "assistant",
      content:
        "Hiện chưa có đủ dữ liệu trong tuần này để kết luận xu hướng. Bạn có thể xem lại sau khi bé dùng app thêm vài phiên.",
      source: "reports",
      link: "/parent/reports",
    };
  }

  if (normalized.includes("bao lâu") || normalized.includes("bao nhiêu") || normalized.includes("thời gian")) {
    return {
      role: "assistant",
      content: `Dựa trên dữ liệu ngày ${new Date(data.report_date).toLocaleDateString("vi-VN")}, ${data.child.nickname} đã dùng app ${data.metrics.total_app_minutes} phút, trong đó ${data.metrics.screen_time_minutes} phút trên màn hình và ${data.metrics.offscreen_time_minutes} phút ngoài màn hình.`,
      source: "dashboard",
      link: "/parent/dashboard",
    };
  }

  if (normalized.includes("phiên gần nhất") || normalized.includes("vừa dùng") || normalized.includes("vừa rồi")) {
    return {
      role: "assistant",
      content: data.latest_activity
        ? `Phiên gần nhất tôi ghi nhận là "${data.latest_activity.content_title || data.latest_activity.notes || "một hoạt động trong app"}" vào ${formatDateTime(data.latest_activity.started_at)}, kéo dài ${data.latest_activity.duration_minutes} phút.`
        : `Hiện tôi chưa có phiên hoàn chỉnh nào gần đây của ${data.child.nickname}.`,
      source: "dashboard",
      link: "/parent/dashboard",
    };
  }

  if (normalized.includes("đang làm gì") || normalized.includes("hiện tại") || normalized.includes("bây giờ")) {
    return {
      role: "assistant",
      content: data.current_session
        ? `${data.child.nickname} đang ở "${data.current_session.current_activity_title || "một hoạt động trong app"}". Phiên hiện tại đã kéo dài ${data.current_session.current_session_minutes} phút.`
        : `${data.child.nickname} hiện chưa có phiên khu trẻ em nào đang mở.`,
      source: "dashboard",
      link: "/parent/dashboard",
    };
  }

  if (normalized.includes("chủ động") || normalized.includes("thụ động")) {
    return {
      role: "assistant",
      content: `Trong 7 ngày gần đây, ${data.child.nickname} có ${data.weekly_metrics.active_minutes} phút hoạt động chủ động và ${data.weekly_metrics.passive_minutes} phút nội dung thụ động. ${data.eda_highlights[0] || ""}`.trim(),
      source: "reports",
      link: "/parent/reports",
    };
  }

  if (normalized.includes("an toàn") || normalized.includes("chú ý") || normalized.includes("cảnh báo")) {
    return {
      role: "assistant",
      content: data.alerts.length
        ? `Hiện có ${data.alerts.length} ghi chú dành cho phụ huynh. Mục nổi bật nhất là: ${data.alerts[0]}`
        : "Hiện chưa có ghi chú an toàn mới trong dashboard.",
      source: "dashboard",
      link: "/parent/dashboard",
    };
  }

  if (normalized.includes("tuần") || normalized.includes("xu hướng") || normalized.includes("báo cáo")) {
    return {
      role: "assistant",
      content: data.weekly_summary,
      source: "reports",
      link: "/parent/reports",
    };
  }

  return {
    role: "assistant",
    content:
      "Tôi có thể tóm tắt thời gian dùng app, phiên gần nhất, xu hướng 7 ngày, tỷ lệ hoạt động chủ động hoặc thụ động và các ghi chú dành cho phụ huynh.",
    source: "reports",
    link: "/parent/reports",
  };
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
        "Tôi chỉ trả lời dựa trên dashboard, báo cáo và lịch sử phiên hiện có của con. Nếu dữ liệu chưa đủ, tôi sẽ nói rõ điều đó.",
      source: "reports",
      link: "/parent/reports",
    },
  ]);
  const [loading, setLoading] = useState(true);
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
            "Tôi chỉ trả lời dựa trên dashboard, báo cáo và lịch sử phiên hiện có của con. Nếu dữ liệu chưa đủ, tôi sẽ nói rõ điều đó.",
          source: "reports",
          link: "/parent/reports",
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

  const suggestionButtons = useMemo(() => starterQuestions.slice(0, 4), []);

  function ask(question: string) {
    if (!dashboard) return;
    const trimmed = question.trim();
    if (!trimmed) return;
    setMessages((current) => [...current, { role: "user", content: trimmed }, buildAnswer(trimmed, dashboard)]);
    setDraft("");
  }

  return (
    <div className="grid gap-6 py-4 xl:grid-cols-[0.72fr_1.28fr]">
      <Panel eyebrow="Hỏi AI" title="Trợ lý dữ liệu cho phụ huynh">
        <p className="text-sm font-semibold leading-7 text-slate-600">
          Hỏi nhanh về thời gian dùng app, phiên gần nhất, xu hướng 7 ngày và các ghi chú quan trọng mà không cần đọc toàn bộ báo cáo.
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
              onClick={() => ask(question)}
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

      <Panel eyebrow="Trò chuyện" title="Dữ liệu đã tuyển chọn">
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
                      {message.source === "reports" ? "Xem chi tiết trong Báo cáo" : "Xem chi tiết trong Tổng quan"}
                    </a>
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
                onClick={() => ask(draft)}
                className="justify-self-end rounded-2xl bg-slate-800 px-5 py-3 text-sm font-black text-white"
              >
                Gửi câu hỏi
              </button>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
