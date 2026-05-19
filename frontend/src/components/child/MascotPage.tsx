"use client";

import { useEffect, useMemo, useState } from "react";

import { apiGetRequired } from "@/lib/api";

import { MascotVisual } from "./MascotVisual";
import type { ChildProfileData, MascotInventoryItem, MascotStoreItem } from "./types";

const EQUIPPED_KEY = "kindy_mate_mascot_equipped";

type EquippedState = {
  accessory?: string;
  outfit?: string;
  background?: string;
  room?: string;
  badge?: string;
};

const itemTypeLabels: Record<string, string> = {
  accessory: "Phụ kiện",
  outfit: "Trang phục",
  background: "Phông nền",
  room: "Căn phòng",
  badge: "Huy hiệu",
};

function readEquipped(childId: string): EquippedState {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(`${EQUIPPED_KEY}_${childId}`);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as EquippedState;
  } catch {
    return {};
  }
}

function saveEquipped(childId: string, value: EquippedState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${EQUIPPED_KEY}_${childId}`, JSON.stringify(value));
}

export function MascotPage({ childId }: { childId: string }) {
  const [child, setChild] = useState<ChildProfileData | null>(null);
  const [inventory, setInventory] = useState<MascotInventoryItem[]>([]);
  const [storeItems, setStoreItems] = useState<MascotStoreItem[]>([]);
  const [equipped, setEquipped] = useState<EquippedState>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [childData, inventoryData, storeData] = await Promise.all([
          apiGetRequired<ChildProfileData>(`/children/${childId}/`),
          apiGetRequired<MascotInventoryItem[]>(`/gamification/mascot-inventory/?child_id=${childId}`),
          apiGetRequired<MascotStoreItem[]>(`/gamification/mascot-items/`),
        ]);
        setChild(childData);
        setInventory(inventoryData);
        setStoreItems(storeData);
        setEquipped(readEquipped(childId));
      } finally {
        setLoading(false);
      }
    }
    load().catch(() => setLoading(false));
  }, [childId]);

  const ownedIds = useMemo(() => new Set(inventory.map((entry) => entry.item.id)), [inventory]);

  function handleEquip(item: MascotInventoryItem["item"]) {
    const next = {
      ...equipped,
      [item.item_type]: item.name,
    };
    setEquipped(next);
    saveEquipped(childId, next);
  }

  if (loading || !child) {
    return (
      <div className="child-scene-shell rounded-[2.2rem] px-6 py-20 text-center">
        <p className="relative z-10 text-sm font-black text-slate-500">Milo đang mở tủ đồ cho cậu...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="child-scene-shell rounded-[2.4rem] px-5 py-6 md:px-8 md:py-8">
        <div className="relative z-10 space-y-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Tủ đồ Milo</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-800 sm:text-5xl">Milo đứng đây để cậu thay đồ thật nhanh.</h1>
            <p className="mt-4 max-w-xl text-base font-bold leading-8 text-slate-600">
              Chọn một món đã mở khóa. Tớ sẽ mặc ngay cho cậu xem.
            </p>
          </div>

          <div className="child-stage-board rounded-[2.1rem] px-5 py-6">
            <div className="relative z-10 flex justify-center">
              <MascotVisual mood="cheer" size="lg" message="Tớ thích những món cậu đã mở khóa." />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(itemTypeLabels).map(([itemType, label]) => (
              <div key={itemType} className="child-island-card rounded-[1.6rem] px-4 py-4">
                <div className="relative z-10">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
                  <p className="mt-2 text-sm font-black text-slate-700">{equipped[itemType as keyof EquippedState] || "Chưa chọn"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6">
        <section className="child-stage-board rounded-[2.2rem] px-5 py-6 md:px-7 md:py-7">
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Đã mở khóa</p>
                <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-800">Chọn món cho Milo</h2>
              </div>
              <div className="child-mini-badge">🎁 {inventory.length} món</div>
            </div>

            {inventory.length ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {inventory.map((entry) => {
                  const isEquipped = equipped[entry.item.item_type as keyof EquippedState] === entry.item.name;
                  return (
                    <article key={entry.id} className="child-island-card rounded-[2rem] px-5 py-5">
                      <div className="relative z-10">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                              {itemTypeLabels[entry.item.item_type] || entry.item.item_type}
                            </p>
                            <h3 className="mt-2 text-2xl font-black leading-tight text-slate-800">{entry.item.name}</h3>
                          </div>
                          <div className="child-mini-badge">✅ Đã mở</div>
                        </div>

                        <p className="mt-4 text-sm font-bold leading-7 text-slate-600">
                          Đây là món cậu đã có rồi. Cậu chỉ cần chạm để dùng ngay cho Milo.
                        </p>

                        <button
                          type="button"
                          onClick={() => handleEquip(entry.item)}
                          className={`mt-5 min-h-12 w-full rounded-[1.5rem] text-sm font-black shadow-md ${
                            isEquipped
                              ? "bg-gradient-to-r from-[#9dd9c6] to-[#bde6d9] text-slate-800"
                              : "border border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          {isEquipped ? "Milo đang dùng món này" : "Dùng món này"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-6 text-sm font-bold leading-7 text-slate-600">
                Cậu chưa có món nào cho Milo. Khi mở được quà thuộc nhóm mascot, chúng sẽ hiện ở đây.
              </p>
            )}
          </div>
        </section>

        <section className="child-stage-board rounded-[2.2rem] px-5 py-6 md:px-7 md:py-7">
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Tiếp theo</p>
                <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-800">Những món Milo có thể có</h2>
              </div>
              <div className="child-mini-badge">🌟 Gợi ý</div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {storeItems.map((item) => (
                <article key={item.id} className="child-island-card rounded-[2rem] px-5 py-5">
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                          {itemTypeLabels[item.item_type] || item.item_type}
                        </p>
                        <h3 className="mt-2 text-2xl font-black leading-tight text-slate-800">{item.name}</h3>
                      </div>
                      <div className="child-mini-badge">{item.points_cost} điểm</div>
                    </div>

                    <p className="mt-4 text-sm font-bold leading-7 text-slate-600">
                      {ownedIds.has(item.id)
                        ? "Cậu đã có món này rồi."
                        : "Món này sẽ xuất hiện trong khu vui chơi khi hệ thống có phần thưởng tương ứng."}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
