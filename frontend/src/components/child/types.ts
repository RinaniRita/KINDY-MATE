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
    session_duration_limit_minutes: number;
    total_screen_time_limit_minutes: number;
    continuous_screen_time_limit_minutes: number;
    minimum_offscreen_break_minutes: number;
    time_profile: string;
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
    discovery_minutes: number;
    healthy_entertainment_minutes: number;
    mascot_minutes: number;
    screen_time_minutes: number;
    total_app_minutes: number;
    mission_completion_count: number;
    blocked_attempts: number;
    cap_left_today: number;
  };
  mission_mix: Record<string, number>;
  alerts: string[];
  current_session: {
    id: string;
    status: string;
    current_session_minutes: number;
    current_screen_minutes: number;
    current_continuous_screen_minutes: number;
    current_offscreen_minutes: number;
    remaining_session_minutes: number;
    remaining_screen_minutes: number;
    remaining_continuous_screen_minutes: number;
    current_activity_type: string;
    current_activity_title: string;
    last_heartbeat_at: string | null;
  } | null;
  limit_state: {
    state: string;
    break_required: boolean;
    remaining_session_minutes: number;
    remaining_screen_minutes: number;
    remaining_continuous_screen_minutes: number;
    next_allowed_screen_at: string | null;
  };
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
  source_content?: {
    id: string;
    content_body: string;
    media_url: string;
  } | null;
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
