"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { apiGetRequired } from "@/lib/api";

import { MascotVisual } from "./MascotVisual";
import { hubHotspots, hubSpeechByZone, type HubHotspot } from "./hubConfig";
import type { ChildDashboardData, ChildProfileData, MissionData } from "./types";

const HUB_MASCOT_KEY = "kindy_mate_hub_mascot";
const DEFAULT_MASCOT_POSITION = { left: 54, top: 63 };
const MASCOT_NEAR_DISTANCE = 18;

function pickQuickMission(missions: MissionData[]) {
  return missions.find((mission) => mission.display_category === "hoc_hanh")
    || missions.find((mission) => mission.display_category === "doc_sach")
    || missions.find((mission) => mission.display_category === "van_dong")
    || missions.find((mission) => mission.display_category === "sang_tao")
    || missions[0]
    || null;
}

function buildMiloLine(child: ChildProfileData, missions: MissionData[], dashboard: ChildDashboardData | null) {
  const quick = pickQuickMission(missions);
  if ((dashboard?.metrics.cap_left_today ?? 0) <= 0) return `Hôm nay mình ở lại với một việc nhẹ thôi nhé, ${child.nickname}.`;
  if (quick?.display_category === "hoc_hanh") return "Tớ nghĩ cậu nên ghé bàn học trước.";
  if (quick?.display_category === "van_dong") return "Nếu muốn tỉnh táo hơn, mình ra thảm tập nhé.";
  if (quick?.display_category === "sang_tao") return "Góc vẽ đang chờ cậu đó.";
  return `Chào ${child.nickname}, chạm vào một góc trong phòng để bắt đầu.`;
}

function readMascotPosition(childId: string) {
  if (typeof window === "undefined") return DEFAULT_MASCOT_POSITION;
  const raw = window.localStorage.getItem(`${HUB_MASCOT_KEY}_${childId}`);
  if (!raw) return DEFAULT_MASCOT_POSITION;
  try {
    return JSON.parse(raw) as { left: number; top: number };
  } catch {
    return DEFAULT_MASCOT_POSITION;
  }
}

function saveMascotPosition(childId: string, position: { left: number; top: number }) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${HUB_MASCOT_KEY}_${childId}`, JSON.stringify(position));
}

function findNearestHotspot(position: { left: number; top: number }, spots: HubHotspot[]): HubHotspot | null {
  let best: HubHotspot | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  spots.forEach((spot) => {
    const dx = spot.left - position.left;
    const dy = spot.top - position.top;
    const distance = Math.sqrt((dx * dx) + (dy * dy));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = spot;
    }
  });

  return bestDistance <= MASCOT_NEAR_DISTANCE ? best : null;
}

export function ChildHome({ childId }: { childId: string }) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pointerOffset = useRef({ x: 0, y: 0 });
  const movedDistance = useRef(0);

  const [child, setChild] = useState<ChildProfileData | null>(null);
  const [dashboard, setDashboard] = useState<ChildDashboardData | null>(null);
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [mascotPosition, setMascotPosition] = useState(() => readMascotPosition(childId));

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

  const miloLine = useMemo(() => (
    child ? buildMiloLine(child, missions, dashboard) : ""
  ), [child, missions, dashboard]);

  const nearbyZone = useMemo(
    () => findNearestHotspot(mascotPosition, hubHotspots.filter((spot) => spot.key !== "milo")),
    [mascotPosition],
  );

  const mascotSpeech = nearbyZone ? hubSpeechByZone[nearbyZone.key] : miloLine;

  function clampPosition(nextLeft: number, nextTop: number) {
    return {
      left: Math.min(Math.max(nextLeft, 10), 90),
      top: Math.min(Math.max(nextTop, 14), 86),
    };
  }

  function updateFromPointer(clientX: number, clientY: number) {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const nextLeft = ((clientX - rect.left - pointerOffset.current.x) / rect.width) * 100;
    const nextTop = ((clientY - rect.top - pointerOffset.current.y) / rect.height) * 100;
    setMascotPosition((current) => {
      const next = clampPosition(nextLeft, nextTop);
      movedDistance.current += Math.abs(next.left - current.left) + Math.abs(next.top - current.top);
      return next;
    });
  }

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
    updateFromPointer(event.clientX, event.clientY);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    const next = clampPosition(mascotPosition.left, mascotPosition.top);
    setDragging(false);
    setMascotPosition(next);
    saveMascotPosition(childId, next);
    const wasClick = movedDistance.current < 4;
    movedDistance.current = 0;
    if (wasClick) {
      router.push(`/child/${childId}/milo`);
    }
  }

  function handlePointerCancel() {
    setDragging(false);
    movedDistance.current = 0;
  }

  if (loading || !child) {
    return (
      <div className="child-scene-shell min-h-screen rounded-none px-6 py-20 text-center">
        <p className="relative z-10 text-sm font-black text-slate-500">Milo đang mở căn phòng của cậu...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <section className="absolute left-0 right-0 top-0 z-20 px-4 py-4 md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl justify-end">
          <div className="flex flex-wrap gap-2">
            <span className="child-mini-badge">⭐ {dashboard?.wallet.points_balance ?? child.wallet_balance} điểm</span>
            <span className="child-mini-badge">⏱️ {dashboard?.metrics.cap_left_today ?? 0} phút còn lại</span>
            <span className="child-mini-badge">🌼 {dashboard?.metrics.mission_completion_count ?? 0} việc xong</span>
          </div>
        </div>
      </section>

      <section ref={stageRef} className="relative min-h-screen">
        <Image
          src="/child-hub/background.png"
          alt="Phòng chơi của Milo"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-white/12 via-transparent to-white/8" />

        {hubHotspots.filter((spot) => spot.key !== "milo").map((spot) => (
          <Link
            key={spot.key}
            href={`/child/${childId}/${spot.hrefKey}`}
            className="hub-hotspot z-10"
            style={{ left: `${spot.left}%`, top: `${spot.top}%` }}
          >
            <span className="hub-hotspot-core">
              <span className="hub-hotspot-ring" />
              <span className="text-3xl">{spot.icon}</span>
            </span>
            <span className="hub-hotspot-label">{spot.title}</span>
          </Link>
        ))}

        <button
          type="button"
          aria-label="Mở Milo"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2 touch-none bg-transparent"
          style={{ left: `${mascotPosition.left}%`, top: `${mascotPosition.top}%` }}
        >
          <div className={`relative ${dragging ? "" : "animate-float-slow"}`}>
            <div className="absolute left-1/2 top-[-3.8rem] w-[220px] -translate-x-1/2 rounded-[1.4rem] border border-white/80 bg-[#fff7ea]/88 px-4 py-3 text-center text-sm font-black leading-6 text-slate-700 shadow-[0_18px_30px_rgba(145,163,179,0.18)] backdrop-blur-md">
              {mascotSpeech}
            </div>
            <div className="absolute inset-x-8 bottom-3 h-12 rounded-full bg-white/55 blur-xl" />
            <div className="relative scale-[0.8] md:scale-[0.92]">
              <MascotVisual mood="hello" size="md" message="" />
            </div>
            <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 rounded-full border border-white/80 bg-white/86 px-3 py-1 text-xs font-black text-slate-700 shadow-sm">
              Milo
            </div>
          </div>
        </button>

        <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 flex-wrap justify-center gap-2 px-4 md:bottom-6">
          {hubHotspots.map((spot) => (
            <span key={spot.key} className="child-mini-badge">
              <span>{spot.icon}</span>
              <span>{spot.title}</span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
