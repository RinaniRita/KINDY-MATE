"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Panel } from "@/components/common/Cards";
import { apiGetRequired } from "@/lib/api";
import { triggerChildEntry } from "@/lib/parent-actions";

type ChildProfileData = {
  id: string;
  nickname: string;
  age: number;
  avatar_id: string;
  interests: string;
  favorite_subjects: string;
  default_language: string;
};

function childEmoji(avatarId: string) {
  if (avatarId === "astronaut") return "🧑‍🚀";
  if (avatarId === "explorer") return "🧭";
  if (avatarId === "artist") return "🎨";
  return "🐹";
}

export function ChildrenManager() {
  const [children, setChildren] = useState<ChildProfileData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetRequired<ChildProfileData[]>("/children/")
      .then((data) => {
        setChildren(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Panel eyebrow="Con của tôi" title="Đang tải hồ sơ trẻ">
        <div className="py-10 text-center font-bold text-slate-500">Kindy-Mate đang tải hồ sơ của các bé...</div>
      </Panel>
    );
  }

  if (!children.length) {
    return (
      <Panel eyebrow="Con của tôi" title="Chưa có hồ sơ trẻ nào">
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
          <span className="text-4xl">👧👦</span>
          <h4 className="mt-4 text-lg font-black text-slate-800">Tạo hồ sơ đầu tiên cho bé</h4>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
            Mỗi bé có luật dùng app, nhóm nội dung được phép và báo cáo riêng. Hãy tạo hồ sơ để bắt đầu.
          </p>
          <Link
            href="/onboarding/child-profile"
            className="bubbly-btn mt-6 inline-flex rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 px-6 py-3 text-sm font-black text-white shadow-md shadow-emerald-100 hover:shadow-emerald-200"
          >
            Tạo hồ sơ cho bé
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <Panel eyebrow="Con của tôi" title="Hồ sơ trẻ trong gia đình">
      <div className="grid gap-5">
        {children.map((child) => (
          <div
            key={child.id}
            className="flex flex-col gap-5 rounded-[2rem] border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-emerald-400 to-teal-400 text-2xl text-white shadow-md">
                {childEmoji(child.avatar_id)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-800">{child.nickname}</h3>
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-600">
                    {child.age} tuổi
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-500">
                  {child.interests ? `Sở thích: ${child.interests}` : "Chưa thêm sở thích"}
                </p>
                <p className="text-xs font-bold text-slate-400">
                  {child.default_language.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/parent/children/${child.id}`}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm"
              >
                Xem hồ sơ
              </Link>
              <button
                type="button"
                onClick={() => triggerChildEntry(child.id)}
                className="rounded-2xl bg-slate-800 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-200"
              >
                Vào khu trẻ em
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <Link
          href="/onboarding/child-profile"
          className="bubbly-btn inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Thêm hồ sơ trẻ khác
        </Link>
      </div>
    </Panel>
  );
}

function LegacyNotice({
  eyebrow,
  title,
  description,
  href,
  cta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <Panel eyebrow={eyebrow} title={title}>
      <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-5">
        <p className="text-sm font-semibold leading-7 text-slate-600">{description}</p>
        <Link
          href={href}
          className="mt-4 inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm"
        >
          {cta}
        </Link>
      </div>
    </Panel>
  );
}

export function RulesManager() {
  return (
    <LegacyNotice
      eyebrow="Điều hướng cũ"
      title="Luật sử dụng đã chuyển vào hồ sơ từng trẻ"
      description="Luật không còn là một tab độc lập. Mỗi trẻ có preset, giới hạn thời gian, category control và emergency pause riêng trong trang hồ sơ của bé."
      href="/parent/children"
      cta="Mở Con của tôi"
    />
  );
}

export function ContentApproval() {
  return (
    <LegacyNotice
      eyebrow="Điều hướng cũ"
      title="Duyệt nội dung không còn nằm ở parent UI chính"
      description="Nội dung trong Kindy-Mate đã được tuyển chọn sẵn. Phụ huynh chỉ cần bật hoặc tắt nhóm nội dung phù hợp với con trong hồ sơ từng trẻ."
      href="/parent/children"
      cta="Mở hồ sơ trẻ"
    />
  );
}

export function Reports() {
  return (
    <LegacyNotice
      eyebrow="Điều hướng cũ"
      title="Báo cáo đã có trang riêng"
      description="Timeline, xu hướng và phân tích sâu hiện nằm trong trang Báo cáo mới của khu phụ huynh."
      href="/parent/reports"
      cta="Mở Báo cáo"
    />
  );
}

export function Settings() {
  return (
    <LegacyNotice
      eyebrow="Điều hướng cũ"
      title="Cài đặt đã chuyển vào khu tài khoản phụ huynh"
      description="PIN phụ huynh, xuất/xóa dữ liệu, quyền riêng tư và ngôn ngữ hiện nằm trong menu tài khoản và trang Cài đặt chung."
      href="/parent/settings"
      cta="Mở Cài đặt"
    />
  );
}
