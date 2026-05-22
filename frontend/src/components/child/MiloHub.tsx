"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";

import { apiGetRequired, apiStream } from "@/lib/api";

import { MascotVisual, type MascotMood } from "./MascotVisual";
import type { ChildDashboardData, ChildProfileData, MissionData } from "./types";

type MiloPrompt = "start" | "rest" | "points";

const promptMeta: Record<
  MiloPrompt,
  { label: string; reply: string; ctaLabel: string; ctaHref: (childId: string) => string }
> = {
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
  const creative = missions.find((m) => m.display_category === "sang_tao");
  if (creative) return `Tớ đang nghĩ tới "${creative.title}".`;
  const study = missions.find((m) => m.display_category === "hoc_hanh");
  if (study) return `Bàn học đang có "${study.title}" cho cậu.`;
  return "Cậu có thể chạm vào một góc trong phòng để bắt đầu.";
}

/** Derive a human-readable screen context string from a pathname */
function pathnameToContext(pathname: string | null): string {
  if (!pathname) return "";
  if (pathname.includes("/study"))    return "bàn học (khu học tập)";
  if (pathname.includes("/watch"))    return "khu xem video";
  if (pathname.includes("/move"))     return "thảm tập vận động";
  if (pathname.includes("/create"))   return "góc sáng tạo";
  if (pathname.includes("/rewards"))  return "kho phần thưởng";
  if (pathname.includes("/missions")) return "khu nhiệm vụ";
  if (pathname.includes("/milo"))     return "trang trò chuyện với Milo";
  return "";
}

/** Guess a happy/neutral mood from Milo's reply text */
function replyToMood(text: string): MascotMood {
  const lower = text.toLowerCase();
  if (/🎉|🏆|giỏi|tuyệt|xuất sắc|thắng|hoàn thành/.test(lower)) return "cheer";
  if (/😴|nghỉ|ngủ|mệt/.test(lower))                              return "rest";
  if (/😮|ồ|wow|hay quá/.test(lower))                             return "surprise";
  return "hello";
}

