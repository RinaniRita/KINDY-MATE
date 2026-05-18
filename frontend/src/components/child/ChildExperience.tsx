"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Metric, Panel, StatusBadge } from "@/components/common/Cards";
import { categories, demoRewards } from "@/lib/mock-data";
import { apiGet, apiPost } from "@/lib/api";

type ChildProfileData = {
  id: string;
  nickname: string;
  age: number;
  avatar_id: string;
  wallet_balance: number;
  rules: {
    daily_entertainment_cap_minutes: number;
    cooldown_minutes: number;
    voice_enabled: boolean;
    camera_enabled: boolean;
    entertainment_paused: boolean;
  };
};

type MissionData = {
  id: string;
  mission_type: string;
  title: string;
  description: string;
  points_reward: number;
  estimated_duration_minutes: number;
  requires_voice: boolean;
  requires_camera: boolean;
  verification_method: string;
  safety_notes: string;
};

// Cute animated SVG mascot widget for kids
export function MascotMilo({ 
  mood = "happy", 
  message = "" 
}: { 
  mood?: "happy" | "reading" | "cheering" | "sleeping"; 
  message?: string 
}) {
  return (
    <div className="flex flex-col items-center gap-4 bg-gradient-to-br from-blue-50 to-indigo-50/50 p-6 rounded-3xl border border-blue-100 shadow-sm relative overflow-hidden w-full">
      {/* Sparkles */}
      <div className="absolute top-4 left-4 text-xl animate-pulse">✨</div>
      <div className="absolute bottom-6 right-6 text-xl animate-bounce-gentle">⭐</div>

      {/* Floating Mascot */}
      <div className="relative h-32 w-32 rounded-3xl bg-emerald-400 p-2 shadow-lg animate-float border-4 border-white">
        <div className="relative h-full w-full rounded-2xl bg-white flex flex-col items-center justify-center shadow-inner overflow-hidden">
          
          {/* Blush cheeks */}
          <div className="absolute left-3 top-16 h-3 w-5 rounded-full bg-pink-150/90 blur-[1px]" />
          <div className="absolute right-3 top-16 h-3 w-5 rounded-full bg-pink-150/90 blur-[1px]" />

          {/* Happy blinking eyes */}
          <div className="flex gap-6 mt-1">
            {mood === "happy" || mood === "cheering" ? (
              <>
                <div className="relative h-4 w-4 rounded-full bg-slate-805 flex items-center justify-center">
                  <div className="absolute top-0.5 left-0.5 h-1.5 w-1.5 rounded-full bg-white" />
                </div>
                <div className="relative h-4 w-4 rounded-full bg-slate-805 flex items-center justify-center">
                  <div className="absolute top-0.5 left-0.5 h-1.5 w-1.5 rounded-full bg-white" />
                </div>
              </>
            ) : mood === "reading" ? (
              <>
                <span className="text-xs font-black text-slate-800">◡</span>
                <span className="text-xs font-black text-slate-800">◡</span>
              </>
            ) : (
              <>
                <span className="text-[10px] text-slate-400">─</span>
                <span className="text-[10px] text-slate-400">─</span>
              </>
            )}
          </div>

          {/* Mouth */}
          <div className="mt-2.5 h-3 w-8 border-b-4 border-slate-800 rounded-full" />
          
          {/* Ears */}
          <div className="absolute -left-2 top-8 h-8 w-6 rounded-l-full bg-emerald-100 border-l-2 border-emerald-300" />
          <div className="absolute -right-2 top-8 h-8 w-6 rounded-r-full bg-emerald-100 border-r-2 border-emerald-300" />
          
          {/* Astronaut helmet badge */}
          <div className="absolute top-1 bg-amber-400 text-[6px] font-black text-white px-2 py-0.2 rounded-full uppercase">
            MILO
          </div>
        </div>
      </div>

      {/* Speech bubble */}
      {message && (
        <div className="relative bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 max-w-xs text-center">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-white" />
          <p className="text-sm font-bold text-slate-700 leading-relaxed">{message}</p>
        </div>
      )}
    </div>
  );
}

