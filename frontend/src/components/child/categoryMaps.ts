export const missionCategoryOrder = [
  "hoc_hanh",
  "doc_sach",
  "van_dong",
  "ky_nang_song",
  "sang_tao",
];

export const rewardCategoryOrder = [
  "phim_hoat_hinh",
  "kham_pha_khoa_hoc",
  "to_mau",
  "game_nhe_nhang",
  "mascot",
];

export const missionCategoryMeta: Record<string, { label: string; tone: string; icon: string }> = {
  hoc_hanh: { label: "Học hành", tone: "from-[#dff6ee] to-[#effcf7]", icon: "🎓" },
  doc_sach: { label: "Đọc sách", tone: "from-[#dff0ff] to-[#f3f9ff]", icon: "📚" },
  van_dong: { label: "Vận động", tone: "from-[#fff4c8] to-[#fff9e7]", icon: "🤸" },
  ky_nang_song: { label: "Kỹ năng sống", tone: "from-[#f8ead7] to-[#fff5ea]", icon: "🌱" },
  sang_tao: { label: "Sáng tạo", tone: "from-[#efe8ff] to-[#f7f4ff]", icon: "🎨" },
};

export const rewardCategoryMeta: Record<string, { label: string; tone: string; icon: string }> = {
  phim_hoat_hinh: { label: "Phim hoạt hình", tone: "from-[#dff0ff] to-[#f3f9ff]", icon: "🎬" },
  kham_pha_khoa_hoc: { label: "Khám phá khoa học", tone: "from-[#dff6ee] to-[#effcf7]", icon: "🔭" },
  to_mau: { label: "Tô màu", tone: "from-[#fff4c8] to-[#fff9e7]", icon: "🖍️" },
  game_nhe_nhang: { label: "Game nhẹ nhàng", tone: "from-[#efe8ff] to-[#f7f4ff]", icon: "🧩" },
  mascot: { label: "Đồ cho mascot", tone: "from-[#f8ead7] to-[#fff5ea]", icon: "🧸" },
};
