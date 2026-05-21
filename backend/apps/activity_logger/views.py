from datetime import datetime, time, timedelta

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


ACTIVITY_META = {
    'learning': {'label': 'Học tập', 'screen_based': True},
    'reading': {'label': 'Đọc sách', 'screen_based': True},
    'movement': {'label': 'Vận động', 'screen_based': False},
    'creativity': {'label': 'Sáng tạo', 'screen_based': False},
    'life_skill': {'label': 'Kỹ năng sống', 'screen_based': False},
    'discovery': {'label': 'Khám phá', 'screen_based': True},
    'healthy_entertainment': {'label': 'Giải trí lành mạnh', 'screen_based': True},
    'mascot': {'label': 'Milo & mascot', 'screen_based': True},
    'break': {'label': 'Nghỉ màn hình', 'screen_based': False},
    'idle': {'label': 'Mở app nhưng chưa vào hoạt động', 'screen_based': True},
}

RADAR_ACTIVITY_KEYS = [
    'learning',
    'reading',
    'movement',
    'creativity',
    'life_skill',
    'discovery',
    'healthy_entertainment',
]
ACTIVE_ACTIVITY_KEYS = {'learning', 'reading', 'movement', 'creativity', 'life_skill'}
PASSIVE_ACTIVITY_KEYS = {'discovery', 'healthy_entertainment', 'mascot', 'idle'}
SCREEN_ACTIVITY_KEYS = {'learning', 'reading', 'discovery', 'healthy_entertainment', 'mascot', 'idle'}
OFFSCREEN_ACTIVITY_KEYS = {'movement', 'creativity', 'life_skill', 'break'}


def _session_duration_for_reporting(session, now):
    if session.ended_at:
        return max(session.duration_minutes, 0)
    if not session.started_at:
        return max(session.duration_minutes, 0)
    return _elapsed_minutes(session.started_at, now)


def _empty_breakdown():
    return {
        key: {
            'key': key,
            'label': meta['label'],
            'minutes': 0,
            'count': 0,
            'screen_based': meta['screen_based'],
        }
        for key, meta in ACTIVITY_META.items()
    }


def _build_activity_breakdown(sessions, now):
    breakdown = _empty_breakdown()
    for session in sessions:
        if session.status == UsageSession.Status.BLOCKED:
            continue
        bucket = _activity_bucket(session)
        if bucket not in breakdown:
            continue
        minutes = _session_duration_for_reporting(session, now)
        if minutes <= 0:
            continue
        breakdown[bucket]['minutes'] += minutes
        breakdown[bucket]['count'] += 1
    return breakdown


def _summarize_minutes(breakdown):
    return {key: item['minutes'] for key, item in breakdown.items()}


def _build_daily_series(sessions, today, now):
    day_map = {}
    for index in range(6, -1, -1):
        day = today - timedelta(days=index)
        day_map[day] = {
            'date': str(day),
            'label': day.strftime('%d/%m'),
            'weekday': day.strftime('%a'),
            'total_minutes': 0,
            'screen_minutes': 0,
            'offscreen_minutes': 0,
            'active_minutes': 0,
            'passive_minutes': 0,
        }

    for session in sessions:
        if session.status == UsageSession.Status.BLOCKED or not session.started_at:
            continue
        session_day = timezone.localtime(session.started_at).date()
        if session_day not in day_map:
            continue
        minutes = _session_duration_for_reporting(session, now)
        if minutes <= 0:
            continue
        bucket = _activity_bucket(session)
        target = day_map[session_day]
        target['total_minutes'] += minutes
        if bucket in SCREEN_ACTIVITY_KEYS:
            target['screen_minutes'] += minutes
        if bucket in OFFSCREEN_ACTIVITY_KEYS:
            target['offscreen_minutes'] += minutes
        if bucket in ACTIVE_ACTIVITY_KEYS:
            target['active_minutes'] += minutes
        if bucket in PASSIVE_ACTIVITY_KEYS:
            target['passive_minutes'] += minutes

    return list(day_map.values())


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


