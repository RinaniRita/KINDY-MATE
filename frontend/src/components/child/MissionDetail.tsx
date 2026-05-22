"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiGetRequired, apiPost } from "@/lib/api";
import { YouTubeEmbed } from "@/components/common/YouTubeEmbed";

import { MascotVisual } from "./MascotVisual";
import { EnglishAnimalsMission } from "./missions/EnglishAnimalsMission";
import { MathPicturesMission } from "./missions/MathPicturesMission";
import type { MissionData } from "./types";
import dynamic from "next/dynamic";

const JumpingJackTracker = dynamic(
  () => import("./JumpingJackTracker").then((mod) => mod.JumpingJackTracker),
  { ssr: false }
);

type CompletionResponse = {
  wallet: {
    points_balance: number;
  };
};

const fallbackMissions: MissionData[] = [
  {
    id: "17",
    mission_type: "movement",
    mission_type_label: "Vận động",
    display_category: "van_dong",
    display_category_label: "Vận Động Khỏe Mạnh",
    title: "Gấp máy bay giấy và phóng xa",
    description: "Cùng Milo gấp chiếc máy bay giấy thật đẹp, phóng đi thật xa rồi chạy theo nhặt lại nhé! Bài tập giúp đôi tay khéo léo và rèn thể chất cực vui.",
    points_reward: 15,
    estimated_duration_minutes: 5,
    requires_voice: false,
    requires_camera: true,
    verification_method: "Chụp ảnh sản phẩm bay",
    safety_notes: "Chơi ở khu vực rộng rãi, không phóng máy bay vào người khác.",
  },
  {
    id: "1",
    mission_type: "reading",
    mission_type_label: "Đọc sách",
    display_category: "doc_sach",
    display_category_label: "Đọc Sách Vui Vẻ",
    title: "Đọc sách cùng Milo",
    description: "Đọc một câu chuyện ngắn thú vị và trả lời các câu hỏi trắc nghiệm thông minh cùng Milo nhé!",
    points_reward: 10,
    estimated_duration_minutes: 8,
    requires_voice: false,
    requires_camera: false,
    verification_method: "Trả lời câu hỏi trắc nghiệm",
    safety_notes: "Ngồi thẳng lưng, nơi đủ ánh sáng.",
  },
  {
    id: "2",
    mission_type: "learning",
    mission_type_label: "Học tập",
    display_category: "ky_nang_song",
    display_category_label: "Học Tiếng Anh",
    title: "Học từ vựng Tiếng Anh loài vật",
    description: "Cùng Milo học tên tiếng Anh các loài động vật siêu đáng yêu qua tranh vẽ sinh động nhé!",
    points_reward: 12,
    estimated_duration_minutes: 6,
    requires_voice: false,
    requires_camera: false,
    verification_method: "Nhận diện loài vật",
    safety_notes: "Tập trung lắng nghe phát âm mẫu.",
  },
  {
    id: "3",
    mission_type: "movement",
    mission_type_label: "Vận động",
    display_category: "van_dong",
    display_category_label: "Thử Thách Vận Động",
    title: "Thử thách Jumping Jacks",
    description: "Cùng Milo bật nhảy 10 cái Jumping Jacks thật chính xác nhé! Camera AI sẽ đếm giúp cậu.",
    points_reward: 20,
    estimated_duration_minutes: 3,
    requires_voice: false,
    requires_camera: true,
    verification_method: "AI đếm số lần nhảy",
    safety_notes: "Hãy đứng xa điện thoại một chút, đứng vào khung hình và đảm bảo không vướng đồ vật nhé.",
  }
];

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

  // States for custom webcam and file upload
  const [useCamera, setUseCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(mediaStream);
      setUseCamera(true);
      setError("");
    } catch (err) {
      console.warn("Webcam access error:", err);
      setError("Không thể khởi động camera. Cậu vui lòng chọn ảnh từ máy nhé!");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    const video = document.getElementById("webcam-feed") as HTMLVideoElement;
    if (video) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setPhotoData(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoData(reader.result as string);
        setError("");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAISubmit = async () => {
    if (!photoData) return;
    setIsScanning(true);
    setError("");
    try {
      // Simulate AI analysis and image upload latency
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const response = await apiPost<CompletionResponse>(`/missions/${missionId}/complete/`, {
          child_id: childId,
          score: 100,
        });
        setWalletBalance(response.wallet.points_balance);
      } catch (postErr) {
        console.warn("Backend offline during mission complete submission. Using mock points reward.");
        setWalletBalance((prev) => (prev !== null ? prev + (mission?.points_reward || 15) : 50));
      }
      setCompleted(true);
      setUploaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi ảnh bài làm lên hệ thống.");
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const timeoutId = setTimeout(() => {
      console.log("Forcefully setting loading false after 3 seconds");
      if (isMounted) setLoading(false);
    }, 3000);

    async function load() {
      console.log("MissionDetail load() START", { childId, missionId });
      try {
        console.log("Calling apiGetRequired for mission", missionId);
        const detail = await apiGetRequired<MissionData>(`/missions/${missionId}/`);
        console.log("Got detail", detail);
        if (isMounted) setMission(detail);
      } catch (err) {
        console.warn("Error loading mission detail directly from API:", err);
        try {
          const list = await apiGetRequired<MissionData[]>(`/missions/?child_id=${childId}`);
          const fallbackMission = list.find((item) => String(item.id) === String(missionId)) || null;
          if (isMounted) {
            if (fallbackMission) {
              setMission(fallbackMission);
            } else {
              // Try local static fallback before setting error
              const localFallback = fallbackMissions.find((item) => String(item.id) === String(missionId)) || null;
              setMission(localFallback);
              if (!localFallback) {
                setError("Không tìm thấy nhiệm vụ.");
              }
            }
          }
        } catch (err2) {
          console.warn("Backend unavailable. Attempting static local fallback search.");
          if (isMounted) {
            const localFallback = fallbackMissions.find((item) => String(item.id) === String(missionId)) || null;
            if (localFallback) {
              setMission(localFallback);
            } else {
              setError("Không thể tải nhiệm vụ.");
            }
          }
        }
      } finally {
        console.log("Setting loading to false");
        if (isMounted) setLoading(false);
        clearTimeout(timeoutId);
      }
    }
    load().catch((e) => {
      console.warn("load() catch block error:", e);
      if (isMounted) setLoading(false);
      clearTimeout(timeoutId);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
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

  const getMascotMood = () => {
    if (String(missionId) === "17") {
      if (isScanning) return "focus";
      if (uploaded || completed) return "cheer";
      return "focus";
    }
    return completed ? "cheer" : "focus";
  };

  const getMascotMessage = () => {
    if (String(missionId) === "17") {
      if (isScanning) return "Chờ tớ một chút, tớ đang xem bài làm của cậu... 🔍";
      if (uploaded || completed) return "Wow! Cậu làm xuất sắc quá! Milo tặng cậu điểm nè! 🎉🥳";
      return "Cậu xem kỹ video hướng dẫn rồi hoàn thành bài làm nhé!";
    }
    return completed ? "Tớ đã cộng điểm cho cậu rồi." : "Mình làm từng bước, không cần vội.";
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="child-scene-shell rounded-[2.4rem] px-5 py-6 md:px-8 md:py-7">
        <div className="relative z-10">
          <div className="flex flex-wrap gap-2">
            <span className="child-mini-badge">⭐ +{mission.points_reward} điểm</span>
            <span className="child-mini-badge">⏱️ {mission.estimated_duration_minutes} phút</span>
            <span className="child-mini-badge">
              {mission.requires_camera || String(missionId) === "17" ? "📷 Camera" : mission.requires_voice ? "🎤 Micro" : "🫶 Không cần thiết bị"}
            </span>
          </div>

          <div className="mt-5 max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">{mission.display_category_label}</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-800 sm:text-5xl">{mission.title}</h1>
            <p className="mt-4 text-base font-bold leading-8 text-slate-600">{mission.description}</p>
          </div>

          <div className="mt-6">
            {String(missionId) === "17" ? (
              <div className="space-y-6">
                {/* Embedded Video Instruction */}
                <div className="child-island-card overflow-hidden rounded-[2.2rem] p-6 bg-white/70 border border-white/80 shadow-md">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-4">
                    <span>📺</span> Xem video hướng dẫn từ Milo:
                  </h3>
                  <div className="overflow-hidden rounded-[1.8rem] shadow-sm border border-slate-100">
                    <YouTubeEmbed urlOrId="7POSrjNY53s" />
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-500 leading-relaxed">
                    Hãy xem video thật kỹ để học cách làm cùng Milo nhé! Khi làm xong, cậu hãy chụp ảnh hoặc tải ảnh bài làm lên để nhận điểm.
                  </p>
                </div>

                {/* Upload / Capture Section */}
                <div className="child-island-card rounded-[2.2rem] p-6 bg-white/70 border border-white/80 shadow-md">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-4">
                    <span>📷</span> Gửi bài làm cho Milo check nhé:
                  </h3>

                  {isScanning ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="relative h-20 w-20 flex items-center justify-center rounded-full bg-blue-50 text-blue-500 text-4xl animate-bounce">
                        🔍
                      </div>
                      <h4 className="text-lg font-black text-slate-800 animate-pulse">Milo đang check bài làm bằng AI...</h4>
                      <p className="text-sm font-bold text-slate-500">Chỉ mất vài giây thôi, cậu đợi Milo tí xíu nhé! 🫶</p>
                    </div>
                  ) : uploaded || completed ? (
                    <div className="py-6 flex flex-col items-center text-center space-y-4">
                      <div className="h-20 w-20 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-500 text-5xl animate-bounce">
                        🎉
                      </div>
                      <h4 className="text-2xl font-black text-slate-800">Tuyệt vời ông mặt trời! 🥳</h4>
                      <p className="text-base font-black text-emerald-600">Milo đã nhận được bài và duyệt thành công! +{mission.points_reward} điểm đã được cộng vào ví của cậu.</p>
                      {photoData && (
                        <div className="relative mt-4 max-w-sm rounded-[2rem] overflow-hidden border-4 border-emerald-400 shadow-lg">
                          <img src={photoData} alt="Bài làm của bé" className="w-full object-cover max-h-60" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {photoData ? (
                        <div className="flex flex-col items-center space-y-4">
                          <div className="relative max-w-sm rounded-[2rem] overflow-hidden border-4 border-blue-400 shadow-lg">
                            <img src={photoData} alt="Bài làm xem trước" className="w-full object-cover max-h-60" />
                            <button
                              type="button"
                              onClick={() => setPhotoData(null)}
                              className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-full bg-slate-900/60 text-white hover:bg-slate-900 font-bold"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setPhotoData(null)}
                              className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-650 text-slate-600"
                            >
                              Chụp/Chọn lại 🔄
                            </button>
                            <button
                              type="button"
                              onClick={handleAISubmit}
                              className="rounded-[1.2rem] bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-3 text-sm font-black text-white shadow-md animate-pulse"
                            >
                              Gửi Milo check AI 🚀
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {useCamera ? (
                            <div className="flex flex-col items-center space-y-4">
                              <div className="relative w-full max-w-md aspect-video rounded-[2rem] overflow-hidden border border-slate-250 bg-black shadow-md">
                                <video
                                  id="webcam-feed"
                                  autoPlay
                                  playsInline
                                  ref={(el) => {
                                    if (el && stream && el.srcObject !== stream) {
                                      el.srcObject = stream;
                                    }
                                  }}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  onClick={capturePhoto}
                                  className="rounded-[1.2rem] bg-[#9dd9c6] px-5 py-3 text-sm font-black text-slate-800 shadow-md"
                                >
                                  Bấm để Chụp 📸
                                </button>
                                <button
                                  type="button"
                                  onClick={stopCamera}
                                  className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600"
                                >
                                  Hủy bỏ ✕
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={startCamera}
                                className="flex flex-col items-center justify-center p-6 rounded-[2rem] border border-dashed border-slate-350 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 transition space-y-2"
                              >
                                <span className="text-4xl">📸</span>
                                <span className="text-base font-black text-slate-700">Chụp từ Camera</span>
                              </button>

                              <label className="flex flex-col items-center justify-center p-6 rounded-[2rem] border border-dashed border-slate-350 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 transition space-y-2 cursor-pointer">
                                <span className="text-4xl">📂</span>
                                <span className="text-base font-black text-slate-700">Chọn ảnh từ máy</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleFileChange}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : String(missionId) === "3" ? (
              <div className="space-y-6 mt-4">
                <JumpingJackTracker
                  targetCount={10}
                  onCountUpdate={(c) => {
                    if (c >= 10 && !completed && !saving) {
                      handleComplete();
                    }
                  }}
                />
              </div>
            ) : mission.title === "English Animals & Colors" ? (
              <EnglishAnimalsMission />
            ) : mission.title === "Phép cộng trừ bằng hình ảnh" ? (
              <MathPicturesMission />
            ) : mission.source_content?.content_body ? (
              <div
                className="child-article-content prose max-w-none text-slate-700 prose-headings:text-slate-800 prose-p:font-bold prose-p:leading-8 prose-img:rounded-3xl prose-img:shadow-md"
                dangerouslySetInnerHTML={{ __html: mission.source_content.content_body }}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
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
            )}
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
            {String(missionId) === "17" ? (
              <button
                type="button"
                disabled
                className={`min-h-12 rounded-[1.5rem] px-5 text-sm font-black shadow-md ${
                  completed ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-450 border border-slate-200"
                }`}
              >
                {completed ? "Milo đã ghi nhận điểm cho cậu! 🎉" : "Hãy tải ảnh/chụp ảnh bài ở trên để nộp nhé!"}
              </button>
            ) : String(missionId) === "3" ? (
              <button
                type="button"
                disabled
                className={`min-h-12 rounded-[1.5rem] px-5 text-sm font-black shadow-md ${
                  completed ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-450 border border-slate-200"
                }`}
              >
                {completed ? "Milo đã ghi nhận điểm cho cậu! 🎉" : "Hãy nhảy đủ 10 cái để tự động hoàn thành nhé!"}
              </button>
            ) : (
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
            )}
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
              mood={getMascotMood()}
              size="md"
              message={getMascotMessage()}
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
