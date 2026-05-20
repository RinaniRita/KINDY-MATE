"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";

import { apiGetRequired, apiPost } from "@/lib/api";

import { MascotVisual } from "./MascotVisual";
import type { ChildDashboardData, ChildProfileData, MissionData } from "./types";

type MiloPrompt = "start" | "rest" | "points";

const promptMeta: Record<MiloPrompt, { label: string; reply: string; ctaLabel: string; ctaHref: (childId: string) => string }> = {
  start: {
    label: "Tớ nên bắt đầu ở đâu?",
    reply: "Tớ nghĩ cậu nên ghé bàn học trước, rồi sau đó nếu thích mình ra góc vẽ.",
    ctaLabel: "Đi tới bàn học",
    ctaHref: (childId) => `/child/${childId}/study`,
  },
  rest: {
    label: "Tớ muốn nhẹ nhàng thôi",
    reply: "Vậy mình chọn một việc ngắn hoặc xem một mục khoa học thật êm nhé.",
    ctaLabel: "Đi tới TV",
    ctaHref: (childId) => `/child/${childId}/watch`,
  },
  points: {
    label: "Tớ muốn kiếm thêm điểm",
    reply: "Điểm đến nhanh nhất là hoàn thành một việc ở khu phát triển. Thảm tập cũng vui lắm.",
    ctaLabel: "Đi tới thảm tập",
    ctaHref: (childId) => `/child/${childId}/move`,
  },
};

function chooseSuggestion(missions: MissionData[], dashboard: ChildDashboardData | null) {
  if ((dashboard?.metrics.cap_left_today ?? 0) <= 0) {
    return "Hôm nay mình nghỉ khu vui chơi và chọn một việc thật nhẹ nhé.";
  }
  const creative = missions.find((mission) => mission.display_category === "sang_tao");
  if (creative) return `Tớ đang nghĩ tới "${creative.title}".`;
  const study = missions.find((mission) => mission.display_category === "hoc_hanh");
  if (study) return `Bàn học đang có "${study.title}" cho cậu.`;
  return "Cậu có thể chạm vào một góc trong phòng để bắt đầu.";
}

