"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/common/AppShell";
import { Panel } from "@/components/common/Cards";
import { publicRoutes } from "@/lib/routes";
import { apiGet } from "@/lib/api";

type ChildProfileData = {
  id: string;
  nickname: string;
  age: number;
  avatar_id: string;
};

export default function SelectProfilePage() {
  const [children, setChildren] = useState<ChildProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<ChildProfileData[]>("/children/", [])
      .then((data) => {
        setChildren(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Không thể kết nối máy chủ.");
        setLoading(false);
      });
  }, []);

  function handleSelectChild(childId: string) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("active_child_id", childId);
    }
  }

  return (
    <AppShell nav={publicRoutes} subtitle="Chuyển sang khu trẻ em từ phiên phụ huynh" title="Khu trẻ em">
      <div className="max-w-2xl mx-auto py-4">
        <Panel eyebrow="Khu trẻ em" title="Chọn hồ sơ trẻ để cùng chơi & học 🎈">
          <p className="text-xs font-semibold leading-relaxed text-slate-500 mb-6">
            Khu trẻ em được mở từ phiên của cha mẹ. Hệ thống sẽ ẩn toàn bộ phần cấu hình, báo cáo, và duyệt nội dung nhạy cảm của phụ huynh để con yên tâm trải nghiệm lành mạnh.
          </p>

          {loading ? (
            <div className="text-center py-10 font-bold text-slate-400">Đang tìm kiếm hồ sơ...</div>
          ) : children.length === 0 ? (
            <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-3xl">👧👦</span>
              <p className="mt-3 text-xs font-black text-slate-700">Chưa có hồ sơ trẻ nhỏ nào được khởi tạo.</p>
              <p className="text-[10px] font-bold text-slate-400 mt-1 leading-normal">
                Vui lòng vào khu phụ huynh để khởi tạo ít nhất một hồ sơ trẻ trước khi sử dụng khu trẻ em.
              </p>
              <Link
                href="/onboarding/child-profile"
                className="bubbly-btn mt-5 inline-flex rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 px-6 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-100"
              >
                Tạo hồ sơ cho bé ngay ➔
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {children.map((child) => (
                <Link
                  key={child.id}
                  href={`/child/${child.id}/home`}
                  onClick={() => handleSelectChild(child.id)}
                  className="p-6 rounded-3xl border border-slate-200/70 bg-white hover:border-blue-400 hover:bg-blue-50/10 transition-all flex items-center gap-4 group cursor-pointer text-left shadow-sm hover:shadow-md"
                >
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-400 text-2xl font-black text-white flex items-center justify-center shadow group-hover:scale-105 transition-transform">
                    {child.avatar_id === "astronaut" ? "🧑‍🚀" : child.avatar_id === "explorer" ? "🧭" : child.avatar_id === "artist" ? "🎨" : "🐹"}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-lg leading-snug group-hover:text-blue-500 transition-colors">
                      Bé {child.nickname}
                    </h4>
                    <span className="inline-block mt-0.5 rounded-full bg-slate-50 border border-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                      {child.age} tuổi
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8 border-t border-slate-100 pt-6 flex justify-between items-center">
            <Link
              href="/parent/dashboard"
              className="text-xs font-black text-slate-550 hover:text-slate-800 transition-colors flex items-center gap-1"
            >
              🛡️ Về trang quản trị phụ huynh
            </Link>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
