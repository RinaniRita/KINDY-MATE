"use client";

import Link from "next/link";
import { useState } from "react";
import { Metric, Panel, StatusBadge } from "@/components/common/Cards";
import { demoChild, demoMissions, demoRewards, demoRules } from "@/lib/mock-data";

// Cute animated SVG mascot widget for kids
export function MascotMilo({ 
  mood = "happy", 
  message = "" 
}: { 
  mood?: "happy" | "reading" | "cheering" | "sleeping"; 
  message?: string 
}) {
  return (
    <div className="flex flex-col items-center gap-4 bg-gradient-to-br from-blue-50 to-indigo-50/50 p-6 rounded-3xl border border-blue-100 shadow-sm relative overflow-hidden">
      {/* Sparkles */}
      <div className="absolute top-4 left-4 text-xl animate-pulse">✨</div>
      <div className="absolute bottom-6 right-6 text-xl animate-bounce-gentle">⭐</div>

      {/* Floating Mascot */}
      <div className="relative h-32 w-32 rounded-3xl bg-emerald-400 p-2 shadow-lg animate-float border-4 border-white">
        <div className="relative h-full w-full rounded-2xl bg-white flex flex-col items-center justify-center shadow-inner overflow-hidden">
          
          {/* Blush cheeks */}
          <div className="absolute left-3 top-16 h-3 w-5 rounded-full bg-pink-100/90 blur-[1px]" />
          <div className="absolute right-3 top-16 h-3 w-5 rounded-full bg-pink-100/90 blur-[1px]" />

          {/* Happy blinking eyes */}
          <div className="flex gap-6 mt-1">
            {mood === "happy" || mood === "cheering" ? (
              <>
                <div className="relative h-4 w-4 rounded-full bg-slate-800 flex items-center justify-center">
                  <div className="absolute top-0.5 left-0.5 h-1.5 w-1.5 rounded-full bg-white" />
                </div>
                <div className="relative h-4 w-4 rounded-full bg-slate-800 flex items-center justify-center">
                  <div className="absolute top-0.5 left-0.5 h-1.5 w-1.5 rounded-full bg-white" />
                </div>
              </>
            ) : mood === "reading" ? (
              <>
                <span className="text-xs font-black text-slate-850">◡</span>
                <span className="text-xs font-black text-slate-850">◡</span>
              </>
            ) : (
              <>
                <span className="text-[10px] text-slate-400">─</span>
                <span className="text-[10px] text-slate-400">─</span>
              </>
            )}
          </div>

          {/* Mouth */}
          <div className="mt-2.5 h-3 w-8 border-b-4 border-slate-850 rounded-full" />
          
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

export function ChildHome() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr] py-4">
      {/* Left side: Mascot Welcome */}
      <Panel eyebrow="Bạn dẫn đường Milo" title={`Chào con, ${demoChild.nickname}! 👋`}>
        <div className="mt-4">
          <MascotMilo 
            mood="happy" 
            message="Hôm nay con muốn thử thách nhiệm vụ nào nhỉ? Hãy chọn một ô bên cạnh để cùng Milo học tập và tích lũy điểm thưởng nhé!" 
          />
        </div>
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700 border border-emerald-100/60 leading-relaxed text-center">
          💡 Milo là trợ lý hướng dẫn nhiệm vụ học tập, không trò chuyện tự do để bảo vệ an toàn cho con.
        </p>
      </Panel>

      {/* Right side: Suggested Missions */}
      <Panel eyebrow="Nhiệm vụ hàng ngày" title="Nhiệm vụ Milo gợi ý cho con">
        <div className="grid gap-4 sm:grid-cols-2 mt-2">
          {demoMissions.map((mission) => {
            const colors = {
              reading: "from-blue-50/50 to-indigo-50/30 border-blue-100 hover:border-blue-300",
              learning: "from-emerald-50/50 to-teal-50/30 border-emerald-100 hover:border-emerald-300",
              movement: "from-amber-50/50 to-orange-50/30 border-amber-100 hover:border-amber-300"
            };
            const icons = {
              reading: "📚",
              learning: "🌟",
              movement: "🏃"
            };
            
            return (
              <Link
                className={`interactive-card rounded-2xl border bg-gradient-to-br ${colors[mission.type as "reading" | "learning" | "movement"]} p-5 hover:scale-102 flex flex-col justify-between`}
                href={`/child/${demoChild.id}/mission/${mission.id}`}
                key={mission.id}
              >
                <div>
                  <div className="text-2xl mb-3">{icons[mission.type as "reading" | "learning" | "movement"]}</div>
                  <h3 className="font-black text-slate-800 text-lg leading-snug">{mission.title}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500 leading-normal">{mission.description}</p>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <span className="inline-flex rounded-xl bg-white px-3 py-1.5 text-xs font-black text-slate-800 shadow-sm border border-slate-100 animate-pulse-glow">
                    ⭐ +{mission.pointsReward} điểm
                  </span>
                  <span className="text-[10px] font-black uppercase text-slate-400">{mission.durationMinutes} phút</span>
                </div>
              </Link>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

export function MissionList() {
  return (
    <Panel eyebrow="Nhiệm vụ tăng trưởng" title="Chọn nhiệm vụ an toàn cùng Milo">
      <div className="grid gap-4 mt-2">
        {demoMissions.map((mission) => (
          <Link
            className="interactive-card rounded-2xl border border-slate-100 bg-white p-5 hover:border-emerald-200 hover:bg-emerald-50/20"
            href={`/child/${demoChild.id}/mission/${mission.id}`}
            key={mission.id}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-xl shadow-sm">
                  {mission.type === "reading" ? "📚" : mission.type === "learning" ? "✏️" : "🏃"}
                </span>
                <div>
                  <h3 className="font-black text-slate-800 leading-snug">{mission.title}</h3>
                  <p className="mt-0.5 text-xs font-bold text-slate-400">🛡️ {mission.safetyNotes}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                  {mission.durationMinutes} phút
                </span>
                <span className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-600">
                  ⭐ +{mission.pointsReward} điểm
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

export function MissionDetail({ missionId }: { missionId: string }) {
  const mission = demoMissions.find((item) => item.id === missionId) ?? demoMissions[0];
  const [completed, setCompleted] = useState(false);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] py-4">
      {/* Mission details panel */}
      <Panel eyebrow="Chi tiết nhiệm vụ" title={mission.title}>
        <div className="flex items-center gap-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/60 mb-6">
          <span className="text-2xl">🎉</span>
          <p className="text-sm font-bold text-emerald-700 leading-relaxed">{mission.description}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Metric label="Điểm hoàn thành" value={`⭐ +${mission.pointsReward} điểm`} variant="yellow" />
          <Metric label="Thời lượng dự kiến" value={`⏱️ ${mission.durationMinutes} phút`} variant="blue" />
          <Metric label="Phương thức xác minh" value={`⚙️ ${mission.verificationMethod}`} variant="green" />
          <Metric label="Hướng dẫn an toàn" value={`🛡️ ${mission.safetyNotes}`} variant="rose" />
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button 
            className={`bubbly-btn min-h-14 w-full rounded-2xl text-center text-sm font-black text-white shadow-lg transition duration-300 ${
              completed 
                ? "bg-slate-400 shadow-slate-200 cursor-not-allowed" 
                : "bg-gradient-to-r from-emerald-400 to-teal-400 shadow-emerald-100 hover:shadow-emerald-200"
            }`}
            onClick={() => setCompleted(true)}
            disabled={completed}
            type="button"
          >
            {completed ? "✓ Nhiệm vụ đã hoàn thành!" : "🚀 Bắt đầu & Hoàn thành nhiệm vụ"}
          </button>

          {completed && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-center animate-bounce-gentle">
              <span className="text-xl">🏆</span>
              <p className="mt-1 text-xs font-black text-emerald-600">Đã cộng +{mission.pointsReward} điểm vào ví Milo của con!</p>
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

export function RewardShop() {
  const [points, setPoints] = useState(demoChild.wallet);
  const capRemaining = demoRules.dailyCapMinutes - demoRules.capUsedMinutes;

  const handleRedeem = (id: string, cost: number) => {
    if (points >= cost) {
      setPoints(points - cost);
      alert("Đổi điểm thành công! Hãy tận hưởng phần thưởng lành mạnh của con nhé.");
    } else {
      alert("Con chưa đủ điểm rồi. Hãy thực hiện thêm các nhiệm vụ tăng trưởng để nhận thêm điểm nhé!");
    }
  };

  return (
    <Panel eyebrow="Ví Milo của con" title="Đổi phần thưởng lành mạnh">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100 mb-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ví điểm của con</p>
          <p className="text-3xl font-black text-slate-800 mt-1">⭐ {points} điểm</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Hạn mức giải trí hôm nay</p>
          <p className="text-lg font-black text-slate-700 mt-1">⏱️ Còn {capRemaining} phút sử dụng</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {demoRewards.map((reward) => (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between" key={reward.id}>
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-black text-slate-800 text-lg">{reward.title}</h3>
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
              onClick={() => handleRedeem(reward.id, reward.pointsCost)}
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
        <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500">
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
