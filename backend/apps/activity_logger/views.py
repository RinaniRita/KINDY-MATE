from datetime import datetime, time, timedelta

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.gamification.models import RewardTransaction
from apps.learning.models import MissionAttempt
from apps.profiles.models import ChildProfile

from .models import BreakRequirement, ChildModeSession, ParentAlert, ParentOverrideLog, UsageSession
from .serializers import ChildModeSessionSerializer, UsageSessionSerializer
from .services import (
    HEARTBEAT_TIMEOUT_SECONDS,
    IDLE_THRESHOLD_SECONDS,
    abandon_stale_sessions,
    close_segment,
    compute_live_counters,
    create_break_requirement,
    current_limit_state,
    elapsed_seconds,
    enforce_rule_limits,
    is_screen_based,
    session_type_for_screen_class,
    sync_break_requirement,
)


def _get_child_for_parent(user, child_id):
    return ChildProfile.objects.select_related('rules', 'wallet').get(id=child_id, parent=user)


def _elapsed_minutes(started_at, ended_at):
    delta_seconds = max(int((ended_at - started_at).total_seconds()), 0)
    return max(round(delta_seconds / 60), 1) if delta_seconds else 0


def _activity_bucket(session):
    if session.activity_category:
        return session.activity_category
    mapping = {
        UsageSession.SessionType.LEARNING: 'learning',
        UsageSession.SessionType.READING: 'reading',
        UsageSession.SessionType.DOCUMENTARY: 'discovery',
        UsageSession.SessionType.ENTERTAINMENT: 'healthy_entertainment',
        UsageSession.SessionType.CUSTOMIZATION: 'mascot',
        UsageSession.SessionType.MOVEMENT: 'movement',
        UsageSession.SessionType.CREATIVE: 'creativity',
        UsageSession.SessionType.REFLECTION: 'break',
        UsageSession.SessionType.SCREEN_TIME: 'idle',
    }
    return mapping.get(session.session_type, session.session_type)


def _build_hourly_breakdown(sessions, now):
    day_start = timezone.make_aware(datetime.combine(timezone.localdate(), time.min))
    hours = [
        {
            'hour': hour,
            'label': f'{hour:02d}:00',
            'total_minutes': 0,
            'breakdown': {},
        }
        for hour in range(24)
    ]

    for session in sessions:
        if not session.started_at:
            continue

        session_end = session.ended_at or now
        if session_end <= session.started_at:
            session_end = session.started_at + timedelta(minutes=max(session.duration_minutes, 1))

        current_start = max(session.started_at, day_start)
        while current_start < session_end:
            local_start = timezone.localtime(current_start)
            hour_index = local_start.hour
            next_hour_aware = local_start.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
            segment_end = min(session_end, next_hour_aware)
            minutes = _elapsed_minutes(current_start, segment_end)
            if minutes:
                bucket = hours[hour_index]
                bucket['total_minutes'] += minutes
                activity_bucket = _activity_bucket(session)
                bucket['breakdown'][activity_bucket] = bucket['breakdown'].get(activity_bucket, 0) + minutes
            current_start = segment_end

    return hours


def _build_parent_alerts(child, today_attempts, mission_mix, blocked_count, current_session_state):
    alerts = []
    if current_session_state['remaining_screen_minutes'] == 0:
        alerts.append('Phiên hiện tại đã dùng hết screen time. Trẻ chỉ còn các hoạt động ngoài màn hình.')
    if current_session_state['state'] == 'break_required':
        alerts.append('Trẻ đang đến ngưỡng nghỉ màn hình và cần hoàn thành một khoảng nghỉ/off-screen trước khi quay lại màn hình.')
    if blocked_count:
        alerts.append('Hôm nay có lượt bị chặn bởi luật an toàn. Phụ huynh có thể xem lại cài đặt để điều chỉnh cho phù hợp.')
    if child.rules.entertainment_paused:
        alerts.append('Giải trí hiện đang được phụ huynh tạm dừng.')
    if today_attempts.exists() and mission_mix.get('reading', 0) < 1:
        alerts.append('Hôm nay chưa có nhiệm vụ đọc. Có thể gợi ý một nhiệm vụ đọc ngắn trước khi giải trí.')

    unread_alerts = list(
        ParentAlert.objects.filter(child=child, is_read=False)
        .order_by('-created_at')
        .values_list('message', flat=True)[:4]
    )
    alerts.extend(unread_alerts)
    return alerts