export function MiloHub({ childId }: { childId: string }) {
  const pathname = usePathname();

  const [child, setChild]         = useState<ChildProfileData | null>(null);
  const [dashboard, setDashboard] = useState<ChildDashboardData | null>(null);
  const [missions, setMissions]   = useState<MissionData[]>([]);
  const [loading, setLoading]     = useState(true);

  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: "Xin chào! Tớ là Milo đây. Hôm nay cậu muốn trò chuyện hay học tập điều gì nào? 🐱✨" },
  ]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending]     = useState(false);
  const [miloMood, setMiloMood]   = useState<MascotMood>("hello");
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const streamingIndexRef = useRef<number>(-1);
  
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages, sending, interimTranscript]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "vi-VN";
        
        recognition.onresult = (event: any) => {
          let currentInterim = "";
          let finalTrans = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTrans += event.results[i][0].transcript;
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }
          if (finalTrans) {
            setInputText((prev) => prev + finalTrans + " ");
          }
          setInterimTranscript(currentInterim);
        };
        
        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const playNextAudio = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;
    const base64Audio = audioQueueRef.current.shift()!;
    const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
    audio.onended = () => {
      isPlayingRef.current = false;
      playNextAudio();
    };
    audio.play().catch((err) => {
      console.error("Audio playback failed:", err);
      isPlayingRef.current = false;
      playNextAudio();
    });
  }, []);

  const suggestion = useMemo(() => chooseSuggestion(missions, dashboard), [missions, dashboard]);

  async function handleSendText(text: string) {
    if (!text.trim() || sending) return;

    const userMsg = { role: "user" as const, content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setSending(true);
    setMiloMood("focus"); // thinking face while waiting

    const screenContext = pathnameToContext(pathname);

    // Add an empty assistant placeholder for streaming
    setMessages((prev) => {
      streamingIndexRef.current = prev.length; // index of the placeholder
      return [...prev, { role: "assistant", content: "" }];
    });

    try {
      let accumulated = "";

      await apiStream(
        "/milo/chat/stream/",
        {
          child_id: childId,
          message: text,
          history: messages.slice(-6),
          screen_context: screenContext,
        },
        // onChunk — append text to the streaming placeholder
        (chunk: string) => {
          accumulated += chunk;
          setMessages((prev) => {
            const next = [...prev];
            const idx = streamingIndexRef.current;
            if (idx >= 0 && next[idx]) {
              next[idx] = { role: "assistant", content: accumulated };
            }
            return next;
          });
        },
        // onDone — finalize mood
        () => {
          setMiloMood(replyToMood(accumulated));
          setSending(false);
          streamingIndexRef.current = -1;
        },
        // onAudio — queue playback
        (base64Audio: string) => {
          audioQueueRef.current.push(base64Audio);
          playNextAudio();
        }
      );
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        const idx = streamingIndexRef.current;
        if (idx >= 0 && next[idx]) {
          next[idx] = { role: "assistant", content: "Milo đang bận một chút rồi, bé đợi tớ tí xíu nha! 🐱❤️" };
        }
        return next;
      });
      setMiloMood("rest");
      setSending(false);
      streamingIndexRef.current = -1;
    }
  }

  function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (inputText.trim()) {
      handleSendText(inputText);
      setInterimTranscript("");
    }
  }

  const startListening = () => {
    if (recognitionRef.current && !sending) {
      setInputText("");
      setInterimTranscript("");
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
      // We rely on the final text state, but if we have interim we can also use it
      setTimeout(() => {
        handleSendMessage();
      }, 500); // give it a moment to process final results
    }
  };

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
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-800 sm:text-5xl">
              Tớ ở đây để đi cùng cậu.
            </h1>
            <p className="mt-4 max-w-xl text-base font-bold leading-8 text-slate-600">{suggestion}</p>
          </div>

          <div className="child-stage-board rounded-[2.1rem] px-5 py-6">
            <div className="relative z-10 flex justify-center">
              <MascotVisual
                mood={miloMood}
                size="lg"
                message={sending ? "Milo đang suy nghĩ... 🐱" : "Nhắn tin cho tớ nhé! Tớ sẽ trả lời ngay."}
              />
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
                    {msg.content || (
                      /* streaming cursor blink while content is empty */
                      <span className="inline-block h-4 w-2 animate-pulse rounded bg-slate-400/60" />
                    )}
                  </div>
                ))}

                {/* Thinking dots only before first chunk arrives */}
                {sending && messages[messages.length - 1]?.content === "" && (
                  <div className="max-w-[88%] rounded-[1.9rem] bg-gradient-to-r from-[#dff6ee] to-[#dff0ff] px-5 py-4 text-sm font-bold text-slate-500 shadow-sm flex items-center gap-2">
                    <span>🐱 Milo đang nghĩ...</span>
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                    </span>
                  </div>
                )}
                
                {/* Real-time speech transcription preview */}
                {isListening && (inputText || interimTranscript) && (
                  <div className="max-w-[85%] ml-auto rounded-[1.7rem] border border-emerald-300 bg-emerald-50/80 px-4 py-3 text-sm leading-relaxed shadow-sm font-semibold text-slate-700 opacity-80">
                    {inputText} <span className="text-emerald-500">{interimTranscript}</span>
                    <span className="inline-block ml-1 h-3 w-1.5 animate-pulse rounded bg-emerald-400" />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100/50 pt-5 flex flex-col items-center">
              <button
                type="button"
                onMouseDown={startListening}
                onMouseUp={stopListening}
                onMouseLeave={stopListening}
                onTouchStart={startListening}
                onTouchEnd={stopListening}
                disabled={sending}
                className={`group relative flex h-20 w-full max-w-[280px] items-center justify-center rounded-[2rem] font-black shadow-lg transition-all duration-300 select-none ${
                  sending
                    ? "bg-slate-200 text-slate-400 opacity-70"
                    : isListening
                    ? "bg-emerald-400 text-white scale-[0.98] shadow-inner"
                    : "bg-gradient-to-r from-[#9dd9c6] to-[#bde6d9] text-slate-800 hover:shadow-xl hover:scale-[1.02]"
                }`}
              >
                {/* Glowing ring when listening */}
                {isListening && (
                  <span className="absolute -inset-2 animate-ping rounded-[2.2rem] bg-emerald-300 opacity-40"></span>
                )}
                <span className="relative z-10 flex items-center gap-3 text-lg">
                  {sending ? (
                    "Đang gửi..."
                  ) : isListening ? (
                    <>
                      <span className="animate-pulse">🔴</span> Đang nghe...
                    </>
                  ) : (
                    <>
                      🎤 Nhấn giữ để nói
                    </>
                  )}
                </span>
              </button>

              <div className="mt-4 flex gap-3">
                <Link
                  href={`/child/${childId}/mascot`}
                  className="rounded-[1.4rem] border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
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
                <p className="relative z-10 text-2xl font-black text-slate-800">
                  {dashboard?.wallet.points_balance ?? child.wallet_balance}
                </p>
                <p className="relative z-10 text-xs font-bold text-slate-500">Điểm</p>
              </div>
              <div className="child-island-card rounded-[1.6rem] px-4 py-4">
                <p className="relative z-10 text-2xl font-black text-slate-800">
                  {dashboard?.metrics.mission_completion_count ?? 0}
                </p>
                <p className="relative z-10 text-xs font-bold text-slate-500">Việc xong</p>
              </div>
              <div className="child-island-card rounded-[1.6rem] px-4 py-4">
                <p className="relative z-10 text-2xl font-black text-slate-800">
                  {dashboard?.metrics.cap_left_today ?? 0}p
                </p>
                <p className="relative z-10 text-xs font-bold text-slate-500">Còn lại</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
