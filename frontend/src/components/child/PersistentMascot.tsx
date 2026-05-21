"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { MascotVisual, type MascotMood } from "./MascotVisual";

const STORAGE_KEY = "kindy_mate_mascot_position";
const MASCOT_WIDTH = 132;
const MASCOT_HEIGHT = 148;
const SAFE_MARGIN = 16;
const GREETING_DURATION_MS = 3500;
const IDLE_TIMEOUT_MS = 40_000;
const NUDGE_DURATION_MS = 5_000;

type Position = { x: number; y: number };

function clampPosition(position: Position) {
  if (typeof window === "undefined") return position;
  const maxX = Math.max(window.innerWidth - MASCOT_WIDTH - SAFE_MARGIN, SAFE_MARGIN);
  const maxY = Math.max(window.innerHeight - MASCOT_HEIGHT - SAFE_MARGIN, 112);
  return {
    x: Math.min(Math.max(position.x, SAFE_MARGIN), maxX),
    y: Math.min(Math.max(position.y, 112), maxY),
  };
}

function readPosition(childId: string) {
  if (typeof window === "undefined") return { x: SAFE_MARGIN, y: 128 };
  const raw = window.localStorage.getItem(`${STORAGE_KEY}_${childId}`);
  if (!raw) {
    return clampPosition({
      x: window.innerWidth - MASCOT_WIDTH - SAFE_MARGIN,
      y: Math.min(window.innerHeight - MASCOT_HEIGHT - 48, 220),
    });
  }
  try {
    return clampPosition(JSON.parse(raw) as Position);
  } catch {
    return clampPosition({ x: SAFE_MARGIN, y: 128 });
  }
}

function savePosition(childId: string, position: Position) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${STORAGE_KEY}_${childId}`, JSON.stringify(position));
}

/* ─── Route → mood mapping ───────────────────────────────── */
type RouteState = { mood: MascotMood; speech: string };

function routeToState(pathname: string | null): RouteState {
  if (!pathname) return { mood: "hello", speech: "" };
  if (pathname.includes("/study"))      return { mood: "focus",   speech: "Cùng học thật chăm nào! 📚" };
  if (pathname.includes("/watch"))      return { mood: "hello",   speech: "Nhớ xem vừa phải thôi nhé! 🎬" };
  if (pathname.includes("/move"))       return { mood: "cheer",   speech: "Cậu vận động giỏi lắm! 🤸" };
  if (pathname.includes("/create"))     return { mood: "surprise",speech: "Ôi sáng tạo quá! 🎨" };
  if (pathname.includes("/missions/"))  return { mood: "focus",   speech: "Nhiệm vụ mới đang đợi cậu! ⭐" };
  if (pathname.includes("/missions"))   return { mood: "focus",   speech: "Chọn nhiệm vụ nào! 🌟" };
  if (pathname.includes("/rewards"))    return { mood: "victory", speech: "Phần thưởng đây! Giỏi lắm! 🎉" };
  return { mood: "hello", speech: "" };
}

/* ─── Component ──────────────────────────────────────────── */
export function PersistentMascot({ childId }: { childId: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const [position, setPosition] = useState<Position>({ x: SAFE_MARGIN, y: 128 });
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);

  const [activeMood, setActiveMood] = useState<MascotMood>("hello");
  const [activeSpeech, setActiveSpeech] = useState("");

  const pointerOffset = useRef({ x: 0, y: 0 });
  const movedDistance = useRef(0);
  const greetingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nudgeReturnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Init position ── */
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPosition(readPosition(childId));
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [childId]);

  /* ── Clamp on resize ── */
  useEffect(() => {
    function handleResize() {
      setPosition((cur) => {
        const next = clampPosition(cur);
        savePosition(childId, next);
        return next;
      });
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [childId]);

  /* ── Route-change greeting ── */
  useEffect(() => {
    const { mood, speech } = routeToState(pathname);
    // Clear any existing greeting timer
    if (greetingTimer.current) clearTimeout(greetingTimer.current);
    setActiveMood(mood);
    setActiveSpeech(speech);
    // After GREETING_DURATION_MS, clear the speech but keep the mood
    if (speech) {
      greetingTimer.current = setTimeout(() => {
        setActiveSpeech("");
      }, GREETING_DURATION_MS);
    }
    return () => {
      if (greetingTimer.current) clearTimeout(greetingTimer.current);
    };
  }, [pathname]);

  /* ── Idle nudge ── */
  useEffect(() => {
    function resetIdle() {
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
      if (nudgeReturnTimer.current) clearTimeout(nudgeReturnTimer.current);

      nudgeTimer.current = setTimeout(() => {
        // Nudge: wave + speech
        setActiveMood("wave");
        setActiveSpeech("Cậu ơi, tớ đang ở đây! 😄");

        nudgeReturnTimer.current = setTimeout(() => {
          // Return to route mood, clear speech
          const { mood } = routeToState(pathname);
          setActiveMood(mood);
          setActiveSpeech("");
        }, NUDGE_DURATION_MS);
      }, IDLE_TIMEOUT_MS);
    }

    resetIdle();
    window.addEventListener("pointermove", resetIdle);
    window.addEventListener("pointerdown", resetIdle);
    window.addEventListener("keydown", resetIdle);

    return () => {
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
      if (nudgeReturnTimer.current) clearTimeout(nudgeReturnTimer.current);
      window.removeEventListener("pointermove", resetIdle);
      window.removeEventListener("pointerdown", resetIdle);
      window.removeEventListener("keydown", resetIdle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* ── Hide on certain routes ── */
  if (
    !ready ||
    pathname?.includes("/mascot") ||
    pathname?.includes("/milo") ||
    pathname?.endsWith("/home")
  ) return null;

  /* ── Drag handlers ── */
  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerOffset.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    movedDistance.current = 0;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging) return;
    setPosition((cur) => {
      const next = clampPosition({
        x: event.clientX - pointerOffset.current.x,
        y: event.clientY - pointerOffset.current.y,
      });
      movedDistance.current += Math.abs(next.x - cur.x) + Math.abs(next.y - cur.y);
      return next;
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    const next = clampPosition(position);
    setPosition(next);
    savePosition(childId, next);
    const wasClick = movedDistance.current < 10;
    movedDistance.current = 0;
    setDragging(false);
    if (wasClick) router.push(`/child/${childId}/milo`);
  }

  function handlePointerCancel() {
    setDragging(false);
    movedDistance.current = 0;
  }

  return (
    <button
      type="button"
      aria-label="Mở khu tùy chỉnh Milo"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerCancel={handlePointerCancel}
      onPointerUp={handlePointerUp}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${MASCOT_WIDTH}px`,
      }}
      className="fixed z-20 cursor-grab touch-none rounded-[1.4rem] bg-transparent p-0 text-left active:cursor-grabbing"
    >
      <MascotVisual
        compact
        mood={activeMood}
        size="sm"
        message={activeSpeech}
      />
    </button>
  );
}
