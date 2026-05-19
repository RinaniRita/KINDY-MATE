"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Metric, Panel, StatusBadge } from "@/components/common/Cards";
import { categories, demoRewards } from "@/lib/mock-data";
import { apiGet, apiGetRequired, apiPatch } from "@/lib/api";

type ChildProfileData = {
  id: string;
  nickname: string;
  age: number;
  avatar_id: string;
  interests: string;
  favorite_subjects: string;
  default_language: string;
  wallet_balance: number;
  rules: {
    daily_entertainment_cap_minutes: number;
    cooldown_minutes: number;
    voice_enabled: boolean;
    camera_enabled: boolean;
    entertainment_paused: boolean;
  };
};

export function ChildrenManager() {
  const [children, setChildren] = useState<ChildProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGetRequired<ChildProfileData[]>("/children/")
      .then((data) => {
        setChildren(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Không thể tải hồ sơ trẻ nhỏ.");
        setLoading(false);
      });
  }, []);

  function handleSelectChild(childId: string) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("active_child_id", childId);
    }
  }

  if (loading) {
    return (
      <Panel eyebrow="Quản lý hồ sơ" title="Hồ sơ trẻ nhỏ trong gia đình">
        <div className="text-center py-10 font-bold text-slate-500">Đang tải hồ sơ của bé...</div>
      </Panel>
    );
  }

  if (children.length === 0) {
    return (
      <Panel eyebrow="Quản lý hồ sơ" title="Hồ sơ trẻ nhỏ trong gia đình">
        <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <span className="text-4xl">👧👦</span>
          <h4 className="mt-4 font-black text-slate-800 text-lg">Chưa có hồ sơ trẻ nhỏ nào</h4>
          <p className="mt-2 text-xs font-semibold text-slate-500 max-w-sm mx-auto leading-relaxed">
            Để bắt đầu cho bé học tập, vận động và nhận quà, phụ huynh vui lòng thiết lập hồ sơ ban đầu cho bé trước.
          </p>
          <Link
            href="/onboarding/child-profile"
            className="bubbly-btn mt-6 inline-flex rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 px-6 py-3 text-xs font-black text-white shadow-md shadow-emerald-100 hover:shadow-emerald-200"
          >
            ➕ Tạo hồ sơ cho bé ngay!
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <Panel eyebrow="Quản lý hồ sơ" title="Hồ sơ trẻ nhỏ trong gia đình">
      <div className="grid gap-6">
        {children.map((child) => (
          <div 
            key={child.id}
            className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-gradient-to-br from-indigo-50/50 to-blue-50/30 p-6 rounded-[2.5rem] border border-indigo-100/50 shadow-sm hover:shadow-md transition duration-300"
          >
            <div className="flex items-center gap-5">
              {/* Child Avatar Emoji lookup */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-400 text-2xl font-black text-white shadow-md animate-float-slow">
                {child.avatar_id === "astronaut" ? "🧑‍🚀" : child.avatar_id === "explorer" ? "🧭" : child.avatar_id === "artist" ? "🎨" : "🐹"}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-800">{child.nickname}</h3>
                  <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-600">
                    {child.age} tuổi
                  </span>
                </div>
                {child.interests && (
                  <p className="text-xs font-bold text-slate-500">
                    🎯 Sở thích: {child.interests}
                  </p>
                )}
                {child.favorite_subjects && (
                  <p className="text-xs font-bold text-indigo-550">
                    📚 Môn học thích nhất: {child.favorite_subjects}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex gap-2">
                <span className="rounded-xl bg-white/80 border border-slate-100 px-3 py-2 text-xs font-black text-slate-700 shadow-sm">
                  ⭐ Ví: {child.wallet_balance} điểm
                </span>
                <span className="rounded-xl bg-white/80 border border-slate-100 px-3 py-2 text-xs font-black text-slate-700 shadow-sm uppercase">
                  🌐 Ngôn ngữ: {child.default_language}
                </span>
              </div>
              
              <Link
                href={`/child/${child.id}/home`}
                onClick={() => handleSelectChild(child.id)}
                className="bubbly-btn rounded-xl bg-gradient-to-r from-blue-400 to-indigo-400 px-5 py-3 text-xs font-black text-white shadow-md shadow-blue-100 hover:shadow-blue-200 block text-center w-full sm:w-auto"
              >
                🎈 Vào Khu Trẻ Em ➔
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <Link
          href="/onboarding/child-profile"
          className="bubbly-btn inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-5 py-3 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ➕ Thêm tài khoản bé khác
        </Link>
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
  const [children, setChildren] = useState<ChildProfileData[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [paused, setPaused] = useState(false);
  const [dailyCap, setDailyCap] = useState(20);
  const [cooldown, setCooldown] = useState(15);
  const [voice, setVoice] = useState(false);
  const [camera, setCamera] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  // Load children list
  useEffect(() => {
    apiGet<ChildProfileData[]>("/children/", [])
      .then((data) => {
        setChildren(data);
        if (data.length > 0) {
          setSelectedChildId(data[0].id);
          // Set initial values
          const initial = data[0].rules;
          if (initial) {
            setPaused(initial.entertainment_paused);
            setDailyCap(initial.daily_entertainment_cap_minutes);
            setCooldown(initial.cooldown_minutes);
            setVoice(initial.voice_enabled);
            setCamera(initial.camera_enabled);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function handleChildRuleSelection(childId: string) {
    setSelectedChildId(childId);
    const selected = children.find(c => c.id === childId);
    if (selected?.rules) {
      const initial = selected.rules;
      setPaused(initial.entertainment_paused);
      setDailyCap(initial.daily_entertainment_cap_minutes);
      setCooldown(initial.cooldown_minutes);
      setVoice(initial.voice_enabled);
      setCamera(initial.camera_enabled);
    }
  }

  async function handleSaveRules() {
    if (!selectedChildId) return;
    setSaving(true);
    setStatus("");
    try {
      await apiPatch(`/children/${selectedChildId}/rules/`, {
        daily_entertainment_cap_minutes: dailyCap,
        cooldown_minutes: cooldown,
        voice_enabled: voice,
        camera_enabled: camera,
        entertainment_paused: paused,
      });
      setStatus("Cập nhật cấu hình luật bảo vệ thành công! 💾🎉");
      // Update local children rules state
      setChildren(prev => prev.map(c => {
        if (c.id === selectedChildId) {
          return {
            ...c,
            rules: {
              daily_entertainment_cap_minutes: dailyCap,
              cooldown_minutes: cooldown,
              voice_enabled: voice,
              camera_enabled: camera,
              entertainment_paused: paused,
            }
          };
        }
        return c;
      }));
    } catch (err) {
      setStatus("Lỗi: Không thể cập nhật luật lệ.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Panel eyebrow="Cài đặt luật lệ" title="Luật phụ huynh luôn ghi đè ví điểm">
        <div className="text-center py-10 font-bold text-slate-500">Đang tải dữ liệu thiết lập...</div>
      </Panel>
    );
  }

  if (children.length === 0) {
    return (
      <Panel eyebrow="Cài đặt luật lệ" title="Luật phụ huynh luôn ghi đè ví điểm">
        <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-350">
          <p className="text-xs font-black text-slate-500">Vui lòng tạo hồ sơ cho bé trước khi thiết lập luật lệ.</p>
          <Link href="/onboarding/child-profile" className="bubbly-btn mt-4 inline-flex rounded-xl bg-emerald-400 px-6 py-2.5 text-xs font-black text-white">
            ➕ Tạo hồ sơ ngay
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <Panel eyebrow="Cài đặt luật lệ" title="Luật phụ huynh luôn ghi đè ví điểm">
      <div className="space-y-6">
        
        {/* Child Selector Dropdown if multiple children */}
        {children.length > 1 && (
          <label className="grid gap-2 text-xs font-black uppercase tracking-wider text-slate-500 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            Chọn bé để quản lý luật lệ:
            <select
              className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 font-bold text-slate-800 outline-none"
              value={selectedChildId}
              onChange={(e) => handleChildRuleSelection(e.target.value)}
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  Bé {c.nickname} ({c.age} tuổi)
                </option>
              ))}
            </select>
          </label>
        )}

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

        {/* Save feedback alert */}
        {status && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-xs font-bold text-emerald-800">
            {status}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSaveRules}
          disabled={saving}
          type="button"
          className="bubbly-btn min-h-12 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-xs font-black text-white shadow-md"
        >
          {saving ? "Đang lưu cấu hình..." : "Lưu cấu hình luật bảo vệ 💾"}
        </button>

      </div>
    </Panel>
  );
}

export type APIRewardItem = {
  id: string;
  title: string;
  description: string;
  reward_type: "entertainment" | "documentary" | "mascot_item";
  points_cost: number;
  duration_minutes: number;
  approval_status: "approved" | "pending" | "blocked" | "demo_only";
  active: boolean;
  demo_only: boolean;
};

export function ContentApproval() {
  const [items, setItems] = useState<APIRewardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<APIRewardItem[]>("/gamification/reward-items/", [])
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await apiPatch(`/gamification/reward-items/${id}/`, {
        approval_status: "approved"
      });
      setItems(prev => prev.map(item => item.id === id ? { ...item, approval_status: "approved" } : item));
    } catch (err) {
      console.error("Lỗi khi duyệt nội dung:", err);
    }
  };

  const handleBlock = async (id: string) => {
    try {
      await apiPatch(`/gamification/reward-items/${id}/`, {
        approval_status: "blocked"
      });
      setItems(prev => prev.map(item => item.id === id ? { ...item, approval_status: "blocked" } : item));
    } catch (err) {
      console.error("Lỗi khi chặn nội dung:", err);
    }
  };

  if (loading) {
    return (
      <Panel eyebrow="Kho nội dung số" title="Hàng đợi duyệt nội dung & quà tặng">
        <div className="py-8 text-center text-xs font-bold text-slate-400">
          🔄 Đang tải kho nội dung từ máy chủ...
        </div>
      </Panel>
    );
  }

  return (
    <Panel eyebrow="Kho nội dung số" title="Quản lý nội dung & quà tặng an toàn">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs font-bold leading-relaxed text-slate-700">
        Quà tặng đã được hệ thống duyệt an toàn sẽ tự mở cho trẻ khi trẻ đủ điểm và không vi phạm giới hạn/cooldown.
        Phụ huynh không cần duyệt lại từng lần đổi quà. Nếu trẻ thiếu điểm, hệ thống sẽ ghi nhận lượt bị chặn và gợi ý trẻ làm thêm nhiệm vụ.
      </div>
      <div className="overflow-x-auto mt-4 -mx-6 px-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 text-xs font-black uppercase tracking-wider">
              <th className="pb-3">Nội dung</th>
              <th className="pb-3">Phân loại</th>
              <th className="pb-3">Hạn mức</th>
              <th className="pb-3">Trạng thái</th>
              <th className="pb-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-600 text-sm">
            {items.map((item) => (
              <tr className="hover:bg-slate-50/50 transition-colors" key={item.id}>
                <td className="py-4">
                  <div className="font-black text-slate-800">{item.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {item.description || "Nội dung giáo dục do hệ thống chọn lọc."}
                  </div>
                </td>
                <td className="py-4 font-bold text-xs uppercase text-slate-550">{item.reward_type}</td>
                <td className="py-4 font-semibold">{item.duration_minutes > 0 ? `${item.duration_minutes} phút` : "Mascot Item"}</td>
                <td className="py-4">
                  <StatusBadge state={item.approval_status} />
                </td>
                <td className="py-4 text-right space-x-2">
                  {item.approval_status === "pending" && (
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
                  {item.approval_status === "approved" && (
                    <button
                      className="bubbly-btn rounded-lg bg-slate-100 text-rose-500 px-3 py-1.5 text-xs font-black border border-rose-100"
                      onClick={() => handleBlock(item.id)}
                      type="button"
                    >
                      🚫 Chặn lại
                    </button>
                  )}
                  {item.approval_status === "blocked" && (
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
        <p className="mt-2 text-xs font-bold leading-relaxed text-slate-550">
          Trẻ đang có thói quen đọc sách rất tốt vào đầu giờ tối (hoàn thành 3 phiên đọc tuần qua). Đồng thời, hạn mức giải trí được duy trì tốt dưới 25 phút/ngày. Chúng tôi đề xuất tăng nhẹ độ khó các câu đố Toán học và giữ nguyên bài đọc hiểu để thử thách tư duy của con.
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