def _build_parent_alerts(child, metrics, current_session_state):
    alerts = []
    if current_session_state['state'] == 'break_required':
        alerts.append('Bé đang tới ngưỡng cần nghỉ mắt. Hệ thống đang chờ một khoảng nghỉ hoặc hoạt động ngoài màn hình trước khi quay lại màn hình.')
    elif current_session_state['state'] == 'offscreen_only':
        alerts.append('Phiên hiện tại đã dùng hết thời gian màn hình. Bé vẫn có thể tiếp tục các hoạt động ngoài màn hình trong phần thời gian còn lại.')
    elif current_session_state['state'] == 'session_limit_reached':
        alerts.append('Phiên hiện tại đã chạm giới hạn thời lượng. Nếu cần tiếp tục, phụ huynh nên bắt đầu một phiên mới phù hợp hơn.')

    if metrics['screen_time_minutes'] >= metrics['offscreen_time_minutes'] + 15:
        alerts.append('Thời gian trên màn hình đang cao hơn đáng kể so với hoạt động ngoài màn hình. Có thể gợi ý thêm một hoạt động vận động hoặc sáng tạo.')
    if metrics['movement_minutes'] == 0 and metrics['screen_time_minutes'] >= 20:
        alerts.append('Ngày gần nhất chưa ghi nhận hoạt động vận động. Một khoảng vận động ngắn sẽ giúp phiên dùng app cân bằng hơn.')
    if metrics['reading_minutes'] == 0 and metrics['learning_minutes'] > 0:
        alerts.append('Ngày gần nhất chưa có hoạt động đọc. Một hoạt động đọc ngắn có thể giúp nhịp học đa dạng hơn.')

    unread_alerts = list(
        ParentAlert.objects.filter(child=child, is_read=False)
        .order_by('-created_at')
        .values_list('message', flat=True)[:4]
    )
    alerts.extend(unread_alerts)
    return alerts[:5]


def _build_weekly_summary(child, metrics, active_ratio, passive_ratio, daily_series):
    busiest_day = max(daily_series, key=lambda item: item['total_minutes'], default=None)
    emphasis = []
    if active_ratio >= 60:
        emphasis.append('nhóm hoạt động chủ động đang chiếm tỷ trọng tốt')
    elif passive_ratio >= 55:
        emphasis.append('nội dung thụ động đang nhỉnh hơn nhóm hoạt động chủ động')
    else:
        emphasis.append('nhịp dùng app đang khá cân bằng giữa chủ động và thụ động')

    if metrics['offscreen_time_minutes'] >= metrics['screen_time_minutes']:
        emphasis.append('thời gian ngoài màn hình đang được giữ ổn')
    else:
        emphasis.append('nên bổ sung thêm vài hoạt động ngoài màn hình để cân bằng phiên')

    if busiest_day and busiest_day['total_minutes'] > 0:
        emphasis.append(f"ngày có hoạt động nhiều nhất gần đây là {busiest_day['label']} với {busiest_day['total_minutes']} phút")

    return (
        f"Dữ liệu gần đây của {child.nickname} cho thấy {', '.join(emphasis)}. "
        'Bản tóm tắt này chỉ mô tả hành vi sử dụng trong app để phụ huynh theo dõi và điều chỉnh, không đưa ra chẩn đoán.'
    )


