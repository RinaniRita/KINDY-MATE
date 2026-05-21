"use client";

import { useEffect, useState } from "react";

export type MascotMood =
  | "hello" | "focus" | "cheer" | "rest"
  | "wave"  | "surprise" | "sleep" | "victory";

type MouthType = "smile" | "wide-smile" | "o-shape" | "flat" | "tiny-smile";
type EyeStyle  = "normal" | "squint" | "wide" | "closed" | "star" | "wink";

interface MoodConfig {
  eyeStyle:  EyeStyle;
  mouthType: MouthType;
  badge:     string;
  bubble:    string;
  stars?:    boolean;
}

const MOODS: Record<MascotMood, MoodConfig> = {
  hello:   { eyeStyle:"normal",  mouthType:"smile",      badge:"☀️ Xin chào",  bubble:"Tớ ở đây cùng cậu! 👋" },
  focus:   { eyeStyle:"squint",  mouthType:"tiny-smile", badge:"🌱 Tập trung", bubble:"Mình làm từng bước nhé! 📚" },
  cheer:   { eyeStyle:"wide",    mouthType:"wide-smile", badge:"🎉 Giỏi lắm",  bubble:"Cậu làm rất tốt rồi! 🌟", stars:true },
  rest:    { eyeStyle:"squint",  mouthType:"tiny-smile", badge:"🌙 Nghỉ thôi", bubble:"Nghỉ nhẹ một chút cũng ổn. 😴" },
  wave:    { eyeStyle:"wink",    mouthType:"wide-smile", badge:"👋 Ơ kìa",     bubble:"Cậu ơi, tớ đang ở đây! 😄" },
  surprise:{ eyeStyle:"wide",    mouthType:"o-shape",    badge:"😮 Ồ kìa",     bubble:"Ồ!! Hay quá!! 🎨" },
  sleep:   { eyeStyle:"closed",  mouthType:"flat",       badge:"💤 Ngủ rồi",   bubble:"Zzz... 💤" },
  victory: { eyeStyle:"star",    mouthType:"wide-smile", badge:"🏆 Thắng rồi", bubble:"Phần thưởng đây! Giỏi lắm! 🎉", stars:true },
};

/* Cloud Palette */
const CLD      = "#FFFFFF"; /* cloud main */
const CLD_SHAD = "#E6E0D8"; /* cloud shading */
const EYE      = "#362A25"; /* dark brown eyes */
const CHEEK    = "#FFB6C1"; /* pink cheeks */
const STAR     = "#FFD54F"; /* glowing yellow star */

/* ── helpers ──────────────────────────────────────────────── */

function px(n: number, s: number) { return `${Math.round(n * s)}px`; }