export function MiloHub({ childId }: { childId: string }) {
  const [child, setChild] = useState<ChildProfileData | null>(null);
  const [dashboard, setDashboard] = useState<ChildDashboardData | null>(null);
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [loading, setLoading] = useState(true);

  // Chat states
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: "Xin chào! Tớ là Milo đây. Hôm nay cậu muốn cùng tớ trò chuyện hay học tập điều gì nào? 🦖✨",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [childData, dashboardData, missionData] = await Promise.all([
          apiGetRequired<ChildProfileData>(`/children/${childId}/`),
          apiGetRequired<ChildDashboardData>(`/activity/dashboard/?child_id=${childId}`),
          apiGetRequired<MissionData[]>(`/missions/?child_id=${childId}`),
        ]);
        setChild(childData);
        setDashboard(dashboardData);
        setMissions(missionData);
      } finally {
        setLoading(false);
      }
    }
    load().catch(() => setLoading(false));
  }, [childId]);

  // Smooth auto scroll to latest chat messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const suggestion = useMemo(() => chooseSuggestion(missions, dashboard), [missions, dashboard]);

  async function handleSendText(text: string) {
    if (!text.trim() || sending) return;

    const userMsg = { role: "user" as const, content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setSending(true);

    try {
      const response = await apiPost<{ reply: string }>("/milo/chat/", {
        child_id: childId,
        message: text,
        history: messages.slice(-6), // Keep history size small for performance
      });
      setMessages((prev) => [...prev, { role: "assistant", content: response.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Milo đang bận một chút rồi, bé đợi tớ tí xíu nha! 🦖❤️",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    handleSendText(inputText);
  }

  if (loading || !child) {
    return (
      <div className="child-scene-shell rounded-[2.2rem] px-6 py-20 text-center">
        <p className="relative z-10 text-sm font-black text-slate-500">Milo đang nghĩ cho cậu...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="child-scene-shell rounded-[2.4rem] px-5 py-6 md:px-8 md:py-8">
        <div className="relative z-10 space-y-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Milo</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-800 sm:text-5xl">Tớ ở đây để đi cùng cậu.</h1>
            <p className="mt-4 max-w-xl text-base font-bold leading-8 text-slate-600">{suggestion}</p>
          </div>

          <div className="child-stage-board rounded-[2.1rem] px-5 py-6">
            <div className="relative z-10 flex justify-center">
              <MascotVisual mood={sending ? "hello" : "hello"} size="lg" message="Nhắn tin cho tớ ở hộp thoại bên cạnh nhé! Tớ sẽ trả lời ngay." />
            </div>
          </div>

          <div className="grid gap-3">
            <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">Hỏi nhanh Milo</p>
            {Object.entries(promptMeta).map(([key, meta]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSendText(meta.label)}
                disabled={sending}
                className="child-orbit-chip rounded-[1.6rem] px-4 py-4 text-left bg-white/80 hover:bg-gradient-to-r hover:from-[#dff6ee] hover:to-[#dff0ff] transition duration-300 disabled:opacity-60"
              >
                <span className="text-base font-black text-slate-800">{meta.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6">
        <section className="child-stage-board rounded-[2.2rem] px-5 py-6 md:px-7 md:py-7 flex flex-col justify-between min-h-[450px]">
          <div className="relative z-10 w-full flex-1 flex flex-col justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Hộp thoại của Milo</p>
              
              {/* Chat Log Window */}
              <div className="mt-5 space-y-4 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin flex flex-col">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`max-w-[85%] rounded-[1.7rem] px-4 py-3 text-sm leading-relaxed shadow-sm transition duration-350 ${
                      msg.role === "user"
                        ? "ml-auto border border-white/70 bg-white/90 text-slate-700 font-semibold"
                        : "bg-gradient-to-r from-[#dff6ee] to-[#dff0ff] text-slate-800 font-bold"
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
                
                {/* Thinking / Loading Bubble */}
                {sending && (
                  <div className="max-w-[88%] rounded-[1.9rem] bg-gradient-to-r from-[#dff6ee] to-[#dff0ff] px-5 py-4 text-sm font-bold text-slate-500 shadow-sm animate-pulse flex items-center gap-2">
                    <span>🦖 Milo đang nghĩ...</span>
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                    </span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Input Form at Bottom */}
            <div className="mt-6 border-t border-slate-100/50 pt-5">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={sending}
                  placeholder="Nhắn tin cho bạn Milo tại đây..."
                  className="flex-1 min-h-[48px] rounded-[1.4rem] border border-slate-100 bg-white/90 px-4 py-2 text-sm font-bold text-slate-800 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50/50 transition"
                />
                <button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  className="rounded-[1.4rem] bg-gradient-to-r from-[#9dd9c6] to-[#bde6d9] px-6 py-2 text-sm font-black text-slate-800 shadow-md hover:shadow-lg disabled:opacity-50 transition"
                >
                  Gửi ➔
                </button>
              </form>

              <div className="mt-4 flex gap-3">
                <Link href={`/child/${childId}/mascot`} className="rounded-[1.4rem] border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50 transition">
                  🎒 Thay trang phục cho Milo
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="child-stage-board rounded-[2.2rem] px-5 py-6 md:px-7 md:py-7">
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Hôm nay của cậu</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="child-island-card rounded-[1.6rem] px-4 py-4">
                <p className="relative z-10 text-2xl font-black text-slate-800">{dashboard?.wallet.points_balance ?? child.wallet_balance}</p>
                <p className="relative z-10 text-xs font-bold text-slate-500">Điểm</p>
              </div>
              <div className="child-island-card rounded-[1.6rem] px-4 py-4">
                <p className="relative z-10 text-2xl font-black text-slate-800">{dashboard?.metrics.mission_completion_count ?? 0}</p>
                <p className="relative z-10 text-xs font-bold text-slate-500">Việc xong</p>
              </div>
              <div className="child-island-card rounded-[1.6rem] px-4 py-4">
                <p className="relative z-10 text-2xl font-black text-slate-800">{dashboard?.metrics.cap_left_today ?? 0}p</p>
                <p className="relative z-10 text-xs font-bold text-slate-500">Còn lại</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

