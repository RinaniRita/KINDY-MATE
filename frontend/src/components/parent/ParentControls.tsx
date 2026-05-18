"use client";

import { useState } from "react";
import { Metric, Panel, StatusBadge } from "@/components/common/Cards";
import { categories, demoChild, demoRewards, demoRules } from "@/lib/mock-data";

export function ChildrenManager() {
  return (
    <Panel eyebrow="Quản lý hồ sơ" title="Hồ sơ trẻ nhỏ trong gia đình">
      <div className="flex flex-col md:flex-row items-center gap-6 bg-gradient-to-br from-indigo-50/50 to-blue-50/30 p-6 rounded-2xl border border-indigo-100/50 mb-6">
        {/* Child Avatar */}
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-400 text-3xl font-black text-white shadow-lg animate-float-slow">
          👧
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-slate-800">{demoChild.nickname}</h3>
            <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-600">
              {demoChild.age} tuổi
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500">
            Sở thích đã khai báo: {demoChild.interests.join(", ")}
          </p>
          <p className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">
            Mascot đồng hành: {demoChild.avatarId === "milo" ? "Milo Phi Hành Gia 🧑‍🚀" : demoChild.avatarId}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Metric label="Tên gọi (Biệt danh)" value={demoChild.nickname} variant="blue" />
        <Metric label="Độ tuổi phát triển" value={`${demoChild.age} tuổi`} variant="green" />
        <Metric label="Ngôn ngữ chính" value="Tiếng Việt (vi)" variant="purple" />
        <Metric label="Ví điểm Milo" value={`${demoChild.wallet} điểm`} variant="yellow" />
      </div>

      <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/40 p-4 flex items-start gap-3">
        <span className="text-xl">🛡️</span>
        <p className="text-xs font-bold leading-relaxed text-slate-500">
          <strong className="text-amber-800">Cam kết bảo mật dữ liệu trẻ nhỏ:</strong>
          Kindy-Mate tuyệt đối tuân thủ chính sách COPPA/GDPR-K. Chúng tôi không thu thập tên thật, hình ảnh camera thật, số điện thoại, trường lớp hay địa chỉ của con để bảo vệ con tối đa.
        </p>
      </div>
    </Panel>
  );
}

