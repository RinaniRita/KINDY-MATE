export type ChildProfileData = {
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

export type ChildDashboardData = {
  child: {
    id: string;
    nickname: string;
    age: number;
  };
  wallet: {
    points_balance: number;
    points_earned_total: number;
    points_spent_total: number;
  };
  rules: {
    daily_entertainment_cap_minutes: number;
    entertainment_paused: boolean;
    voice_enabled: boolean;
    camera_enabled: boolean;
  };
  metrics: {
    learning_minutes: number;
    reading_minutes: number;
    movement_minutes: number;
    creative_minutes: number;
    entertainment_minutes_today: number;
    documentary_minutes: number;
    screen_time_minutes: number;
    total_app_minutes: number;
    mission_completion_count: number;
    blocked_attempts: number;
    cap_left_today: number;
  };
  mission_mix: Record<string, number>;
  alerts: string[];
};

export type MissionData = {
  id: string;
  mission_type: string;
  mission_type_label: string;
  display_category: string;
  display_category_label: string;
  title: string;
  description: string;
  points_reward: number;
  estimated_duration_minutes: number;
  requires_voice: boolean;
  requires_camera: boolean;
  verification_method: string;
  safety_notes: string;
};

export type RewardItemData = {
  id: string;
  title: string;
  description: string;
  reward_type: "entertainment" | "documentary" | "mascot_item";
  reward_type_label: string;
  display_category: string;
  display_category_label: string;
  points_cost: number;
  duration_minutes: number;
  approval_status: "approved" | "pending" | "blocked";
  active: boolean;
  demo_only: boolean;
  is_accessible: boolean | null;
  blocked_reason: string;
};

export type MascotInventoryItem = {
  id: string;
  item: {
    id: string;
    name: string;
    item_type: string;
    points_cost: number;
    image_url: string;
  };
  unlocked_at: string;
};

export type MascotStoreItem = {
  id: string;
  name: string;
  item_type: string;
  points_cost: number;
  image_url: string;
};
