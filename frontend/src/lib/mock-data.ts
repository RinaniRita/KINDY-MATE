import type { ChildProfile, DashboardSummary, Mission, ParentRule, RewardItem } from "@/types/domain";

export const demoChild: ChildProfile = {
  id: "child-mina",
  nickname: "Mina",
  age: 7,
  avatarId: "milo",
  interests: ["đại dương", "vũ trụ", "truyện ngắn"],
  wallet: 24,
};

export const demoRules: ParentRule = {
  dailyCapMinutes: 25,
  capUsedMinutes: 10,
  cooldownMinutes: 15,
  voiceEnabled: false,
  cameraEnabled: false,
  entertainmentPaused: false,
  requireBalancedMissions: true,
  allowedCategories: ["reading", "learning", "movement", "documentary", "entertainment", "mascot_item"],
};

export const demoMissions: Mission[] = [
  {
    id: "read-cloud",
    type: "reading",
    title: "Đọc truyện: Đám mây biết đếm",
    description: "Đọc truyện ngắn trong 4 phút và trả lời 2 câu hỏi hiểu bài.",
    pointsReward: 8,
    durationMinutes: 4,
    verificationMethod: "Quiz hiểu bài",
    safetyNotes: "Không hỏi bí mật, không trò chuyện tự do.",
  },
  {
    id: "math-stars",
    type: "learning",
    title: "Đếm sao theo nhóm",
    description: "Giải 3 câu cộng đơn giản bằng hình ảnh sao và hành tinh.",
    pointsReward: 9,
    durationMinutes: 5,
    verificationMethod: "Rule-based quiz",
    safetyNotes: "Câu hỏi từ content bank đã duyệt.",
  },
  {
    id: "safe-squats",
    type: "movement",
    title: "10 lần đứng lên ngồi xuống nhẹ",
    description: "Bài vận động ngắn, không cần dụng cụ, có lựa chọn không camera.",
    pointsReward: 6,
    durationMinutes: 3,
    verificationMethod: "Tự xác nhận hoặc camera khi phụ huynh bật",
    safetyNotes: "Cường độ thấp, không chẩn đoán sức khỏe.",
  },
];

export const demoRewards: RewardItem[] = [
  {
    id: "ocean-doc",
    title: "Video đại dương 5 phút",
    rewardType: "documentary",
    pointsCost: 10,
    durationMinutes: 5,
    state: "approved",
    note: "Nội dung placeholder đã duyệt, không autoplay.",
  },
  {
    id: "calm-puzzle",
    title: "Ghép hình bình tĩnh",
    rewardType: "entertainment",
    pointsCost: 8,
    durationMinutes: 6,
    state: "approved",
    note: "Giải trí ngắn, mức kích thích thấp.",
  },
  {
    id: "forest-clip",
    title: "Clip khu rừng cần duyệt",
    rewardType: "documentary",
    pointsCost: 12,
    durationMinutes: 8,
    state: "pending",
    note: "Đang chờ phụ huynh/admin duyệt license và độ tuổi.",
  },
  {
    id: "space-hat",
    title: "Mũ phi hành gia cho mascot",
    rewardType: "mascot_item",
    pointsCost: 6,
    durationMinutes: 0,
    state: "demo_only",
    note: "Cosmetic cố định, không loot box hoặc gacha.",
  },
];

export const demoDashboard: DashboardSummary = {
  learningMinutes: 18,
  readingMinutes: 12,
  movementMinutes: 9,
  entertainmentMinutesToday: 10,
  pointsEarned: 31,
  pointsSpent: 18,
  missionCompletionRate: 74,
  alerts: [
    "Còn 15 phút giải trí theo giới hạn hôm nay.",
    "Nhiệm vụ đọc đã hoàn thành ít nhất một lần trước giải trí.",
    "Không có cảnh báo khẩn cấp. Bảng tổng quan không gắn nhãn hoặc chẩn đoán trẻ.",
  ],
};

export const categories = [
  { id: "reading", label: "Đọc" },
  { id: "learning", label: "Học" },
  { id: "movement", label: "Vận động" },
  { id: "documentary", label: "Tài liệu ngắn" },
  { id: "entertainment", label: "Giải trí lành mạnh" },
  { id: "mascot_item", label: "Bạn dẫn đường" },
];
