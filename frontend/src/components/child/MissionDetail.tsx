"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiGetRequired, apiPost } from "@/lib/api";

import { MascotVisual } from "./MascotVisual";
import type { MissionData } from "./types";

type CompletionResponse = {
  wallet: {
    points_balance: number;
  };
};

function buildSteps(mission: MissionData) {
  if (mission.display_category === "doc_sach") {
    return ["Mở nội dung đọc.", "Đọc chậm từng đoạn.", "Bấm xong khi cậu đã đọc hết."];
  }
  if (mission.display_category === "van_dong") {
    return ["Đứng ở chỗ an toàn.", "Làm theo động tác nhẹ.", "Bấm xong khi cậu hoàn thành."];
  }
  if (mission.display_category === "ky_nang_song") {
    return ["Nhìn việc nhỏ cần làm.", "Làm gọn từng bước.", "Bấm xong khi cậu đã hoàn tất."];
  }
  if (mission.display_category === "sang_tao") {
    return ["Chuẩn bị bút hoặc giấy.", "Làm theo ý tưởng của cậu.", "Bấm xong khi cậu thấy đã ổn."];
  }
  return ["Nhìn câu hỏi hoặc nội dung.", "Làm từ từ từng bước.", "Bấm xong khi cậu hoàn thành."];
}

function backZoneForMission(childId: string, mission: MissionData) {
  if (mission.display_category === "van_dong") return `/child/${childId}/move`;
  if (mission.display_category === "sang_tao") return `/child/${childId}/create`;
  return `/child/${childId}/study`;
}

export function MissionDetail({ childId, missionId }: { childId: string; missionId: string }) {
  const [mission, setMission] = useState<MissionData | null>(null);
  const [completed, setCompleted] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const detail = await apiGetRequired<MissionData>(`/missions/${missionId}/`);
        setMission(detail);
      } catch {
        try {
          const list = await apiGetRequired<MissionData[]>(`/missions/?child_id=${childId}`);
          const fallbackMission = list.find((item) => String(item.id) === String(missionId)) || null;
          setMission(fallbackMission);
          if (!fallbackMission) {
            setError("Không tìm thấy nhiệm vụ.");
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Không thể tải nhiệm vụ.");
        }
      } finally {
        setLoading(false);
      }
    }
    load().catch(() => setLoading(false));
  }, [childId, missionId]);

  async function handleComplete() {
    if (!mission) return;
    setSaving(true);
    setError("");
    try {
      const response = await apiPost<CompletionResponse>(`/missions/${missionId}/complete/`, {
        child_id: childId,
        score: 100,
      });
      setWalletBalance(response.wallet.points_balance);
      setCompleted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể ghi nhận kết quả nhiệm vụ.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="child-scene-shell rounded-[2.2rem] px-6 py-20 text-center">
        <p className="relative z-10 text-sm font-black text-slate-500">Milo đang mở nhiệm vụ cho cậu...</p>
      </div>
    );
  }

  if (!mission) {
    return (
      <section className="child-scene-shell rounded-[2.2rem] px-6 py-10">
        <div className="relative z-10 mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white/90 text-4xl shadow-lg">🌱</div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-800">Nhiệm vụ này chưa mở được</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-slate-600">{error || "Nhiệm vụ này hiện chưa sẵn sàng."}</p>
          <Link
            href={`/child/${childId}/home`}
            className="mt-6 inline-flex rounded-[1.5rem] bg-gradient-to-r from-[#9dd9c6] to-[#bde6d9] px-5 py-3 text-sm font-black text-slate-800 shadow-md"
          >
            Về phòng Milo
          </Link>
        </div>
      </section>
    );
  }

  const steps = buildSteps(mission);
  const backHref = backZoneForMission(childId, mission);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="child-scene-shell rounded-[2.4rem] px-5 py-6 md:px-8 md:py-7">
        <div className="relative z-10">
          <div className="flex flex-wrap gap-2">
            <span className="child-mini-badge">⭐ +{mission.points_reward} điểm</span>
            <span className="child-mini-badge">⏱️ {mission.estimated_duration_minutes} phút</span>
            <span className="child-mini-badge">
              {mission.requires_camera ? "📷 Camera" : mission.requires_voice ? "🎤 Micro" : "🫶 Không cần thiết bị"}
            </span>
          </div>

          <div className="mt-5 max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">{mission.display_category_label}</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-800 sm:text-5xl">{mission.title}</h1>
            <p className="mt-4 text-base font-bold leading-8 text-slate-600">{mission.description}</p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step} className="child-island-card rounded-[1.9rem] px-4 py-5">
                <div className="relative z-10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-slate-50 text-sm font-black text-slate-700 shadow-sm">
                    {index + 1}
                  </div>
                  <p className="mt-4 text-base font-black leading-7 text-slate-800">{step}</p>
                </div>
              </div>
            ))}
          </div>

          {mission.safety_notes ? (
            <div className="child-soft-panel mt-5 rounded-[1.8rem] px-5 py-4">
              <p className="text-sm font-bold leading-7 text-slate-600">{mission.safety_notes}</p>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-[1.8rem] border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleComplete}
              disabled={saving || completed}
              className={`min-h-12 rounded-[1.5rem] px-5 text-sm font-black shadow-md ${
                completed
                  ? "bg-slate-200 text-slate-500"
                  : "bg-gradient-to-r from-[#9dd9c6] to-[#bde6d9] text-slate-800"
              }`}
            >
              {saving ? "Đang lưu..." : completed ? "Xong rồi" : "Cậu làm xong"}
            </button>
            <Link
              href={backHref}
              className="inline-flex min-h-12 items-center justify-center rounded-[1.5rem] border border-white/70 bg-[#fff7ea] px-5 text-sm font-black text-slate-700 shadow-sm"
            >
              Quay lại khu này
            </Link>
          </div>
        </div>
      </section>

      <div className="grid content-start gap-6">
        <section className="child-stage-board rounded-[2.2rem] px-5 py-6 md:px-7 md:py-7">
          <div className="relative z-10 flex justify-center">
            <MascotVisual
              mood={completed ? "cheer" : "focus"}
              size="md"
              message={completed ? "Tớ đã cộng điểm cho cậu rồi." : "Mình làm từng bước, không cần vội."}
            />
          </div>
        </section>

        {completed ? (
          <section className="child-stage-board rounded-[2.2rem] px-5 py-6 md:px-7 md:py-7">
            <div className="relative z-10">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Hoàn thành</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-800">Cậu vừa xong một việc rất tốt.</h2>
              <p className="mt-3 text-base font-bold leading-8 text-slate-600">Ví của cậu hiện có {walletBalance ?? "mới"} điểm.</p>
              <Link
                href={`/child/${childId}/watch`}
                className="mt-5 inline-flex rounded-[1.5rem] bg-gradient-to-r from-[#91d0f6] to-[#c6e6fb] px-5 py-3 text-sm font-black text-slate-800 shadow-md"
              >
                Sang TV
              </Link>
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2">
          <Link href={`/child/${childId}/home`} className="child-orbit-chip rounded-[1.8rem] bg-[#fff7ea]/90 px-5 py-5 text-center">
            <div className="text-3xl">🏠</div>
            <p className="mt-3 text-base font-black text-slate-800">Phòng Milo</p>
          </Link>
          <Link href={backHref} className="child-orbit-chip rounded-[1.8rem] bg-[#eef8ff]/90 px-5 py-5 text-center">
            <div className="text-3xl">✨</div>
            <p className="mt-3 text-base font-black text-slate-800">Về khu vừa mở</p>
          </Link>
        </section>
      </div>
    </div>
  );
}
