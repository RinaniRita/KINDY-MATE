from datetime import timedelta

from django.utils import timezone

from apps.profiles.time_rules import ceiling_for_age

from .models import BreakRequirement, ChildModeSession, UsageSession


HEARTBEAT_INTERVAL_SECONDS = 15
HEARTBEAT_TIMEOUT_SECONDS = 90
SESSION_ABANDONED_AFTER_SECONDS = 600
IDLE_THRESHOLD_SECONDS = 30


SCREEN_SESSION_TYPES = {
    UsageSession.SessionType.LEARNING,
    UsageSession.SessionType.READING,
    UsageSession.SessionType.ENTERTAINMENT,
    UsageSession.SessionType.DOCUMENTARY,
    UsageSession.SessionType.CUSTOMIZATION,
    UsageSession.SessionType.SCREEN_TIME,
}


def elapsed_seconds(started_at, ended_at):
    if not started_at or not ended_at or ended_at <= started_at:
        return 0
    return max(int((ended_at - started_at).total_seconds()), 0)


def seconds_to_minutes(seconds):
    return max(int(seconds // 60), 0)


def merge_elapsed_minutes(base_minutes, started_at, now):
    return base_minutes + seconds_to_minutes(elapsed_seconds(started_at, now))


def is_screen_based(screen_class):
    return screen_class in {
        UsageSession.ScreenClass.SCREEN_LEARNING,
        UsageSession.ScreenClass.SCREEN_DISCOVERY,
        UsageSession.ScreenClass.SCREEN_HEALTHY_ENTERTAINMENT,
        UsageSession.ScreenClass.SCREEN_MASCOT,
        UsageSession.ScreenClass.IDLE_SCREEN,
    }


def session_type_for_screen_class(screen_class):
    mapping = {
        UsageSession.ScreenClass.SCREEN_LEARNING: UsageSession.SessionType.LEARNING,
        UsageSession.ScreenClass.SCREEN_DISCOVERY: UsageSession.SessionType.DOCUMENTARY,
        UsageSession.ScreenClass.SCREEN_HEALTHY_ENTERTAINMENT: UsageSession.SessionType.ENTERTAINMENT,
        UsageSession.ScreenClass.SCREEN_MASCOT: UsageSession.SessionType.CUSTOMIZATION,
        UsageSession.ScreenClass.OFFSCREEN_TASK: UsageSession.SessionType.MOVEMENT,
        UsageSession.ScreenClass.OFFSCREEN_BREAK: UsageSession.SessionType.REFLECTION,
        UsageSession.ScreenClass.IDLE_SCREEN: UsageSession.SessionType.SCREEN_TIME,
    }
    return mapping.get(screen_class, UsageSession.SessionType.SCREEN_TIME)


def sync_break_requirement(child_session, now=None):
    now = now or timezone.now()
    active_break = (
        BreakRequirement.objects.filter(
            child_mode_session=child_session,
            status=BreakRequirement.Status.PENDING,
        )
        .order_by("-started_at")
        .first()
    )
    if not active_break:
        return None

    if (
        active_break.timer_completed_at is None
        and now >= active_break.started_at + timedelta(minutes=active_break.required_minutes)
    ):
        active_break.timer_completed_at = now

    if active_break.timer_completed_at and active_break.task_completed_at:
        active_break.status = BreakRequirement.Status.COMPLETED
        child_session.continuous_screen_minutes = 0
        child_session.save(update_fields=["continuous_screen_minutes", "updated_at"])

    active_break.save(
        update_fields=["timer_completed_at", "status", "updated_at"]
        if active_break.status == BreakRequirement.Status.COMPLETED
        else ["timer_completed_at", "updated_at"]
    )
    return active_break


def current_segment_minutes(segment, now=None):
    if not segment:
        return 0
    now = now or timezone.now()
    return seconds_to_minutes(elapsed_seconds(segment.started_at, now))


def compute_live_counters(child_session, now=None):
    now = now or timezone.now()
    session_minutes = child_session.session_minutes
    screen_minutes = child_session.screen_minutes
    continuous_screen_minutes = child_session.continuous_screen_minutes
    offscreen_minutes = child_session.offscreen_minutes
    active_segment = (
        UsageSession.objects.filter(
            child_mode_session=child_session,
            status=UsageSession.Status.ACTIVE,
            ended_at__isnull=True,
        )
        .order_by("-started_at")
        .first()
    )

    if active_segment:
        live_minutes = current_segment_minutes(active_segment, now)
        session_minutes += live_minutes
        if active_segment.screen_based:
            screen_minutes += live_minutes
            continuous_screen_minutes += live_minutes
        else:
            offscreen_minutes += live_minutes

    return {
        "session_minutes": session_minutes,
        "screen_minutes": screen_minutes,
        "continuous_screen_minutes": continuous_screen_minutes,
        "offscreen_minutes": offscreen_minutes,
        "active_segment": active_segment,
    }


def current_limit_state(child_session, now=None):
    now = now or timezone.now()
    counters = compute_live_counters(child_session, now)
    rules = child_session.child.rules
    remaining_session = max(rules.session_duration_limit_minutes - counters["session_minutes"], 0)
    remaining_screen = max(rules.total_screen_time_limit_minutes - counters["screen_minutes"], 0)
    remaining_continuous = max(
        rules.continuous_screen_time_limit_minutes - counters["continuous_screen_minutes"],
        0,
    )
    active_break = sync_break_requirement(child_session, now)

    if child_session.status != ChildModeSession.Status.ACTIVE:
        state = "ended"
    elif remaining_session <= 0:
        state = "session_limit_reached"
    elif active_break and active_break.status == BreakRequirement.Status.PENDING:
        state = "break_required"
    elif remaining_screen <= 0:
        state = "offscreen_only"
    else:
        state = "active"

    next_allowed_screen_at = None
    if active_break and active_break.status == BreakRequirement.Status.PENDING:
        next_allowed_screen_at = (
            active_break.started_at + timedelta(minutes=active_break.required_minutes)
        ).isoformat()

    return {
        "state": state,
        "remaining_session_minutes": remaining_session,
        "remaining_screen_minutes": remaining_screen,
        "remaining_continuous_screen_minutes": remaining_continuous,
        "active_break_requirement": serialize_break_requirement(active_break),
        "next_allowed_screen_at": next_allowed_screen_at,
        "current_session_minutes": counters["session_minutes"],
        "current_screen_minutes": counters["screen_minutes"],
        "current_continuous_screen_minutes": counters["continuous_screen_minutes"],
        "current_offscreen_minutes": counters["offscreen_minutes"],
    }


def serialize_break_requirement(active_break):
    if not active_break:
        return None
    return {
        "id": active_break.id,
        "status": active_break.status,
        "required_minutes": active_break.required_minutes,
        "started_at": active_break.started_at.isoformat(),
        "timer_completed_at": active_break.timer_completed_at.isoformat() if active_break.timer_completed_at else None,
        "task_completed_at": active_break.task_completed_at.isoformat() if active_break.task_completed_at else None,
        "reason_code": active_break.reason_code,
    }


def close_segment(segment, ended_at=None, status=None, notes=""):
    if not segment or segment.ended_at:
        return segment

    ended_at = ended_at or timezone.now()
    minutes = current_segment_minutes(segment, ended_at)
    session = segment.child_mode_session
    session.session_minutes += minutes
    if segment.screen_based:
        session.screen_minutes += minutes
        session.continuous_screen_minutes += minutes
    else:
        session.offscreen_minutes += minutes
    session.last_heartbeat_at = ended_at
    session.save(
        update_fields=[
            "session_minutes",
            "screen_minutes",
            "continuous_screen_minutes",
            "offscreen_minutes",
            "last_heartbeat_at",
            "updated_at",
        ]
    )

    segment.duration_minutes = minutes
    segment.ended_at = ended_at
    segment.status = status or UsageSession.Status.COMPLETED
    if notes:
        segment.notes = notes
    segment.save(
        update_fields=["duration_minutes", "ended_at", "status", "notes", "updated_at"]
    )
    return segment


def create_break_requirement(child_session, reason_code="continuous_limit", now=None):
    now = now or timezone.now()
    active_break = (
        BreakRequirement.objects.filter(
            child_mode_session=child_session,
            status=BreakRequirement.Status.PENDING,
        )
        .order_by("-started_at")
        .first()
    )
    if active_break:
        return active_break
    return BreakRequirement.objects.create(
        child_mode_session=child_session,
        triggered_by=BreakRequirement.Trigger.CONTINUOUS_LIMIT,
        required_minutes=child_session.child.rules.minimum_offscreen_break_minutes,
        started_at=now,
        reason_code=reason_code,
    )


def abandon_stale_sessions(child):
    now = timezone.now()
    cutoff = now - timedelta(seconds=SESSION_ABANDONED_AFTER_SECONDS)
    active_sessions = ChildModeSession.objects.filter(
        child=child,
        status=ChildModeSession.Status.ACTIVE,
        last_heartbeat_at__lt=cutoff,
    )
    for session in active_sessions:
        active_segment = (
            UsageSession.objects.filter(
                child_mode_session=session,
                status=UsageSession.Status.ACTIVE,
                ended_at__isnull=True,
            )
            .order_by("-started_at")
            .first()
        )
        if active_segment:
            close_segment(active_segment, now, status=UsageSession.Status.ABANDONED, notes="Segment abandoned after heartbeat timeout.")
        session.status = ChildModeSession.Status.ABANDONED
        session.ended_reason = ChildModeSession.EndedReason.ABANDONED
        session.ended_at = now
        session.last_heartbeat_at = now
        session.save(update_fields=["status", "ended_reason", "ended_at", "last_heartbeat_at", "updated_at"])


def enforce_rule_limits(child_session, now=None):
    now = now or timezone.now()
    state = current_limit_state(child_session, now)
    counters = compute_live_counters(child_session, now)
    active_segment = counters["active_segment"]

    if child_session.status != ChildModeSession.Status.ACTIVE:
        return state

    if state["remaining_session_minutes"] <= 0:
        if active_segment:
            close_segment(active_segment, now, status=UsageSession.Status.COMPLETED, notes="Session duration limit reached.")
        child_session.status = ChildModeSession.Status.COMPLETED
        child_session.ended_reason = ChildModeSession.EndedReason.SESSION_LIMIT
        child_session.ended_at = now
        child_session.last_heartbeat_at = now
        child_session.save(update_fields=["status", "ended_reason", "ended_at", "last_heartbeat_at", "updated_at"])
        return current_limit_state(child_session, now)

    if (
        active_segment
        and active_segment.screen_based
        and state["remaining_continuous_screen_minutes"] <= 0
    ):
        close_segment(active_segment, now, status=UsageSession.Status.PAUSED, notes="Continuous screen limit reached.")
        create_break_requirement(child_session, now=now)
        return current_limit_state(child_session, now)

    if active_segment and active_segment.screen_based and state["remaining_screen_minutes"] <= 0:
        close_segment(active_segment, now, status=UsageSession.Status.BLOCKED, notes="Total screen time limit reached.")
        return current_limit_state(child_session, now)

    return state


def rules_metadata_for_child(child):
    ceiling = ceiling_for_age(child.age)
    presets = child.rules.preset_metadata()
    return {
        "age_band": child.rules.age_band,
        "current_profile": child.rules.time_profile,
        "presets": presets,
        "ceiling": ceiling,
    }
