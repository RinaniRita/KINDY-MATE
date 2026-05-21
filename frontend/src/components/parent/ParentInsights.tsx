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
    discovery_minutes: number;
    healthy_entertainment_minutes: number;
    screen_time_minutes: number;
    total_app_minutes: number;
    mission_completion_count: number;
    blocked_attempts: number;
    cap_left_today: number;
  };
  alerts: string[];
  weekly_summary: string;
  current_session: {
    current_session_minutes: number;
    current_screen_minutes: number;
    remaining_session_minutes: number;
    remaining_screen_minutes: number;
    current_activity_title: string;
  } | null;
  recent_transactions: Array<{
    reason: string;
    points: number;
    created_at: string;
  }>;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  source?: "dashboard" | "reports";
  link?: string;
};

const starterQuestions = [
  "Hôm nay con dùng app bao lâu rồi?",
  "Con đang làm gì bây giờ?",
  "Tuần này nên chú ý điều gì?",
  "Điểm thưởng của con đang thế nào?",
  "Có cảnh báo an toàn nào không?",
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
  return (
    data.metrics.total_app_minutes > 0 ||
    data.metrics.mission_completion_count > 0 ||
    data.recent_transactions.length > 0
  );
}

function buildAnswer(question: string, data: DashboardData): ChatMessage {
  const normalized = question.toLowerCase();
  if (diagnosisKeywords.some((keyword) => normalized.includes(keyword))) {
    return {
      role: "assistant",
      content:
        "Tôi không thể chẩn đoán hay gắn nhãn tâm lý/y tế cho trẻ. Tôi chỉ có thể tóm tắt dữ liệu sử dụng app, điểm thưởng và các luật an toàn hiện có.",
      source: "dashboard",
      link: "/parent/reports",
    };
  }

  if (!hasEnoughData(data)) {
    return {
      role: "assistant",
      content:
        "Hiện chưa có đủ dữ liệu trong phiên hoặc trong ngày để kết luận xu hướng. Bạn có thể xem lại sau khi bé dùng app thêm vài phiên.",
      source: "reports",
      link: "/parent/reports",
    };
  }

  if (normalized.includes("bao lâu") || normalized.includes("bao nhiêu") || normalized.includes("thời gian")) {
    return {
      role: "assistant",
      content: `Dựa trên hoạt động hôm nay, ${data.child.nickname} đã dùng app ${data.metrics.total_app_minutes} phút, trong đó screen time là ${data.metrics.screen_time_minutes} phút. Còn lại ${data.metrics.cap_left_today} phút cap giải trí trong ngày.`,
      source: "dashboard",
      link: "/parent/dashboard",
    };
  }

  if (normalized.includes("đang làm gì") || normalized.includes("hiện tại") || normalized.includes("bây giờ")) {
    return {
      role: "assistant",
      content: data.current_session
        ? `Dựa trên phiên hiện tại, ${data.child.nickname} đang ở "${data.current_session.current_activity_title || "một hoạt động trong app"}". Phiên này đã kéo dài ${data.current_session.current_session_minutes} phút và còn ${data.current_session.remaining_session_minutes} phút trước khi hết thời lượng phiên.`
        : `${data.child.nickname} hiện chưa có child mode nào đang mở.`,
      source: "dashboard",
      link: "/parent/dashboard",
    };
  }

  if (normalized.includes("điểm") || normalized.includes("thưởng") || normalized.includes("đổi quà")) {
    const latest = data.recent_transactions[0];
    return {
      role: "assistant",
      content: latest
        ? `${data.child.nickname} đang có ${data.wallet.points_balance} điểm. Giao dịch gần nhất là "${latest.reason}" vào ${formatDateTime(latest.created_at)} với biến động ${latest.points > 0 ? "+" : ""}${latest.points} điểm.`
        : `${data.child.nickname} đang có ${data.wallet.points_balance} điểm và chưa có giao dịch điểm nào gần đây.`,
      source: "dashboard",
      link: "/parent/dashboard",
    };
  }

  if (normalized.includes("an toàn") || normalized.includes("cảnh báo") || normalized.includes("chặn")) {
    return {
      role: "assistant",
      content: data.alerts.length
        ? `Hiện có ${data.alerts.length} ghi chú an toàn. Nổi bật nhất: ${data.alerts[0]}`
        : "Hiện chưa có cảnh báo an toàn mới trong dashboard.",
      source: "dashboard",
      link: "/parent/dashboard",
    };
  }

  if (normalized.includes("tuần") || normalized.includes("nên") || normalized.includes("gợi ý")) {
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
      "Tôi có thể giúp tóm tắt thời gian dùng app, phiên hiện tại, điểm thưởng, cảnh báo an toàn và xu hướng trong báo cáo. Hãy hỏi ngắn gọn theo một trong các hướng đó.",
    source: "dashboard",
    link: "/parent/dashboard",
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
        "Tôi chỉ trả lời dựa trên dashboard, báo cáo, session và điểm thưởng hiện có của con. Nếu dữ liệu chưa đủ, tôi sẽ nói rõ điều đó.",
      source: "dashboard",
      link: "/parent/dashboard",
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
            "Tôi chỉ trả lời dựa trên dashboard, báo cáo, session và điểm thưởng hiện có của con. Nếu dữ liệu chưa đủ, tôi sẽ nói rõ điều đó.",
          source: "dashboard",
          link: "/parent/dashboard",
        },
      ]);
      try {
        const data = await apiGetRequired<DashboardData>(`/activity/dashboard/?child_id=${selectedChildId}`);
        setDashboard(data);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("active_child_id", selectedChildId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu insights.");
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
          Hỏi nhanh về phiên dùng app, điểm thưởng, cảnh báo an toàn và xu hướng gần đây của con mà không cần đọc toàn bộ báo cáo.
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
            Dựa trên hoạt động hôm nay: {dashboard.child.nickname} đã dùng app {dashboard.metrics.total_app_minutes} phút, hoàn thành{" "}
            {dashboard.metrics.mission_completion_count} nhiệm vụ và còn {dashboard.metrics.cap_left_today} phút cap giải trí.
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
                placeholder="Ví dụ: Hôm nay con đang làm gì?"
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
