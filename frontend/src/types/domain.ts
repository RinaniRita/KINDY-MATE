export type ContentState = "approved" | "pending" | "blocked" | "demo_only";
export type MissionType = "reading" | "learning" | "movement" | "creative" | "reflection";

export type ChildProfile = {
  id: string;
  nickname: string;
  age: number;
  avatarId: string;
  interests: string[];
  wallet: number;
};

export type ParentRule = {
  dailyCapMinutes: number;
  capUsedMinutes: number;
  cooldownMinutes: number;
  voiceEnabled: boolean;
  cameraEnabled: boolean;
  entertainmentPaused: boolean;
  requireBalancedMissions: boolean;
  allowedCategories: string[];
};

export type Mission = {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  pointsReward: number;
  durationMinutes: number;
  verificationMethod: string;
  safetyNotes: string;
};

export type RewardItem = {
  id: string;
  title: string;
  rewardType: "documentary" | "entertainment" | "mascot_item";
  pointsCost: number;
  durationMinutes: number;
  state: ContentState;
  note: string;
};

export type DashboardSummary = {
  learningMinutes: number;
  readingMinutes: number;
  movementMinutes: number;
  entertainmentMinutesToday: number;
  pointsEarned: number;
  pointsSpent: number;
  missionCompletionRate: number;
  alerts: string[];
};