function Star({ s, glowing }: { s: number; glowing?: boolean }) {
  const size = Math.round((glowing ? 36 : 28) * s);
  return (
    <div className={glowing ? "animate-bounce" : "animate-pulse"} style={{ 
      position: "absolute", 
      top: px(glowing ? -16 : -10, s), 
      left: "50%", 
      transform: "translateX(-50%)", 
      display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10,
      filter: glowing ? `drop-shadow(0 0 ${px(12, s)} ${STAR}) drop-shadow(0 0 ${px(24, s)} #FFAA00)` : `drop-shadow(0 0 ${px(4, s)} rgba(255, 213, 79, 0.5))`
    }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill={STAR}>
        <path d="M12 0 C12 10, 22 12, 22 12 C22 12, 12 14, 12 24 C12 14, 2 12, 2 12 C2 12, 12 10, 12 0 Z" />
      </svg>
      {/* Magical sparklers when glowing */}
      {glowing ? (
        <>
          <div style={{ position: "absolute", width: px(4, s), height: px(4, s), background: "#FFF", borderRadius: "50%", top: px(-6, s), left: px(-6, s), animation: "sparkle-float 1.5s infinite" }} />
          <div style={{ position: "absolute", width: px(4, s), height: px(4, s), background: "#FFF", borderRadius: "50%", top: px(-6, s), right: px(-6, s), animation: "sparkle-float 1.2s infinite .3s" }} />
          <div style={{ position: "absolute", width: px(4, s), height: px(4, s), background: "#FFF", borderRadius: "50%", bottom: px(-6, s), right: px(-6, s), animation: "sparkle-float 1.4s infinite .5s" }} />
          <div style={{ position: "absolute", width: px(4, s), height: px(4, s), background: "#FFF", borderRadius: "50%", bottom: px(-6, s), left: px(-6, s), animation: "sparkle-float 1.6s infinite .2s" }} />
        </>
      ) : (
        <>
          {/* Tiny light rays */}
          <div style={{ position: "absolute", width: px(3, s), height: px(3, s), background: STAR, borderRadius: "50%", top: 0, left: px(-2, s) }} />
          <div style={{ position: "absolute", width: px(3, s), height: px(3, s), background: STAR, borderRadius: "50%", top: 0, right: px(-2, s) }} />
        </>
      )}
    </div>
  );
}

function CloudShape({ s }: { s: number }) {
  // A fluffy blob made of multiple overlapping rounded elements, proportioned wide and balanced
  return (
    <div style={{ position: "absolute", inset: 0, filter: `drop-shadow(0 ${px(8,s)} ${px(6,s)} rgba(190, 180, 170, 0.15))` }}>
      {/* Base rounded pill */}
      <div style={{ position: "absolute", bottom: px(4, s), left: "50%", transform: "translateX(-50%)", width: px(120, s), height: px(64, s), background: CLD, borderRadius: px(32, s), boxShadow: `inset 0 ${px(-6,s)} ${px(10,s)} ${CLD_SHAD}` }} />
      {/* Top medium bump (shorter to look more balanced and less tall) */}
      <div style={{ position: "absolute", bottom: px(32, s), left: "50%", transform: "translateX(-50%)", width: px(76, s), height: px(56, s), background: CLD, borderRadius: "50%", boxShadow: `inset 0 ${px(4,s)} ${px(8,s)} rgba(255,255,255,0.8)` }} />
      {/* Left medium bump */}
      <div style={{ position: "absolute", bottom: px(14, s), left: px(12, s), width: px(56, s), height: px(56, s), background: CLD, borderRadius: "50%" }} />
      {/* Right medium bump */}
      <div style={{ position: "absolute", bottom: px(18, s), right: px(12, s), width: px(60, s), height: px(60, s), background: CLD, borderRadius: "50%" }} />
      
      {/* Extra smooth covers to hide inner seams of the box-shadows */}
      <div style={{ position: "absolute", bottom: px(28, s), left: "50%", transform: "translateX(-50%)", width: px(66, s), height: px(30, s), background: CLD, zIndex: 1 }} />
      <div style={{ position: "absolute", bottom: px(18, s), left: px(28, s), width: px(40, s), height: px(40, s), background: CLD, zIndex: 1 }} />
      <div style={{ position: "absolute", bottom: px(18, s), right: px(28, s), width: px(40, s), height: px(40, s), background: CLD, zIndex: 1 }} />
    </div>
  );
}

function Arm({ side, s }: { side: "left" | "right"; s: number }) {
  // Detached floating spherical hands
  const isLeft = side === "left";
  return (
    <div style={{
      position: "absolute",
      bottom: px(24, s),
      [isLeft ? "left" : "right"]: px(-18, s),
      width: px(24, s),
      height: px(24, s),
      background: CLD,
      borderRadius: "50%",
      boxShadow: `inset 0 ${px(-3,s)} ${px(6,s)} ${CLD_SHAD}, 0 ${px(4,s)} ${px(6,s)} rgba(190, 180, 170, 0.2)`,
      animation: `float-slow ${isLeft ? "3.2s" : "2.9s"} ease-in-out infinite`,
      zIndex: 5
    }} />
  );
}

function CloudEye({ style, blinking, s }: { style: EyeStyle; blinking: boolean; s: number }) {
  const closed = style === "closed" || blinking;
  
  if (closed) {
    return (
      <div style={{
        width: px(14, s), height: px(4, s),
        background: EYE, borderRadius: "4px",
        flexShrink: 0, marginTop: px(8, s)
      }} />
    );
  }
  
  if (style === "squint") {
    return (
      <svg width={px(16, s)} height={px(10, s)} viewBox="0 0 16 10" style={{ flexShrink: 0 }}>
        <path d="M2,8 Q8,2 14,8" stroke={EYE} strokeWidth={3} fill="none" strokeLinecap="round" />
      </svg>
    );
  }

  if (style === "star") {
    return <div style={{ fontSize: px(16, s), lineHeight: 1 }}>⭐</div>;
  }

  // Normal / Wide / Wink (wink handled by passing 'closed' to one eye)
  const size = style === "wide" ? 18 : 14;
  return (
    <div style={{
      width: px(size, s), height: px(size, s),
      background: EYE, borderRadius: "50%",
      position: "relative", flexShrink: 0
    }}>
      <div style={{
        position: "absolute", top: px(2, s), right: px(3, s),
        width: px(size * 0.35, s), height: px(size * 0.35, s),
        background: "#fff", borderRadius: "50%"
      }} />
    </div>
  );
}

function CloudMouth({ type, s }: { type: MouthType; s: number }) {
  if (type === "flat") {
    return <div style={{ width: px(12, s), height: px(3, s), background: EYE, borderRadius: "4px", opacity: 0.8 }} />;
  }
  if (type === "o-shape") {
    return <div style={{ width: px(12, s), height: px(14, s), background: EYE, borderRadius: "50%" }} />;
  }
  if (type === "tiny-smile") {
    return (
      <svg width={px(14, s)} height={px(8, s)} viewBox="0 0 14 8" style={{ flexShrink: 0 }}>
        <path d="M2,2 Q7,8 12,2" stroke={EYE} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  
  // smile / wide-smile (open mouth)
  const isWide = type === "wide-smile";
  const w = isWide ? 22 : 16;
  const h = isWide ? 14 : 10;
  
  return (
    <div style={{
      width: px(w, s), height: px(h, s),
      background: EYE,
      borderRadius: `2px 2px ${px(w, s)} ${px(w, s)}`,
      position: "relative", overflow: "hidden"
    }}>
      {/* Little tongue */}
      <div style={{
        position: "absolute", bottom: px(-2, s), left: "50%", transform: "translateX(-50%)",
        width: px(w * 0.8, s), height: px(h * 0.6, s),
        background: "#FF7878", borderRadius: "50%"
      }} />
    </div>
  );
}

/* ── Main export ───────────────────────────────────────────── */

export function MascotVisual({
  mood = "hello", size = "md", message, compact = false,
}: {
  mood?:    MascotMood;
  size?:    "sm" | "md" | "lg";
  message?: string;
  compact?: boolean;
}) {
  const [blinking, setBlinking] = useState(false);
  const cfg    = MOODS[mood];
  const speech = message !== undefined ? message : cfg.bubble;
  const s      = size === "lg" ? 1.45 : size === "md" ? 1.1 : 0.82;
  
  // Bounding box for the cloud
  const bW     = Math.round(140 * s);
  const bH     = Math.round(100 * s);
  const totalW = bW + Math.round(30 * s); // space for floating hands

  useEffect(() => {
    let tOuter: ReturnType<typeof setTimeout>;
    let tInner: ReturnType<typeof setTimeout>;
    let isMounted = true;
    const blink = () => {
      tOuter = setTimeout(() => {
        if (!isMounted) return;
        setBlinking(true);
        tInner = setTimeout(() => {
          if (!isMounted) return;
          setBlinking(false);
          blink();
        }, 140);
      }, 3000 + Math.random() * 4000);
    };
    blink();
    return () => {
      isMounted = false;
      clearTimeout(tOuter);
      clearTimeout(tInner);
    };
  }, []);

  const bodyAnim =
    mood === "victory" ? "animate-backflip" :
    mood === "wave"    ? "animate-mascot-wave" :
    compact            ? "animate-float-slow" : "animate-float";

  return (
    <div className={`flex ${compact ? "flex-row items-center gap-3" : "flex-col items-center gap-4"}`}>

      {/* Name badge */}
      {!compact && (
        <div style={{
          borderRadius: "999px", background: "#fff",
          padding: "4px 14px", fontSize: "11px", fontWeight: 900, color: "#64748B",
          letterSpacing: ".15em", textTransform: "uppercase", boxShadow: "0 3px 10px rgba(0,0,0,0.05)"
        }}>
          ☁️ Milo
        </div>
      )}

      {/* Body wrapper */}
      <div className={`relative ${bodyAnim}`} style={{ width: `${totalW}px`, height: `${bH + Math.round(20 * s)}px` }}>

        {/* Drop shadow on the ground */}
        <div style={{
          position: "absolute", bottom: px(-4, s), left: "50%", transform: "translateX(-50%)",
          width: px(76, s), height: px(12, s), background: "rgba(160,170,180,0.25)",
          borderRadius: "50%", filter: "blur(6px)"
        }} />

        <Star s={s} glowing={cfg.stars} />

        <div style={{ position: "absolute", left: "50%", top: px(16, s), transform: "translateX(-50%)", width: `${bW}px`, height: `${bH}px` }}>
          <CloudShape s={s} />
          
          <Arm side="left" s={s} />
          <Arm side="right" s={s} />

          {/* Face */}
          <div style={{
            position: "absolute", left: "50%", bottom: px(16, s), transform: "translateX(-50%)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: px(6, s), zIndex: 10
          }}>
            {/* Eyes */}
            <div style={{ display: "flex", gap: px(16, s), alignItems: "center" }}>
              <CloudEye style={cfg.eyeStyle} blinking={blinking} s={s} />
              <CloudEye style={cfg.eyeStyle === "wink" ? "closed" : cfg.eyeStyle}
                   blinking={cfg.eyeStyle !== "wink" && blinking} s={s} />
            </div>

            {/* Mouth */}
            <CloudMouth type={cfg.mouthType} s={s} />

            {/* Cheeks */}
            <div style={{
              position: "absolute", top: px(14, s), left: px(-14, s),
              width: px(16, s), height: px(10, s), background: CHEEK, borderRadius: "50%", opacity: 0.8, filter: "blur(2px)"
            }} />
            <div style={{
              position: "absolute", top: px(14, s), right: px(-14, s),
              width: px(16, s), height: px(10, s), background: CHEEK, borderRadius: "50%", opacity: 0.8, filter: "blur(2px)"
            }} />
          </div>
        </div>

        {/* Sparkles */}
        {cfg.stars && <div style={{ position: "absolute", bottom: px(10, s), right: px(6, s), fontSize: px(12, s), animation: "sparkle-float 2.3s ease-in-out .3s infinite", zIndex: 20 }}>🌟</div>}

        {/* Compact: tiny label */}
        {compact && (
          <div style={{
            position: "absolute", bottom: px(-10, s), left: "50%", transform: "translateX(-50%)",
            background: "rgba(255,255,255,.92)", borderRadius: "999px", padding: "1px 8px",
            fontSize: "8px", fontWeight: 900, color: "#64748B", whiteSpace: "nowrap",
            letterSpacing: ".1em", boxShadow: "0 2px 8px rgba(0,0,0,.05)"
          }}>
            Milo
          </div>
        )}
      </div>

      {/* Full-mode: mood badge */}
      {!compact && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          borderRadius: "999px", background: "#fff",
          padding: "6px 14px", fontSize: "12px", fontWeight: 800, color: "#64748B",
          boxShadow: "0 3px 10px rgba(0,0,0,0.05)"
        }}>
          {cfg.badge}
        </div>
      )}

      {/* Full-mode: speech bubble */}
      {speech && !compact && (
        <div className="child-island-card max-w-md rounded-[1.6rem] px-4 py-3 text-center">
          <p className="relative z-10 text-sm font-black leading-6 text-slate-700">{speech}</p>
        </div>
      )}

      {/* Compact: tooltip bubble */}
      {speech && compact && (
        <div className="animate-pop-in" style={{
          background: "rgba(255,255,255,.96)",
          borderRadius: "16px 16px 16px 5px",
          padding: "8px 12px", maxWidth: "160px",
          fontSize: "12px", fontWeight: 800, color: "#334155",
          lineHeight: 1.45, boxShadow: "0 10px 24px rgba(0,0,0,.08)",
        }}>
          {speech}
        </div>
      )}
    </div>
  );
}