def _build_eda_highlights(metrics, daily_series):
    insights = []
    active_minutes = metrics['active_minutes']
    passive_minutes = metrics['passive_minutes']
    if active_minutes > passive_minutes:
        insights.append('Nhóm hoạt động chủ động hiện đang nhiều hơn nội dung thụ động.')
    elif passive_minutes > active_minutes:
        insights.append('Nội dung thụ động hiện đang nhiều hơn nhóm hoạt động chủ động.')
    else:
        insights.append('Hoạt động chủ động và nội dung thụ động đang ở mức cân bằng.')

    if metrics['screen_time_minutes'] > metrics['offscreen_time_minutes']:
        insights.append('Thời gian trên màn hình đang cao hơn thời gian ngoài màn hình trong phiên hoặc ngày gần nhất.')
    else:
        insights.append('Thời gian ngoài màn hình đang theo kịp hoặc vượt thời gian trên màn hình.')

    active_days = [item for item in daily_series if item['total_minutes'] > 0]
    if active_days:
        average_minutes = round(sum(item['total_minutes'] for item in active_days) / len(active_days))
        insights.append(f'Trung bình mỗi ngày có hoạt động gần đây: khoảng {average_minutes} phút.')
    else:
        insights.append('Hiện chưa đủ dữ liệu trong 7 ngày để rút ra nhịp sử dụng ổn định.')

    return insights


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
    sessions_qs = UsageSession.objects.filter(child=child).exclude(status=UsageSession.Status.BLOCKED).order_by('-started_at')
    latest_logged_session = sessions_qs.first()
    report_date = timezone.localtime(latest_logged_session.started_at).date() if latest_logged_session else today
    base_date = today if sessions_qs.filter(started_at__date=today).exists() else report_date
    today_sessions = list(sessions_qs.filter(started_at__date=base_date))
    weekly_sessions = list(sessions_qs.filter(started_at__date__gte=base_date - timedelta(days=6)))
    recent_segments = list(sessions_qs[:14])

    child_session = _current_child_mode_session(child)
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

    today_breakdown = _build_activity_breakdown(today_sessions, now)
    weekly_breakdown = _build_activity_breakdown(weekly_sessions, now)
    today_minutes = _summarize_minutes(today_breakdown)
    weekly_minutes = _summarize_minutes(weekly_breakdown)

    def _count_completed(breakdown):
        return sum(
            item['count']
            for key, item in breakdown.items()
            if key not in {'idle', 'break'} and item['minutes'] > 0
        )

    metrics = {
        'learning_minutes': today_minutes['learning'],
        'reading_minutes': today_minutes['reading'],
        'movement_minutes': today_minutes['movement'],
        'creative_minutes': today_minutes['creativity'],
        'life_skill_minutes': today_minutes['life_skill'],
        'discovery_minutes': today_minutes['discovery'],
        'healthy_entertainment_minutes': today_minutes['healthy_entertainment'],
        'mascot_minutes': today_minutes['mascot'],
        'break_minutes': today_minutes['break'],
        'idle_minutes': today_minutes['idle'],
        'screen_time_minutes': sum(today_minutes[key] for key in SCREEN_ACTIVITY_KEYS),
        'offscreen_time_minutes': sum(today_minutes[key] for key in OFFSCREEN_ACTIVITY_KEYS),
        'total_app_minutes': sum(today_minutes.values()),
        'completed_activity_count': _count_completed(today_breakdown),
        'active_minutes': sum(today_minutes[key] for key in ACTIVE_ACTIVITY_KEYS),
        'passive_minutes': sum(today_minutes[key] for key in PASSIVE_ACTIVITY_KEYS),
    }

    weekly_metrics = {
        'learning_minutes': weekly_minutes['learning'],
        'reading_minutes': weekly_minutes['reading'],
        'movement_minutes': weekly_minutes['movement'],
        'creative_minutes': weekly_minutes['creativity'],
        'life_skill_minutes': weekly_minutes['life_skill'],
        'discovery_minutes': weekly_minutes['discovery'],
        'healthy_entertainment_minutes': weekly_minutes['healthy_entertainment'],
        'mascot_minutes': weekly_minutes['mascot'],
        'break_minutes': weekly_minutes['break'],
        'idle_minutes': weekly_minutes['idle'],
        'screen_time_minutes': sum(weekly_minutes[key] for key in SCREEN_ACTIVITY_KEYS),
        'offscreen_time_minutes': sum(weekly_minutes[key] for key in OFFSCREEN_ACTIVITY_KEYS),
        'total_app_minutes': sum(weekly_minutes.values()),
        'completed_activity_count': _count_completed(weekly_breakdown),
        'active_minutes': sum(weekly_minutes[key] for key in ACTIVE_ACTIVITY_KEYS),
        'passive_minutes': sum(weekly_minutes[key] for key in PASSIVE_ACTIVITY_KEYS),
    }

    def ratio_pair(left, right):
        total = max(left + right, 1)
        return {
            'left_minutes': left,
            'right_minutes': right,
            'left_ratio': round((left / total) * 100),
            'right_ratio': round((right / total) * 100),
        }

    active_vs_passive = ratio_pair(metrics['active_minutes'], metrics['passive_minutes'])
    screen_vs_offscreen = ratio_pair(metrics['screen_time_minutes'], metrics['offscreen_time_minutes'])
    weekly_active_vs_passive = ratio_pair(weekly_metrics['active_minutes'], weekly_metrics['passive_minutes'])
    daily_series = _build_daily_series(weekly_sessions, base_date, now)
    alerts = _build_parent_alerts(child, metrics, limit_state)

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

    def serialize_breakdown(breakdown, order):
        total_minutes = max(sum(item['minutes'] for item in breakdown.values()), 1)
        payload = []
        for key in order:
            item = breakdown.get(key)
            if not item:
                continue
            payload.append(
                {
                    **item,
                    'share': round((item['minutes'] / total_minutes) * 100) if item['minutes'] else 0,
                }
            )
        return payload

    latest_activity = UsageSessionSerializer(recent_segments[0]).data if recent_segments else None

    return Response(
        {
            'child': {
                'id': child.id,
                'nickname': child.nickname,
                'age': child.age,
            },
            'report_date': str(base_date),
            'rules': {
                'voice_enabled': child.rules.voice_enabled,
                'camera_enabled': child.rules.camera_enabled,
                'session_duration_limit_minutes': child.rules.session_duration_limit_minutes,
                'total_screen_time_limit_minutes': child.rules.total_screen_time_limit_minutes,
                'continuous_screen_time_limit_minutes': child.rules.continuous_screen_time_limit_minutes,
                'minimum_offscreen_break_minutes': child.rules.minimum_offscreen_break_minutes,
                'time_profile': child.rules.time_profile,
            },
            'metrics': metrics,
            'weekly_metrics': weekly_metrics,
            'comparisons': {
                'active_vs_passive': {
                    'active_minutes': active_vs_passive['left_minutes'],
                    'passive_minutes': active_vs_passive['right_minutes'],
                    'active_ratio': active_vs_passive['left_ratio'],
                    'passive_ratio': active_vs_passive['right_ratio'],
                },
                'screen_vs_offscreen': {
                    'screen_minutes': screen_vs_offscreen['left_minutes'],
                    'offscreen_minutes': screen_vs_offscreen['right_minutes'],
                    'screen_ratio': screen_vs_offscreen['left_ratio'],
                    'offscreen_ratio': screen_vs_offscreen['right_ratio'],
                },
            },
            'today_breakdown': serialize_breakdown(today_breakdown, list(ACTIVITY_META.keys())),
            'weekly_breakdown': serialize_breakdown(weekly_breakdown, list(ACTIVITY_META.keys())),
            'radar_balance': serialize_breakdown(weekly_breakdown, RADAR_ACTIVITY_KEYS),
            'daily_series': daily_series,
            'alerts': alerts,
            'weekly_summary': _build_weekly_summary(
                child,
                weekly_metrics,
                weekly_active_vs_passive['left_ratio'],
                weekly_active_vs_passive['right_ratio'],
                daily_series,
            ),
            'eda_highlights': _build_eda_highlights(weekly_metrics, daily_series),
            'recent_sessions': UsageSessionSerializer(recent_segments, many=True).data,
            'latest_activity': latest_activity,
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

    abandon_stale_sessions(child)
    today = timezone.localdate()
    now = timezone.now()
    sessions_qs = UsageSession.objects.filter(child=child, status__in=[UsageSession.Status.ACTIVE, UsageSession.Status.COMPLETED, UsageSession.Status.PAUSED, UsageSession.Status.ABANDONED]).order_by('-started_at')
    report_session = sessions_qs.filter(started_at__date=today).first() or sessions_qs.first()
    report_date = timezone.localtime(report_session.started_at).date() if report_session else today
    sessions = list(sessions_qs.filter(started_at__date=report_date))
    hours = _build_hourly_breakdown(sessions, now)
    return Response({'child_id': str(child.id), 'date': str(report_date), 'hours': hours})




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
