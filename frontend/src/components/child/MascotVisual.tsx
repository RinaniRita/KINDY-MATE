"use client";

type MascotMood = "hello" | "focus" | "cheer" | "rest";

const moodCopy: Record<MascotMood, { mouth: string; bubble: string; badge: string }> = {
  hello: { mouth: "rounded-full border-b-4 border-slate-800", bubble: "Tớ ở đây cùng cậu.", badge: "☀️ Xin chào" },
  focus: { mouth: "rounded-full border-b-4 border-slate-800", bubble: "Mình làm từng bước nhé.", badge: "🌱 Bắt đầu" },
  cheer: { mouth: "rounded-full border-b-4 border-slate-800", bubble: "Cậu làm rất tốt rồi.", badge: "🎉 Giỏi lắm" },
  rest: { mouth: "rounded-full border-b-2 border-slate-500", bubble: "Nghỉ nhẹ một chút cũng ổn.", badge: "🌙 Nghỉ thôi" },
};

export function MascotVisual({
  mood = "hello",
  size = "md",
  message,
  compact = false,
}: {
  mood?: MascotMood;
  size?: "sm" | "md" | "lg";
  message?: string;
  compact?: boolean;
}) {
  const frameSize = size === "lg" ? "h-72 w-72 md:h-80 md:w-80" : size === "sm" ? "h-20 w-20" : "h-36 w-36";
  const faceSize = size === "lg" ? "rounded-[2.4rem]" : size === "sm" ? "rounded-[1rem]" : "rounded-[1.7rem]";
  const speech = message !== undefined ? message : moodCopy[mood].bubble;

  return (
    <div className={`flex ${compact ? "items-center gap-3" : "flex-col items-center gap-4"}`}>
      <div className={`relative ${frameSize} ${compact ? "" : "animate-float"} rounded-[2.4rem] bg-gradient-to-br from-[#99d8c2] via-[#8fcdf4] to-[#ffe39a] p-3 shadow-[0_32px_72px_rgba(127,159,180,0.24)]`}>
        <div className={`relative flex h-full w-full items-center justify-center overflow-hidden border border-white/70 bg-[#fffdf7] ${faceSize}`}>
          <div className="absolute left-5 top-6 h-10 w-14 rounded-full bg-white/75 blur-md" />
          <div className="absolute right-6 top-12 h-7 w-12 rounded-full bg-[#fff1bf]/75 blur-[2px]" />
          <div className="absolute bottom-5 left-8 h-12 w-16 rounded-full bg-[#dff6ee]/75 blur-md" />
          <div className="absolute right-7 top-5 text-xl">✨</div>
          <div className="absolute left-6 top-12 text-lg">⭐</div>

          <div className="absolute -left-1 top-[34%] h-12 w-7 rounded-l-full border-l-2 border-[#84c9b2] bg-[#dff6ee]" />
          <div className="absolute -right-1 top-[34%] h-12 w-7 rounded-r-full border-r-2 border-[#84c9b2] bg-[#dff6ee]" />

          <div className="absolute bottom-0 h-16 w-28 rounded-t-[2rem] bg-[#dff0ff]" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-3 flex gap-7">
              <div className="relative h-4 w-4 rounded-full bg-slate-800">
                <div className="absolute left-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-white" />
              </div>
              <div className="relative h-4 w-4 rounded-full bg-slate-800">
                <div className="absolute left-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-white" />
              </div>
            </div>
            <div className={`h-4 w-10 ${moodCopy[mood].mouth}`} />
            <div className="mt-3 flex gap-8 opacity-70">
              <div className="h-3 w-5 rounded-full bg-rose-200/80 blur-[0.2px]" />
              <div className="h-3 w-5 rounded-full bg-rose-200/80 blur-[0.2px]" />
            </div>
          </div>

          <div className="absolute top-3 rounded-full bg-white/86 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 shadow-sm">
            Milo
          </div>
        </div>

        {!compact ? (
          <div className="absolute -bottom-2 left-1/2 h-7 w-40 -translate-x-1/2 rounded-full bg-white/50 blur-xl" />
        ) : null}
      </div>

      {!compact ? (
        <div className="child-mini-badge bg-white/88">
          <span>{moodCopy[mood].badge}</span>
        </div>
      ) : null}

      {speech ? (
        <div className={`${compact ? "max-w-[180px]" : "max-w-md"} child-island-card rounded-[1.6rem] px-4 py-3 text-center`}>
          <p className="relative z-10 text-sm font-black leading-6 text-slate-700">{speech}</p>
        </div>
      ) : null}
    </div>
  );
}
