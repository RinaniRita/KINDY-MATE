export type HubHotspot = {
  key: "study" | "watch" | "move" | "create" | "mascot" | "milo";
  hrefKey: "study" | "watch" | "move" | "create" | "mascot" | "milo";
  title: string;
  caption: string;
  icon: string;
  left: number;
  top: number;
};

export const hubHotspots: HubHotspot[] = [
  {
    key: "study",
    hrefKey: "study",
    title: "Bàn học",
    caption: "Quiz và học tập",
    icon: "✏️",
    left: 19,
    top: 36,
  },
  {
    key: "watch",
    hrefKey: "watch",
    title: "TV",
    caption: "Xem cùng Milo",
    icon: "📺",
    left: 49,
    top: 23,
  },
  {
    key: "mascot",
    hrefKey: "mascot",
    title: "Tủ đồ",
    caption: "Đổi đồ cho Milo",
    icon: "🎒",
    left: 79,
    top: 33,
  },
  {
    key: "move",
    hrefKey: "move",
    title: "Thảm tập",
    caption: "Bài vận động",
    icon: "🤸",
    left: 20,
    top: 82,
  },
  {
    key: "create",
    hrefKey: "create",
    title: "Góc vẽ",
    caption: "Sáng tạo",
    icon: "🎨",
    left: 77,
    top: 79,
  },
  {
    key: "milo",
    hrefKey: "milo",
    title: "Milo",
    caption: "Gợi ý và trò chuyện",
    icon: "✨",
    left: 54,
    top: 63,
  },
];

export const hubSpeechByZone: Record<HubHotspot["key"], string> = {
  study: "Cậu muốn sang bàn học à? Tớ có vài câu hỏi ngắn cho cậu.",
  watch: "Cậu muốn giải trí à? Tớ sẽ chỉ mở những gì an toàn nhé.",
  move: "Mình vận động một chút nhé? Chỉ vài phút thôi.",
  create: "Góc vẽ đang sáng đèn rồi. Cậu muốn làm gì mới không?",
  mascot: "Muốn đổi đồ cho tớ à? Chạm vào tủ đồ nhé.",
  milo: "Tớ ở đây này. Nếu cậu cần gợi ý, cứ chạm vào tớ.",
};