export function ChildHome({ childId }: { childId: string }) {
  const [child, setChild] = useState<ChildProfileData | null>(null);
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<ChildProfileData | null>(`/children/${childId}/`, null),
      apiGet<MissionData[]>(`/missions/?child_id=${childId}`, []),
    ])
      .then(([childData, missionList]) => {
        setChild(childData);
        setMissions(missionList);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [childId]);

  if (loading || !child) {
    return (
      <div className="text-center py-20 font-bold text-slate-500">Đang khởi động Milo AI... 🚀</div>
    );
  }

  const welcomeMessage = `Chào con, ${child.nickname}! 👋 Hôm nay con muốn thử thách nhiệm vụ nào nhỉ? Hãy chọn một nhiệm vụ để cùng Milo học tập và tích lũy điểm thưởng nhé!`;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr] py-4">
      {/* Left side: Mascot Welcome */}
      <Panel eyebrow="Bạn dẫn đường Milo" title={`Chào con, ${child.nickname}! 👋`}>
        <div className="mt-4">
          <MascotMilo mood="happy" message={welcomeMessage} />
        </div>
        <div className="mt-6 flex justify-center">
          <span className="inline-flex rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-3 text-sm font-black text-white shadow-md">
            ⭐ Ví của con: {child.wallet_balance} điểm
          </span>
        </div>
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700 border border-emerald-100/60 leading-relaxed text-center">
          💡 Milo là trợ lý hướng dẫn nhiệm vụ học tập, không trò chuyện tự do để bảo vệ an toàn cho con.
        </p>
      </Panel>

      {/* Right side: Suggested Missions */}
      <Panel eyebrow="Nhiệm vụ hàng ngày" title="Nhiệm vụ Milo gợi ý cho con">
        {missions.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <span className="text-3xl">🌟</span>
            <p className="mt-3 text-xs font-black text-slate-700">Milo đang chuẩn bị nhiệm vụ mới cho con!</p>
            <p className="text-[10px] font-bold text-slate-400 mt-1">Con hãy quay lại sau ít phút hoặc nhờ bố mẹ tạo thêm nhiệm vụ nhé.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 mt-2">
            {missions.map((mission) => {
              const type = mission.mission_type.toLowerCase();
              const colors = 
                type === "reading" 
                  ? "from-blue-50/50 to-indigo-50/30 border-blue-100 hover:border-blue-300"
                  : type === "movement"
                  ? "from-amber-50/50 to-orange-50/30 border-amber-100 hover:border-amber-300"
                  : "from-emerald-50/50 to-teal-50/30 border-emerald-100 hover:border-emerald-300";
              const icons = 
                type === "reading" ? "📚" : type === "movement" ? "🏃" : "✏️";
              
              return (
                <Link
                  className={`interactive-card rounded-2xl border bg-gradient-to-br ${colors} p-5 hover:scale-102 flex flex-col justify-between`}
                  href={`/child/${childId}/mission/${mission.id}`}
                  key={mission.id}
                >
                  <div>
                    <div className="text-2xl mb-3">{icons}</div>
                    <h3 className="font-black text-slate-800 text-base leading-snug">{mission.title}</h3>
                    <p className="mt-1 text-xs font-bold text-slate-500 leading-normal line-clamp-3">{mission.description}</p>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <span className="inline-flex rounded-xl bg-white px-3 py-1.5 text-xs font-black text-slate-800 shadow-sm border border-slate-100">
                      ⭐ +{mission.points_reward} điểm
                    </span>
                    <span className="text-[10px] font-black uppercase text-slate-400">{mission.estimated_duration_minutes} phút</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

export function MissionList({ childId }: { childId: string }) {
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<MissionData[]>(`/missions/?child_id=${childId}`, [])
      .then((data) => {
        setMissions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [childId]);

  if (loading) {
    return (
      <div className="text-center py-20 font-bold text-slate-500">Đang tải danh sách nhiệm vụ... 🚀</div>
    );
  }

  return (
    <Panel eyebrow="Nhiệm vụ tăng trưởng" title="Chọn nhiệm vụ an toàn cùng Milo">
      {missions.length === 0 ? (
        <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-slate-200">
          <p className="text-xs font-black text-slate-500">Hôm nay không có nhiệm vụ nào phù hợp với tuổi của con.</p>
        </div>
      ) : (
        <div className="grid gap-4 mt-2">
          {missions.map((mission) => {
            const type = mission.mission_type.toLowerCase();
            return (
              <Link
                className="interactive-card rounded-2xl border border-slate-100 bg-white p-5 hover:border-emerald-250 hover:bg-emerald-50/20"
                href={`/child/${childId}/mission/${mission.id}`}
                key={mission.id}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-xl shadow-sm">
                      {type === "reading" ? "📚" : type === "movement" ? "🏃" : "✏️"}
                    </span>
                    <div>
                      <h3 className="font-black text-slate-800 leading-snug">{mission.title}</h3>
                      {mission.safety_notes && (
                        <p className="mt-0.5 text-xs font-bold text-slate-400">🛡️ {mission.safety_notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                      {mission.estimated_duration_minutes} phút
                    </span>
                    <span className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-600">
                      ⭐ +{mission.points_reward} điểm
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

export function MissionDetail({ childId, missionId }: { childId: string; missionId: string }) {
  const [mission, setMission] = useState<MissionData | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<MissionData | null>(`/missions/${missionId}/`, null)
      .then((data) => {
        setMission(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [missionId]);

  async function handleComplete() {
    if (!mission) return;
    setSaving(true);
    try {
      await apiPost(`/missions/${missionId}/complete/`, {
        child_id: childId,
        score: 100,
      });
      setCompleted(true);
    } catch (err) {
      alert("Không thể gửi kết quả hoàn thành.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20 font-bold text-slate-500">Đang mở chi tiết nhiệm vụ... 📚</div>
    );
  }

  if (!mission) {
    return (
      <Panel eyebrow="Lỗi" title="Nhiệm vụ không tồn tại">
        <p className="text-xs font-bold text-slate-500">Không tìm thấy thông tin chi tiết của nhiệm vụ này.</p>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] py-4">
      {/* Mission details panel */}
      <Panel eyebrow="Chi tiết nhiệm vụ" title={mission.title}>
        <div className="flex items-center gap-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/60 mb-6">
          <span className="text-2xl">🎉</span>
          <p className="text-sm font-bold text-emerald-700 leading-relaxed">{mission.description}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Metric label="Điểm hoàn thành" value={`⭐ +${mission.points_reward} điểm`} variant="yellow" />
          <Metric label="Thời lượng dự kiến" value={`⏱️ ${mission.estimated_duration_minutes} phút`} variant="blue" />
          <Metric label="Phương thức xác minh" value={`⚙️ Thao tác trực tiếp (Dành cho trẻ 2-8 tuổi)`} variant="green" />
          <Metric label="Hướng dẫn an toàn" value={`🛡️ ${mission.safety_notes || "Milo đồng hành an toàn"}`} variant="rose" />
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button 
            className={`bubbly-btn min-h-14 w-full rounded-2xl text-center text-sm font-black text-white shadow-lg transition duration-300 ${
              completed 
                ? "bg-slate-400 shadow-slate-200 cursor-not-allowed" 
                : "bg-gradient-to-r from-emerald-400 to-teal-400 shadow-emerald-100 hover:shadow-emerald-200"
            }`}
            onClick={handleComplete}
            disabled={completed || saving}
            type="button"
          >
            {saving ? "Đang gửi kết quả..." : completed ? "✓ Nhiệm vụ đã hoàn thành!" : "🚀 Bắt đầu & Hoàn thành nhiệm vụ"}
          </button>

          {completed && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-center animate-bounce-gentle">
              <span className="text-xl">🏆</span>
              <p className="mt-1 text-xs font-black text-emerald-600">Đã cộng +{mission.points_reward} điểm vào ví Milo của con!</p>
            </div>
          )}
        </div>
      </Panel>

      {/* Mascot cheer side panel */}
      <div className="flex flex-col justify-center">
        <MascotMilo 
          mood={completed ? "cheering" : "reading"} 
          message={
            completed 
              ? "Tuyệt vời quá! Con đã hoàn thành xuất sắc thử thách. Tiếp tục phát huy tinh thần tự học nhé!" 
              : "Nhiệm vụ này rất thú vị và bổ ích. Hãy thực hiện thong thả và cẩn thận con nhé. Milo luôn đồng hành cùng con!"
          } 
        />
      </div>
    </div>
  );
}

export function RewardShop({ childId }: { childId: string }) {
  const [child, setChild] = useState<ChildProfileData | null>(null);
  const [points, setPoints] = useState(20);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<ChildProfileData | null>(`/children/${childId}/`, null)
      .then((data) => {
        if (data) {
          setChild(data);
          setPoints(data.wallet_balance);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [childId]);

  const handleRedeem = (cost: number) => {
    if (points >= cost) {
      setPoints(points - cost);
      alert("Đổi điểm thành công! Hãy tận hưởng phần thưởng lành mạnh của con nhé.");
    } else {
      alert("Con chưa đủ điểm rồi. Hãy thực hiện thêm các nhiệm vụ tăng trưởng để nhận thêm điểm nhé!");
    }
  };

  if (loading || !child) {
    return (
      <div className="text-center py-20 font-bold text-slate-550">Đang tải cửa hàng quà tặng... 🛍️</div>
    );
  }

  const capRemaining = child.rules ? child.rules.daily_entertainment_cap_minutes : 20;

  return (
    <Panel eyebrow="Ví Milo của con" title="Đổi phần thưởng lành mạnh">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100 mb-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ví điểm của con</p>
          <p className="text-3xl font-black text-slate-800 mt-1">⭐ {points} điểm</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Hạn mức giải trí hôm nay</p>
          <p className="text-lg font-black text-slate-700 mt-1">⏱️ Có {capRemaining} phút sử dụng</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {demoRewards.map((reward) => (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between" key={reward.id}>
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-black text-slate-800 text-lg leading-tight">{reward.title}</h3>
                <StatusBadge state={reward.state} />
              </div>
              <p className="text-xs font-bold text-slate-400 leading-relaxed mb-4">{reward.note}</p>
            </div>
            
            <button 
              className={`bubbly-btn min-h-12 w-full rounded-xl text-center text-xs font-black shadow-md ${
                points >= reward.pointsCost && reward.state === "approved"
                  ? "bg-gradient-to-r from-blue-400 to-indigo-400 text-white shadow-blue-100"
                  : "bg-slate-100 text-slate-400 border border-slate-200/50 shadow-none cursor-not-allowed"
              }`}
              onClick={() => handleRedeem(reward.pointsCost)}
              disabled={points < reward.pointsCost || reward.state !== "approved"}
              type="button"
            >
              🛍️ Đổi bằng {reward.pointsCost} điểm
            </button>
          </div>
        ))}
      </div>
      <BlockedState />
    </Panel>
  );
}

export function BlockedState() {
  return (
    <div className="mt-6 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 flex items-start gap-4">
      <span className="text-3xl animate-bounce-gentle">⏱️</span>
      <div>
        <p className="text-sm font-black text-slate-800">Thói quen số lành mạnh</p>
        <p className="mt-1 text-xs font-bold leading-relaxed text-slate-550">
          Khi con đã dùng hết hạn mức giải trí trong ngày, hệ thống sẽ tự động tạm dừng phần giải trí. Con hãy cất máy đi, vận động cơ thể, đọc một cuốn truyện giấy hoặc quay lại gặp Milo vào ngày mai nhé!
        </p>
      </div>
    </div>
  );
}

export function MascotPage() {
  const items = [
    { name: "Mũ phi hành gia", type: "Mũ bảo vệ", cost: 6, emoji: "🧑‍🚀", color: "from-blue-100 to-blue-50/50" },
    { name: "Áo đọc sách", type: "Trang phục", cost: 6, emoji: "🥋", color: "from-emerald-100 to-emerald-50/50" },
    { name: "Nền đại dương", type: "Phông nền", cost: 6, emoji: "🐠", color: "from-cyan-100 to-cyan-50/50" }
  ];

  return (
    <Panel eyebrow="Cửa hàng phụ kiện Milo" title="Tùy chỉnh Mascot vui nhộn">
      <p className="mb-6 text-xs font-bold text-slate-500 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 max-w-xl">
        ⭐ Phụ kiện được mở bằng điểm cố định, không có yếu tố may rủi, không có loot box và gacha bảo vệ tài chính của gia đình.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div className="interactive-card rounded-2xl border border-slate-150 bg-white p-5 flex flex-col justify-between shadow-sm" key={item.name}>
            <div>
              <div className={`flex h-24 items-center justify-center rounded-2xl bg-gradient-to-tr ${item.color} text-4xl shadow-inner animate-float-slow mb-4`}>
                {item.emoji}
              </div>
              <h3 className="font-black text-slate-800 text-lg leading-tight">{item.name}</h3>
              <p className="text-xs font-bold text-slate-400 mt-1">{item.type}</p>
            </div>
            
            <button className="bubbly-btn mt-5 min-h-11 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-xs font-black text-white shadow-lg shadow-emerald-50" type="button">
              🛍️ Mở khóa: {item.cost} điểm
            </button>
          </div>
        ))}
      </div>
    </Panel>
  );
}
