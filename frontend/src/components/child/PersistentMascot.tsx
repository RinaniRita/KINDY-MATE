"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { MascotVisual } from "./MascotVisual";

const STORAGE_KEY = "kindy_mate_mascot_position";
const MASCOT_WIDTH = 124;
const MASCOT_HEIGHT = 124;
const SAFE_MARGIN = 16;

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

export function PersistentMascot({ childId }: { childId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [position, setPosition] = useState<Position>({ x: SAFE_MARGIN, y: 128 });
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const pointerOffset = useRef({ x: 0, y: 0 });
  const movedDistance = useRef(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPosition(readPosition(childId));
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [childId]);

  useEffect(() => {
    function handleResize() {
      setPosition((current) => {
        const next = clampPosition(current);
        savePosition(childId, next);
        return next;
      });
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [childId]);

  if (!ready || pathname?.includes("/mascot") || pathname?.includes("/milo") || pathname?.endsWith("/home")) return null;

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    movedDistance.current = 0;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging) return;
    setPosition((current) => {
      const next = clampPosition({
        x: event.clientX - pointerOffset.current.x,
        y: event.clientY - pointerOffset.current.y,
      });
      movedDistance.current += Math.abs(next.x - current.x) + Math.abs(next.y - current.y);
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
      style={{ left: `${position.x}px`, top: `${position.y}px`, width: `${MASCOT_WIDTH}px` }}
      className="fixed z-20 cursor-grab touch-none rounded-[1.4rem] bg-transparent p-0 text-left active:cursor-grabbing"
    >
      <div className={dragging ? "" : "animate-float-slow"}>
        <MascotVisual compact mood="hello" size="sm" message="" />
      </div>
    </button>
  );
}
