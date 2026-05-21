export type LimitState = {
  state: "active" | "break_required" | "offscreen_only" | "session_limit_reached" | "ended";
  active_break_requirement?: {
    started_at: string;
    required_minutes: number;
  };
};

export function clearChildModeSession() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("child_mode_session_id");
    sessionStorage.removeItem("child_mode_session_child_id");
    sessionStorage.removeItem("child_mode_session_usage_id");
    sessionStorage.removeItem("child_mode_session_segment_key");
  }
}

export function isChildModePrompted(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("child_session_prompted") === "true";
}

export function markChildPromptSkipped() {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("child_session_prompted", "true");
  }
}

export function readChildModeSession() {
  if (typeof window === "undefined") return null;
  return {
    childModeSessionId: sessionStorage.getItem("child_mode_session_id"),
    childId: sessionStorage.getItem("child_mode_session_child_id"),
    usageSessionId: sessionStorage.getItem("child_mode_session_usage_id"),
    segmentKey: sessionStorage.getItem("child_mode_session_segment_key"),
  };
}

export function writeChildModeSession({ childModeSessionId, childId }: { childModeSessionId: string; childId: string }) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("child_session_prompted", "true");
    sessionStorage.setItem("child_mode_session_id", childModeSessionId);
    sessionStorage.setItem("child_mode_session_child_id", childId);
  }
}

export function updateChildModeSegment(usageSessionId: string | null, segmentKey: string) {
  if (typeof window !== "undefined") {
    if (usageSessionId) {
      sessionStorage.setItem("child_mode_session_usage_id", usageSessionId);
    }
    sessionStorage.setItem("child_mode_session_segment_key", segmentKey);
  }
}

export function segmentDescriptorForPath(pathname: string | null) {
  if (!pathname) {
    return {
      screen_class: "idle_screen",
      activity_category: "navigation",
      display_category: "home",
      activity_title: "Home",
      session_type: "screen",
    };
  }

  // Parse paths like /child/[id]/move, /child/[id]/watch, etc.
  if (pathname.includes("/move")) {
    return {
      screen_class: "active_screen",
      activity_category: "physical",
      display_category: "movement",
      activity_title: "Thảm tập",
      session_type: "offscreen",
    };
  }
  if (pathname.includes("/create")) {
    return {
      screen_class: "active_screen",
      activity_category: "creative",
      display_category: "art",
      activity_title: "Góc vẽ",
      session_type: "offscreen",
    };
  }
  if (pathname.includes("/study")) {
    return {
      screen_class: "active_screen",
      activity_category: "learning",
      display_category: "study",
      activity_title: "Bàn học",
      session_type: "screen",
    };
  }
  if (pathname.includes("/watch")) {
    return {
      screen_class: "active_screen",
      activity_category: "entertainment",
      display_category: "watch",
      activity_title: "TV",
      session_type: "screen",
    };
  }
  if (pathname.includes("/mascot")) {
    return {
      screen_class: "active_screen",
      activity_category: "reward",
      display_category: "mascot",
      activity_title: "Tủ đồ",
      session_type: "screen",
    };
  }
  if (pathname.includes("/milo")) {
    return {
      screen_class: "active_screen",
      activity_category: "companion",
      display_category: "chat",
      activity_title: "Milo",
      session_type: "screen",
    };
  }
  if (pathname.includes("/missions/") || pathname.includes("/mission/")) {
    return {
      screen_class: "active_screen",
      activity_category: "learning",
      display_category: "missions",
      activity_title: "Nhiệm vụ",
      session_type: "screen",
    };
  }
  
  return {
    screen_class: "idle_screen",
    activity_category: "navigation",
    display_category: "room",
    activity_title: "Phòng của con",
    session_type: "screen",
  };
}