def _current_child_mode_session(child):
    return (
        ChildModeSession.objects.filter(child=child, status=ChildModeSession.Status.ACTIVE)
        .order_by('-started_at')
        .first()
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request):
    child_id = request.query_params.get('child_id')
    try:
        child = _get_child_for_parent(request.user, child_id)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Không tìm thấy hồ sơ trẻ thuộc tài khoản này.'}, status=status.HTTP_404_NOT_FOUND)

    abandon_stale_sessions(child)
    today = timezone.localdate()
    now = timezone.now()
    sessions = UsageSession.objects.filter(child=child).order_by('-started_at')
    today_sessions = sessions.filter(started_at__date=today)

    attempts = MissionAttempt.objects.filter(child=child, status=MissionAttempt.Status.COMPLETED)
    today_attempts = attempts.filter(completed_at__date=today)
    recent_attempts = attempts.filter(completed_at__date__gte=today - timedelta(days=6))

    session_totals = {
        item['activity_category']: item['total'] or 0
        for item in today_sessions.values('activity_category').annotate(total=Sum('duration_minutes'))
    }
    legacy_session_totals = {
        item['session_type']: item['total'] or 0
        for item in today_sessions.values('session_type').annotate(total=Sum('duration_minutes'))
    }

    child_session = _current_child_mode_session(child)
    live_counters = compute_live_counters(child_session, now) if child_session else None
    limit_state = current_limit_state(child_session, now) if child_session else {
        'state': 'inactive',
        'remaining_session_minutes': child.rules.session_duration_limit_minutes,
        'remaining_screen_minutes': child.rules.total_screen_time_limit_minutes,
        'remaining_continuous_screen_minutes': child.rules.continuous_screen_time_limit_minutes,
        'active_break_requirement': None,
        'next_allowed_screen_at': None,
        'current_session_minutes': 0,
        'current_screen_minutes': 0,
        'current_continuous_screen_minutes': 0,
        'current_offscreen_minutes': 0,
    }

    mission_mix = {
        item['mission__mission_type']: item['count']
        for item in recent_attempts.values('mission__mission_type').annotate(count=Count('id'))
    }

    live_segment = live_counters['active_segment'] if live_counters else None
    live_open_minutes = 0
    live_activity_category = ''
    if live_segment and not live_segment.ended_at:
        live_open_minutes = live_counters['session_minutes'] - child_session.session_minutes if child_session and live_counters else 0
        live_activity_category = live_segment.activity_category

    total_logged_minutes = today_sessions.exclude(status=UsageSession.Status.BLOCKED).aggregate(total=Sum('duration_minutes'))['total'] or 0
    total_app_minutes = total_logged_minutes + live_open_minutes
    screen_logged_minutes = (
        today_sessions.filter(screen_based=True).aggregate(total=Sum('duration_minutes'))['total']
        or legacy_session_totals.get(UsageSession.SessionType.SCREEN_TIME, 0)
    )
    screen_time_minutes = screen_logged_minutes + (live_open_minutes if live_segment and live_segment.screen_based else 0)

    def with_live(category, fallback=0):
        base = session_totals.get(category, 0) + fallback
        if live_activity_category == category:
            return base + live_open_minutes
        return base

    entertainment_today = (
        session_totals.get('discovery', 0)
        + session_totals.get('healthy_entertainment', 0)
        + legacy_session_totals.get(UsageSession.SessionType.DOCUMENTARY, 0)
        + legacy_session_totals.get(UsageSession.SessionType.ENTERTAINMENT, 0)
    )
    if live_activity_category in {'discovery', 'healthy_entertainment'}:
        entertainment_today += live_open_minutes
    blocked_count = today_sessions.filter(status=UsageSession.Status.BLOCKED).count() + today_sessions.filter(
        session_type=UsageSession.SessionType.BLOCKED
    ).count()
    cap_left = max(child.rules.daily_entertainment_cap_minutes - entertainment_today, 0)
    alerts = _build_parent_alerts(child, today_attempts, mission_mix, blocked_count, limit_state)

    transactions = RewardTransaction.objects.filter(child=child).order_by('-created_at')[:8]
    recent_segments = sessions[:10]
    current_segment_title = child_session.current_activity_title if child_session else ''
    current_segment_type = child_session.current_activity_type if child_session else ''

    current_session_payload = None
    if child_session:
        current_session_payload = ChildModeSessionSerializer(child_session).data
        current_session_payload.update(
            {
                'current_session_minutes': limit_state['current_session_minutes'],
                'current_screen_minutes': limit_state['current_screen_minutes'],
                'current_continuous_screen_minutes': limit_state['current_continuous_screen_minutes'],
                'current_offscreen_minutes': limit_state['current_offscreen_minutes'],
                'remaining_session_minutes': limit_state['remaining_session_minutes'],
                'remaining_screen_minutes': limit_state['remaining_screen_minutes'],
                'remaining_continuous_screen_minutes': limit_state['remaining_continuous_screen_minutes'],
                'current_activity_type': current_segment_type,
                'current_activity_title': current_segment_title,
                'current_segment_started_at': child_session.current_segment_started_at.isoformat() if child_session.current_segment_started_at else None,
                'last_heartbeat_at': child_session.last_heartbeat_at.isoformat() if child_session.last_heartbeat_at else None,
            }
        )

    return Response(
        {
            'child': {
                'id': child.id,
                'nickname': child.nickname,
                'age': child.age,
            },
            'wallet': {
                'points_balance': child.wallet.points_balance,
                'points_earned_total': child.wallet.points_earned_total,
                'points_spent_total': child.wallet.points_spent_total,
            },
            'rules': {
                'daily_entertainment_cap_minutes': child.rules.daily_entertainment_cap_minutes,
                'entertainment_paused': child.rules.entertainment_paused,
                'voice_enabled': child.rules.voice_enabled,
                'camera_enabled': child.rules.camera_enabled,
                'session_duration_limit_minutes': child.rules.session_duration_limit_minutes,
                'total_screen_time_limit_minutes': child.rules.total_screen_time_limit_minutes,
                'continuous_screen_time_limit_minutes': child.rules.continuous_screen_time_limit_minutes,
                'minimum_offscreen_break_minutes': child.rules.minimum_offscreen_break_minutes,
                'time_profile': child.rules.time_profile,
            },
            'metrics': {
                'learning_minutes': with_live('learning', legacy_session_totals.get(UsageSession.SessionType.LEARNING, 0)),
                'reading_minutes': with_live('reading', legacy_session_totals.get(UsageSession.SessionType.READING, 0)),
                'movement_minutes': with_live('movement', legacy_session_totals.get(UsageSession.SessionType.MOVEMENT, 0)),
                'creative_minutes': with_live('creativity', legacy_session_totals.get(UsageSession.SessionType.CREATIVE, 0)),
                'discovery_minutes': with_live('discovery', legacy_session_totals.get(UsageSession.SessionType.DOCUMENTARY, 0)),
                'healthy_entertainment_minutes': with_live('healthy_entertainment', legacy_session_totals.get(UsageSession.SessionType.ENTERTAINMENT, 0)),
                'mascot_minutes': with_live('mascot', legacy_session_totals.get(UsageSession.SessionType.CUSTOMIZATION, 0)),
                'screen_time_minutes': screen_time_minutes,
                'total_app_minutes': total_app_minutes,
                'mission_completion_count': today_attempts.count(),
                'blocked_attempts': blocked_count,
                'cap_left_today': cap_left,
            },
            'mission_mix': mission_mix,
            'alerts': alerts,
            'weekly_summary': (
                'Hệ thống đang ghi nhận các khoảng học, đọc, khám phá, vui chơi lành mạnh và nghỉ ngoài màn hình để phụ huynh điều chỉnh luật cho phù hợp. '
                'Bản tóm tắt này chỉ mô tả hành vi sử dụng trong app, không đưa ra chẩn đoán.'
            ),
            'recent_sessions': UsageSessionSerializer(recent_segments, many=True).data,
            'recent_transactions': [
                {
                    'id': transaction.id,
                    'type': transaction.transaction_type,
                    'points': transaction.points_amount,
                    'reason': transaction.reason,
                    'created_at': transaction.created_at.isoformat(),
                }
                for transaction in transactions
            ],
            'current_session': current_session_payload,
            'limit_state': {
                'state': limit_state['state'],
                'remaining_session_minutes': limit_state['remaining_session_minutes'],
                'remaining_screen_minutes': limit_state['remaining_screen_minutes'],
                'remaining_continuous_screen_minutes': limit_state['remaining_continuous_screen_minutes'],
                'active_break_requirement': limit_state['active_break_requirement'],
                'break_required': limit_state['state'] == 'break_required',
                'next_allowed_screen_at': limit_state['next_allowed_screen_at'],
                'current_activity_type': current_segment_type,
                'current_activity_title': current_segment_title,
                'session_status': child_session.status if child_session else 'inactive',
                'last_heartbeat_at': child_session.last_heartbeat_at.isoformat() if child_session and child_session.last_heartbeat_at else None,
            },
        }
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def hourly_usage(request):
    child_id = request.query_params.get('child_id')
    try:
        child = _get_child_for_parent(request.user, child_id)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Không tìm thấy hồ sơ trẻ.'}, status=status.HTTP_404_NOT_FOUND)

    today = timezone.localdate()
    now = timezone.now()
    sessions = list(UsageSession.objects.filter(child=child, started_at__date=today))
    hours = _build_hourly_breakdown(sessions, now)
    return Response({'child_id': str(child.id), 'date': str(today), 'hours': hours})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_log(request):
    logs = ParentOverrideLog.objects.filter(parent=request.user).select_related('child')[:50]
    data = [
        {
            'id': log.id,
            'action_type': log.action_type,
            'action_label': log.get_action_type_display(),
            'child_nickname': log.child.nickname if log.child else '—',
            'description': log.description,
            'metadata': log.metadata,
            'created_at': log.created_at,
        }
        for log in logs
    ]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_child_data(request, child_id):
    try:
        child = _get_child_for_parent(request.user, child_id)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Không tìm thấy hồ sơ trẻ.'}, status=status.HTTP_404_NOT_FOUND)

    ParentOverrideLog.objects.create(
        parent=request.user,
        child=child,
        action_type=ParentOverrideLog.ActionType.CHILD_DATA_EXPORT,
        description=f'Exported data for {child.nickname}',
    )

    sessions = UsageSession.objects.filter(child=child)
    attempts = MissionAttempt.objects.filter(child=child)
    transactions = RewardTransaction.objects.filter(child=child)

    export_data = {
        'export_info': {
            'exported_at': timezone.now().isoformat(),
            'exported_by': request.user.email,
            'child_nickname': child.nickname,
        },
        'profile': {
            'nickname': child.nickname,
            'age': child.age,
            'avatar_id': child.avatar_id,
            'interests': child.interests,
            'favorite_subjects': child.favorite_subjects,
            'default_language': child.default_language,
            'created_at': child.created_at.isoformat(),
        },
        'wallet': {
            'points_balance': child.wallet.points_balance,
            'points_earned_total': child.wallet.points_earned_total,
            'points_spent_total': child.wallet.points_spent_total,
        },
        'rules': {
            'daily_entertainment_cap_minutes': child.rules.daily_entertainment_cap_minutes,
            'cooldown_minutes': child.rules.cooldown_minutes,
            'voice_enabled': child.rules.voice_enabled,
            'camera_enabled': child.rules.camera_enabled,
            'session_duration_limit_minutes': child.rules.session_duration_limit_minutes,
            'total_screen_time_limit_minutes': child.rules.total_screen_time_limit_minutes,
            'continuous_screen_time_limit_minutes': child.rules.continuous_screen_time_limit_minutes,
            'minimum_offscreen_break_minutes': child.rules.minimum_offscreen_break_minutes,
            'time_profile': child.rules.time_profile,
        },
        'usage_sessions': UsageSessionSerializer(sessions, many=True).data,
        'mission_attempts': [
            {
                'mission_title': attempt.mission.title,
                'status': attempt.status,
                'points_awarded': attempt.points_awarded,
                'started_at': attempt.started_at.isoformat() if attempt.started_at else None,
                'completed_at': attempt.completed_at.isoformat() if attempt.completed_at else None,
            }
            for attempt in attempts.select_related('mission')
        ],
        'transactions': [
            {
                'type': transaction.transaction_type,
                'points': transaction.points_amount,
                'reason': transaction.reason,
                'created_at': transaction.created_at.isoformat(),
            }
            for transaction in transactions
        ],
    }

    return Response(export_data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_child_data(request, child_id):
    try:
        child = _get_child_for_parent(request.user, child_id)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Không tìm thấy hồ sơ trẻ.'}, status=status.HTTP_404_NOT_FOUND)

    nickname = child.nickname
    ParentOverrideLog.objects.create(
        parent=request.user,
        child=None,
        action_type=ParentOverrideLog.ActionType.CHILD_DATA_DELETE,
        description=f'Permanently deleted all data for child: {nickname}',
        metadata={'deleted_child_nickname': nickname, 'deleted_child_id': str(child_id)},
    )
    child.delete()
    return Response({'detail': f'Toàn bộ dữ liệu của {nickname} đã được xóa vĩnh viễn.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def child_session_start(request):
    child_id = request.data.get('child_id')
    try:
        child = _get_child_for_parent(request.user, child_id)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Không tìm thấy hồ sơ trẻ.'}, status=status.HTTP_404_NOT_FOUND)

    abandon_stale_sessions(child)
    now = timezone.now()
    stale_active_sessions = ChildModeSession.objects.filter(child=child, status=ChildModeSession.Status.ACTIVE)
    for stale_session in stale_active_sessions:
        active_segment = (
            UsageSession.objects.filter(
                child_mode_session=stale_session,
                status=UsageSession.Status.ACTIVE,
                ended_at__isnull=True,
            )
            .order_by('-started_at')
            .first()
        )
        if active_segment:
            close_segment(active_segment, now, status=UsageSession.Status.ABANDONED, notes='Older child mode session was replaced.')
        stale_session.status = ChildModeSession.Status.ABANDONED
        stale_session.ended_reason = ChildModeSession.EndedReason.ABANDONED
        stale_session.ended_at = now
        stale_session.last_heartbeat_at = now
        stale_session.save(update_fields=['status', 'ended_reason', 'ended_at', 'last_heartbeat_at', 'updated_at'])

    child_session = ChildModeSession.objects.create(
        child=child,
        status=ChildModeSession.Status.ACTIVE,
        last_heartbeat_at=now,
        current_activity_type='idle_screen',
        current_activity_title='Phòng của con',
        current_segment_started_at=now,
    )
    ParentOverrideLog.objects.create(
        parent=request.user,
        child=child,
        action_type=ParentOverrideLog.ActionType.ENTERTAINMENT_RESUME,
        description=f'Bắt đầu child mode cho {child.nickname}',
        metadata={'child_mode_session_id': str(child_session.id)},
    )
    return Response(
        {
            'ok': True,
            'child_mode_session_id': child_session.id,
            'started_at': child_session.started_at.isoformat(),
            'limit_state': current_limit_state(child_session, now),
        }
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def child_session_end(request):
    child_id = request.data.get('child_id')
    child_mode_session_id = request.data.get('child_mode_session_id')
    reason = request.data.get('reason') or ChildModeSession.EndedReason.MANUAL_END
    try:
        child = _get_child_for_parent(request.user, child_id)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Không tìm thấy hồ sơ trẻ.'}, status=status.HTTP_404_NOT_FOUND)

    session_qs = ChildModeSession.objects.filter(child=child)
    if child_mode_session_id:
        session_qs = session_qs.filter(id=child_mode_session_id)
    else:
        session_qs = session_qs.filter(status=ChildModeSession.Status.ACTIVE)
    child_session = session_qs.order_by('-started_at').first()
    if not child_session:
        return Response({'detail': 'Không tìm thấy phiên child mode đang mở.'}, status=status.HTTP_404_NOT_FOUND)

    now = timezone.now()
    active_segment = (
        UsageSession.objects.filter(
            child_mode_session=child_session,
            status=UsageSession.Status.ACTIVE,
            ended_at__isnull=True,
        )
        .order_by('-started_at')
        .first()
    )
    if active_segment:
        close_segment(active_segment, now, notes='Child mode ended by user.')

    child_session.status = ChildModeSession.Status.COMPLETED
    child_session.ended_reason = reason
    child_session.ended_at = now
    child_session.last_heartbeat_at = now
    child_session.save(update_fields=['status', 'ended_reason', 'ended_at', 'last_heartbeat_at', 'updated_at'])

    return Response(
        {
            'ok': True,
            'child_mode_session_id': child_session.id,
            'ended_at': child_session.ended_at.isoformat(),
            'session_minutes': child_session.session_minutes,
            'screen_minutes': child_session.screen_minutes,
            'offscreen_minutes': child_session.offscreen_minutes,
        }
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def segment_start(request):
    child_id = request.data.get('child_id')
    child_mode_session_id = request.data.get('child_mode_session_id')
    screen_class = request.data.get('screen_class') or UsageSession.ScreenClass.IDLE_SCREEN
    activity_category = request.data.get('activity_category') or ''
    display_category = request.data.get('display_category') or ''
    activity_title = request.data.get('activity_title') or ''
    session_type = request.data.get('session_type') or session_type_for_screen_class(screen_class)

    try:
        child = _get_child_for_parent(request.user, child_id)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Không tìm thấy hồ sơ trẻ.'}, status=status.HTTP_404_NOT_FOUND)

    child_session = ChildModeSession.objects.filter(
        id=child_mode_session_id,
        child=child,
        status=ChildModeSession.Status.ACTIVE,
    ).first()
    if not child_session:
        return Response({'detail': 'Phiên child mode không còn hoạt động.'}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.now()
    active_state = current_limit_state(child_session, now)
    if is_screen_based(screen_class):
        if active_state['state'] == 'break_required':
            return Response({'detail': 'Trẻ cần nghỉ màn hình trước khi quay lại hoạt động trên màn hình.', 'limit_state': active_state}, status=status.HTTP_409_CONFLICT)
        if active_state['remaining_screen_minutes'] <= 0:
            return Response({'detail': 'Phiên này đã dùng hết screen time. Chỉ còn hoạt động ngoài màn hình.', 'limit_state': active_state}, status=status.HTTP_409_CONFLICT)
        if active_state['remaining_session_minutes'] <= 0:
            return Response({'detail': 'Phiên này đã hết thời lượng.', 'limit_state': active_state}, status=status.HTTP_409_CONFLICT)

    current_segment = (
        UsageSession.objects.filter(
            child_mode_session=child_session,
            status=UsageSession.Status.ACTIVE,
            ended_at__isnull=True,
        )
        .order_by('-started_at')
        .first()
    )
    if current_segment:
        if (
            current_segment.screen_class == screen_class
            and current_segment.activity_category == activity_category
            and current_segment.display_category == display_category
            and current_segment.notes == activity_title
        ):
            current_segment.last_heartbeat_at = now
            current_segment.save(update_fields=['last_heartbeat_at', 'updated_at'])
            child_session.last_heartbeat_at = now
            child_session.save(update_fields=['last_heartbeat_at', 'updated_at'])
            return Response(
                {
                    'ok': True,
                    'usage_session_id': current_segment.id,
                    'limit_state': enforce_rule_limits(child_session, now),
                }
            )
        close_segment(current_segment, now, notes='Activity changed.')

    if screen_class == UsageSession.ScreenClass.IDLE_SCREEN and request.data.get('elapsed_seconds', 0) < IDLE_THRESHOLD_SECONDS:
        child_session.last_heartbeat_at = now
        child_session.current_activity_type = screen_class
        child_session.current_activity_title = activity_title or 'Phòng của con'
        child_session.current_segment_started_at = now
        child_session.save(
            update_fields=['last_heartbeat_at', 'current_activity_type', 'current_activity_title', 'current_segment_started_at', 'updated_at']
        )
        return Response({'ok': True, 'usage_session_id': None, 'limit_state': enforce_rule_limits(child_session, now)})

    segment = UsageSession.objects.create(
        child=child,
        child_mode_session=child_session,
        session_type=session_type,
        status=UsageSession.Status.ACTIVE,
        screen_class=screen_class,
        screen_based=is_screen_based(screen_class),
        activity_category=activity_category,
        display_category=display_category,
        notes=activity_title,
        last_heartbeat_at=now,
    )
    child_session.last_heartbeat_at = now
    child_session.current_activity_type = screen_class
    child_session.current_activity_title = activity_title
    child_session.current_segment_started_at = segment.started_at
    child_session.save(
        update_fields=['last_heartbeat_at', 'current_activity_type', 'current_activity_title', 'current_segment_started_at', 'updated_at']
    )
    if screen_class == UsageSession.ScreenClass.OFFSCREEN_TASK:
        active_break = sync_break_requirement(child_session, now)
        if active_break and active_break.status == BreakRequirement.Status.PENDING and not active_break.offscreen_task_session:
            active_break.offscreen_task_session = segment
            active_break.save(update_fields=['offscreen_task_session', 'updated_at'])

    return Response({'ok': True, 'usage_session_id': segment.id, 'limit_state': enforce_rule_limits(child_session, now)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def segment_heartbeat(request):
    child_id = request.data.get('child_id')
    child_mode_session_id = request.data.get('child_mode_session_id')
    usage_session_id = request.data.get('usage_session_id')
    try:
        child = _get_child_for_parent(request.user, child_id)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Không tìm thấy hồ sơ trẻ.'}, status=status.HTTP_404_NOT_FOUND)

    child_session = ChildModeSession.objects.filter(
        id=child_mode_session_id,
        child=child,
        status=ChildModeSession.Status.ACTIVE,
    ).first()
    if not child_session:
        return Response({'detail': 'Phiên child mode không còn hoạt động.'}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.now()
    child_session.last_heartbeat_at = now
    child_session.save(update_fields=['last_heartbeat_at', 'updated_at'])

    if usage_session_id:
        segment = UsageSession.objects.filter(
            id=usage_session_id,
            child_mode_session=child_session,
            status=UsageSession.Status.ACTIVE,
            ended_at__isnull=True,
        ).first()
        if segment:
            segment.last_heartbeat_at = now
            segment.save(update_fields=['last_heartbeat_at', 'updated_at'])

    limit_state = enforce_rule_limits(child_session, now)
    return Response(
        {
            'ok': True,
            'limit_state': limit_state,
            'current_activity_type': child_session.current_activity_type,
            'current_activity_title': child_session.current_activity_title,
            'last_heartbeat_at': child_session.last_heartbeat_at.isoformat() if child_session.last_heartbeat_at else None,
        }
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def segment_complete(request):
    child_id = request.data.get('child_id')
    child_mode_session_id = request.data.get('child_mode_session_id')
    usage_session_id = request.data.get('usage_session_id')
    completion_kind = request.data.get('completion_kind') or 'completed'
    try:
        child = _get_child_for_parent(request.user, child_id)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Không tìm thấy hồ sơ trẻ.'}, status=status.HTTP_404_NOT_FOUND)

    child_session = ChildModeSession.objects.filter(
        id=child_mode_session_id,
        child=child,
    ).first()
    if not child_session:
        return Response({'detail': 'Phiên child mode không tồn tại.'}, status=status.HTTP_404_NOT_FOUND)

    segment = UsageSession.objects.filter(
        id=usage_session_id,
        child_mode_session=child_session,
    ).first()
    if not segment:
        return Response({'detail': 'Không tìm thấy segment hoạt động.'}, status=status.HTTP_404_NOT_FOUND)

    now = timezone.now()
    if not segment.ended_at:
        close_segment(segment, now, status=UsageSession.Status.COMPLETED, notes='Segment completed.')

    active_break = sync_break_requirement(child_session, now)
    if active_break and segment.screen_class == UsageSession.ScreenClass.OFFSCREEN_TASK:
        active_break.offscreen_task_session = segment
        active_break.task_completed_at = now
        if active_break.timer_completed_at:
            active_break.status = BreakRequirement.Status.COMPLETED
            child_session.continuous_screen_minutes = 0
            child_session.save(update_fields=['continuous_screen_minutes', 'updated_at'])
            active_break.save(
                update_fields=['offscreen_task_session', 'task_completed_at', 'status', 'updated_at']
            )
        else:
            active_break.save(update_fields=['offscreen_task_session', 'task_completed_at', 'updated_at'])

    return Response({'ok': True, 'completion_kind': completion_kind, 'limit_state': enforce_rule_limits(child_session, now)})