export function RulesManager() {
  const [paused, setPaused] = useState(demoRules.entertainmentPaused);
  const [dailyCap, setDailyCap] = useState(demoRules.dailyCapMinutes);
  const [cooldown, setCooldown] = useState(demoRules.cooldownMinutes);
  const [voice, setVoice] = useState(demoRules.voiceEnabled);
  const [camera, setCamera] = useState(demoRules.cameraEnabled);

  return (
    <Panel eyebrow="Cài đặt luật lệ" title="Luật phụ huynh luôn ghi đè ví điểm">
      <div className="space-y-6">

        {/* Toggle Pause Entertainment */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-rose-100 bg-rose-50/30">
          <div>
            <h4 className="font-black text-slate-800">Tạm dừng giải trí tức thì</h4>
            <p className="text-xs font-bold text-slate-400 mt-0.5">Tạm khóa toàn bộ luồng đổi điểm giải trí của trẻ ngay lập tức.</p>
          </div>
          <button
            className={`bubbly-btn min-h-12 px-6 rounded-xl text-xs font-black text-white shadow-md ${paused ? "bg-emerald-400 shadow-emerald-100" : "bg-rose-500 shadow-rose-100"
              }`}
            onClick={() => setPaused((value) => !value)}
            type="button"
          >
            {paused ? "🔓 Kích hoạt lại" : "🛑 Khóa giải trí ngay"}
          </button>
        </div>

        {/* Sliders for Daily Cap and Cooldown */}
        <div className="grid gap-6 md:grid-cols-2">

          {/* Daily Cap Slider */}
          <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-black text-slate-800 text-sm">Hạn mức giải trí ngày</span>
              <span className="text-blue-500 font-black text-sm">{dailyCap} phút</span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={dailyCap}
              onChange={(e) => setDailyCap(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-[10px] font-bold text-slate-400">Thời gian tối đa trẻ được đổi điểm xem video/chơi game giải trí mỗi ngày.</p>
          </div>

          {/* Cooldown Slider */}
          <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-black text-slate-800 text-sm">Thời gian nghỉ tối thiểu</span>
              <span className="text-emerald-500 font-black text-sm">{cooldown} phút</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={cooldown}
              onChange={(e) => setCooldown(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-[10px] font-bold text-slate-400">Sau mỗi phiên giải trí, trẻ cần dừng sử dụng một khoảng thời gian trước khi bắt đầu tiếp.</p>
          </div>
        </div>

        {/* Toggles for Mic and Camera */}
        <div className="grid gap-4 sm:grid-cols-2">

          {/* Voice Mic Access */}
          <div className="p-4 rounded-xl border border-slate-100 bg-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎙️</span>
              <div>
                <span className="block font-black text-slate-800 text-xs">Cho phép dùng Micro</span>
                <span className="text-[10px] font-bold text-slate-400">Dùng cho nhiệm vụ tập đọc</span>
              </div>
            </div>
            <button
              className={`h-6 w-12 rounded-full p-0.5 transition-colors duration-300 ${voice ? "bg-emerald-400" : "bg-slate-200"}`}
              onClick={() => setVoice(!voice)}
              type="button"
            >
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${voice ? "translate-x-6" : ""}`} />
            </button>
          </div>

          {/* Camera Access */}
          <div className="p-4 rounded-xl border border-slate-100 bg-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">📷</span>
              <div>
                <span className="block font-black text-slate-800 text-xs">Cho phép dùng Camera</span>
                <span className="text-[10px] font-bold text-slate-400">Dành cho vận động cơ thể</span>
              </div>
            </div>
            <button
              className={`h-6 w-12 rounded-full p-0.5 transition-colors duration-300 ${camera ? "bg-emerald-400" : "bg-slate-200"}`}
              onClick={() => setCamera(!camera)}
              type="button"
            >
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${camera ? "translate-x-6" : ""}`} />
            </button>
          </div>
        </div>

      </div>
    </Panel>
  );
}

export function ContentApproval() {
  const [items, setItems] = useState(demoRewards);

  const handleApprove = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, state: "approved" as const } : item));
  };

  const handleBlock = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, state: "blocked" as const } : item));
  };

  return (
    <Panel eyebrow="Kho nội dung số" title="Hàng đợi duyệt nội dung & quà tặng">
      <div className="overflow-x-auto mt-4 -mx-6 px-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 text-xs font-black uppercase tracking-wider">
              <th className="pb-3">Nội dung</th>
              <th className="pb-3">Phân loại</th>
              <th className="pb-3">Yêu cầu</th>
              <th className="pb-3">Trạng thái</th>
              <th className="pb-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-600 text-sm">
            {items.map((item) => (
              <tr className="hover:bg-slate-50/50 transition-colors" key={item.id}>
                <td className="py-4">
                  <div className="font-black text-slate-800">{item.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{item.note}</div>
                </td>
                <td className="py-4 font-bold text-xs uppercase text-slate-550">{item.rewardType}</td>
                <td className="py-4 font-semibold">{item.durationMinutes > 0 ? `${item.durationMinutes} phút` : "Cosmetic"}</td>
                <td className="py-4">
                  <StatusBadge state={item.state} />
                </td>
                <td className="py-4 text-right space-x-2">
                  {item.state === "pending" && (
                    <>
                      <button
                        className="bubbly-btn rounded-lg bg-emerald-500 text-white px-3 py-1.5 text-xs font-black shadow-sm"
                        onClick={() => handleApprove(item.id)}
                        type="button"
                      >
                        ✓ Duyệt
                      </button>
                      <button
                        className="bubbly-btn rounded-lg bg-rose-500 text-white px-3 py-1.5 text-xs font-black shadow-sm"
                        onClick={() => handleBlock(item.id)}
                        type="button"
                      >
                        ✗ Chặn
                      </button>
                    </>
                  )}
                  {item.state === "approved" && (
                    <button
                      className="bubbly-btn rounded-lg bg-slate-100 text-rose-500 px-3 py-1.5 text-xs font-black border border-rose-100"
                      onClick={() => handleBlock(item.id)}
                      type="button"
                    >
                      🚫 Chặn lại
                    </button>
                  )}
                  {item.state === "blocked" && (
                    <button
                      className="bubbly-btn rounded-lg bg-slate-100 text-emerald-600 px-3 py-1.5 text-xs font-black border border-emerald-100"
                      onClick={() => handleApprove(item.id)}
                      type="button"
                    >
                      🔓 Mở duyệt
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function Reports() {
  return (
    <Panel eyebrow="Báo cáo phát triển" title="Báo cáo cân bằng tuần này của con">
      <div className="grid gap-4 sm:grid-cols-3 mt-4">
        <Metric label="⭐ Tổng điểm tích lũy" value="31 điểm" variant="yellow" />
        <Metric label="🛍️ Điểm đã quy đổi" value="18 điểm" variant="blue" />
        <Metric label="🚫 Số lượt bị tạm dừng" value="2 lần" variant="rose" />
      </div>

      <div className="mt-6 bg-gradient-to-tr from-emerald-50/50 to-blue-50/30 p-5 rounded-2xl border border-slate-100">
        <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
          <span>📈</span> Phân tích cân bằng số (AI-supported):
        </h4>
        <p className="mt-2 text-xs font-bold leading-relaxed text-slate-500">
          Mina đang có thói quen đọc sách rất tốt vào đầu giờ tối (hoàn thành 3 phiên đọc tuần qua). Đồng thời, hạn mức giải trí được duy trì tốt dưới 25 phút/ngày. Chúng tôi đề xuất tăng nhẹ độ khó các câu đố Toán học và giữ nguyên bài đọc hiểu để thử thách tư duy của con.
        </p>
      </div>

      <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs font-bold leading-relaxed text-slate-400 border border-slate-100 text-center">
        💡 Báo cáo được xây dựng chỉ nhằm mục đích gợi ý hỗ trợ phụ huynh điều hướng, không chẩn đoán y lý hay gắn nhãn con trẻ.
      </p>
    </Panel>
  );
}

export function Settings() {
  return (
    <Panel eyebrow="Cài đặt hệ thống" title="Danh mục hoạt động được bật">
      <p className="mb-4 text-xs font-bold text-slate-500">Phụ huynh có quyền bật/tắt hoàn toàn các nhóm chức năng hoạt động để phù hợp với triết lý giáo dục của gia đình.</p>

      <div className="grid gap-3 mt-2">
        {categories.map((category) => (
          <div className="rounded-2xl bg-white p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-colors" key={category.id}>
            <div>
              <span className="font-black text-slate-800 text-sm">{category.label}</span>
              <span className="block text-[10px] font-bold text-slate-400 mt-0.5">Mã danh mục: {category.id}</span>
            </div>
            <span className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-600">
              ✓ Hoạt động
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
