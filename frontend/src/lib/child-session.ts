export type SegmentDescriptor = {
  screen_class:
    | "screen_learning"
    | "screen_discovery"
    | "screen_healthy_entertainment"
    | "screen_mascot"
    | "offscreen_task"
    | "offscreen_break"
    | "idle_screen";
  activity_category:
    | "learning"
    | "reading"
    | "discovery"
    | "healthy_entertainment"
    | "mascot"
    | "movement"
    | "creativity"
    | "life_skill"
    | "break"
    | "idle";
  display_category: string;
  activity_title: string;
  session_type: string;
};

export type LimitState = {
  state: "active" | "inactive" | "break_required" | "offscreen_only" | "session_limit_reached" | "ended";
  remaining_session_minutes: number;
  remaining_screen_minutes: number;
  remaining_continuous_screen_minutes: number;
  active_break_requirement: {
    id: string;
    status: string;
    required_minutes: number;
    started_at: string;
    timer_completed_at: string | null;
    task_completed_at: string | null;
    reason_code: string;
  } | null;
  next_allowed_screen_at: string | null;
  current_session_minutes?: number;
  current_screen_minutes?: number;
  current_continuous_screen_minutes?: number;
  current_offscreen_minutes?: number;
};

const STORAGE_KEYS = {
  active: "child_session_active",
  prompted: "child_session_prompted",
  sessionId: "child_mode_session_id",
  childId: "child_id_active",
  segmentId: "child_active_segment_id",
  segmentKey: "child_active_segment_key",
};

export function readChildModeSession() {
  if (typeof window === "undefined") return null;
  const active = sessionStorage.getItem(STORAGE_KEYS.active) === "true";
  const childModeSessionId = sessionStorage.getItem(STORAGE_KEYS.sessionId) || "";
  if (!active || !childModeSessionId) return null;
  return {
    childModeSessionId,
    childId: sessionStorage.getItem(STORAGE_KEYS.childId) || "",
    usageSessionId: sessionStorage.getItem(STORAGE_KEYS.segmentId) || "",
    segmentKey: sessionStorage.getItem(STORAGE_KEYS.segmentKey) || "",
  };
}

export function writeChildModeSession(payload: {
  childModeSessionId: string;
  childId: string;
  usageSessionId?: string | null;
  segmentKey?: string | null;
}) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEYS.active, "true");
  sessionStorage.setItem(STORAGE_KEYS.prompted, "true");
  sessionStorage.setItem(STORAGE_KEYS.sessionId, payload.childModeSessionId);
  sessionStorage.setItem(STORAGE_KEYS.childId, payload.childId);
  if (payload.usageSessionId) {
    sessionStorage.setItem(STORAGE_KEYS.segmentId, payload.usageSessionId);
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.segmentId);
  }
  if (payload.segmentKey) {
    sessionStorage.setItem(STORAGE_KEYS.segmentKey, payload.segmentKey);
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.segmentKey);
  }
}

export function updateChildModeSegment(usageSessionId?: string | null, segmentKey?: string | null) {
  if (typeof window === "undefined") return;
  if (usageSessionId) {
    sessionStorage.setItem(STORAGE_KEYS.segmentId, usageSessionId);
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.segmentId);
  }
  if (segmentKey) {
    sessionStorage.setItem(STORAGE_KEYS.segmentKey, segmentKey);
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.segmentKey);
  }
}

export function markChildPromptSkipped() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEYS.prompted, "true");
  sessionStorage.setItem(STORAGE_KEYS.active, "false");
  sessionStorage.removeItem(STORAGE_KEYS.sessionId);
  sessionStorage.removeItem(STORAGE_KEYS.segmentId);
  sessionStorage.removeItem(STORAGE_KEYS.segmentKey);
  sessionStorage.removeItem(STORAGE_KEYS.childId);
}

export function clearChildModeSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEYS.prompted);
  sessionStorage.removeItem(STORAGE_KEYS.active);
  sessionStorage.removeItem(STORAGE_KEYS.sessionId);
  sessionStorage.removeItem(STORAGE_KEYS.segmentId);
  sessionStorage.removeItem(STORAGE_KEYS.segmentKey);
  sessionStorage.removeItem(STORAGE_KEYS.childId);
}

export function isChildModePrompted() {
  if (typeof window === "undefined") return false;
  return Boolean(sessionStorage.getItem(STORAGE_KEYS.prompted));
}

export function segmentDescriptorForPath(pathname: string | null | undefined): SegmentDescriptor {
  if (!pathname) {
    return {
      screen_class: "idle_screen",
      activity_category: "idle",
      display_category: "idle",
      activity_title: "Phòng của con",
      session_type: "screen_time",
    };
  }
  if (pathname.includes("/move")) {
    return {
      screen_class: "offscreen_task",
      activity_category: "movement",
      display_category: "van_dong",
      activity_title: "Thảm tập",
      session_type: "movement",
    };
  }
  if (pathname.includes("/create")) {
    return {
      screen_class: "offscreen_task",
      activity_category: "creativity",
      display_category: "sang_tao",
      activity_title: "Góc vẽ",
      session_type: "creative",
    };
  }
  if (pathname.includes("/milo") || pathname.includes("/mascot")) {
    return {
      screen_class: "screen_mascot",
      activity_category: "mascot",
      display_category: "mascot",
      activity_title: pathname.includes("/mascot") ? "Tủ đồ" : "Milo",
      session_type: "customization",
    };
  }
  if (pathname.includes("/watch")) {
    return {
      screen_class: "screen_healthy_entertainment",
      activity_category: "healthy_entertainment",
      display_category: "phim_hoat_hinh",
      activity_title: "TV",
      session_type: "entertainment",
    };
  }
  if (pathname.includes("/study") || pathname.includes("/mission/")) {
    return {
      screen_class: "screen_learning",
      activity_category: "learning",
      display_category: "hoc_hanh",
      activity_title: pathname.includes("/mission/") ? "Chi tiết nhiệm vụ" : "Bàn học",
      session_type: "learning",
    };
  }
  return {
    screen_class: "idle_screen",
    activity_category: "idle",
    display_category: "idle",
    activity_title: "Phòng của con",
    session_type: "screen_time",
  };
}

export function parseClock(raw: string | null) {
  if (!raw) return null;
  const [hourText = "0", minuteText = "0", secondText = "0"] = raw.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if ([hour, minute, second].some((value) => Number.isNaN(value))) return null;
  return { hour, minute, second };
}

export function isBedtimeLockedAt(startRaw: string | null, endRaw: string | null, now: Date) {
  const start = parseClock(startRaw);
  const end = parseClock(endRaw);
  if (!start || !end) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}
