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

from .models import ParentAlert, ParentOverrideLog, UsageSession
from .serializers import UsageSessionSerializer


def _get_child_for_parent(user, child_id):
    return ChildProfile.objects.select_related('rules', 'wallet').get(id=child_id, parent=user)


def _elapsed_minutes(started_at, ended_at):
    delta_seconds = max(int((ended_at - started_at).total_seconds()), 0)
    return max(round(delta_seconds / 60), 1) if delta_seconds else 0


def _open_screen_minutes(today_sessions, now):
    return sum(
        _elapsed_minutes(session.started_at, now)
        for session in today_sessions.filter(
            session_type=UsageSession.SessionType.SCREEN_TIME,
            ended_at__isnull=True,
        )
    )


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

        if session.ended_at is None and session.session_type != UsageSession.SessionType.SCREEN_TIME:
            bucket = hours[timezone.localtime(session.started_at).hour]
            minutes = max(session.duration_minutes, 0)
            bucket['total_minutes'] += minutes
            bucket['breakdown'][session.session_type] = bucket['breakdown'].get(session.session_type, 0) + minutes
            continue

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
                bucket['breakdown'][session.session_type] = bucket['breakdown'].get(session.session_type, 0) + minutes
            current_start = segment_end

    return hours


def _build_parent_alerts(child, today_attempts, mission_mix, blocked_count, cap_left):
    alerts = []
    if cap_left == 0:
        alerts.append('Giải trí hôm nay đã đạt giới hạn phụ huynh đặt.')
    if blocked_count:
        alerts.append(
            'Hôm nay có lượt bị chặn bởi luật an toàn. Phụ huynh có thể xem lại cài đặt để điều chỉnh cho phù hợp.'
        )
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request):
    child_id = request.query_params.get('child_id')
    try:
        child = _get_child_for_parent(request.user, child_id)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Không tìm thấy hồ sơ trẻ thuộc tài khoản này.'}, status=status.HTTP_404_NOT_FOUND)

    today = timezone.localdate()
    now = timezone.now()
    sessions = UsageSession.objects.filter(child=child).order_by('-started_at')
    today_sessions = sessions.filter(started_at__date=today)

    attempts = MissionAttempt.objects.filter(child=child, status=MissionAttempt.Status.COMPLETED)
    today_attempts = attempts.filter(completed_at__date=today)
    recent_attempts = attempts.filter(completed_at__date__gte=today - timedelta(days=6))

    session_totals = {
        item['session_type']: item['total'] or 0
        for item in today_sessions.values('session_type').annotate(total=Sum('duration_minutes'))
    }
    open_screen_minutes = _open_screen_minutes(today_sessions, now)
    total_logged_minutes = today_sessions.exclude(session_type=UsageSession.SessionType.BLOCKED).aggregate(
        total=Sum('duration_minutes')
    )['total'] or 0
    total_app_minutes = total_logged_minutes + open_screen_minutes

    mission_mix = {
        item['mission__mission_type']: item['count']
        for item in recent_attempts.values('mission__mission_type').annotate(count=Count('id'))
    }
    entertainment_today = (
        today_sessions.filter(
            session_type__in=[UsageSession.SessionType.ENTERTAINMENT, UsageSession.SessionType.DOCUMENTARY]
        ).aggregate(total=Sum('duration_minutes'))['total']
        or 0
    )
    blocked_count = today_sessions.filter(session_type=UsageSession.SessionType.BLOCKED).count()
    cap_left = max(child.rules.daily_entertainment_cap_minutes - entertainment_today, 0)
    alerts = _build_parent_alerts(child, today_attempts, mission_mix, blocked_count, cap_left)

    transactions = RewardTransaction.objects.filter(child=child).order_by('-created_at')[:8]

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
            },
            'metrics': {
                'learning_minutes': session_totals.get(UsageSession.SessionType.LEARNING, 0),
                'reading_minutes': session_totals.get(UsageSession.SessionType.READING, 0),
                'movement_minutes': session_totals.get(UsageSession.SessionType.MOVEMENT, 0),
                'creative_minutes': session_totals.get(UsageSession.SessionType.CREATIVE, 0),
                'entertainment_minutes_today': entertainment_today,
                'documentary_minutes': session_totals.get(UsageSession.SessionType.DOCUMENTARY, 0),
                'screen_time_minutes': session_totals.get(UsageSession.SessionType.SCREEN_TIME, 0) + open_screen_minutes,
                'total_app_minutes': total_app_minutes,
                'mission_completion_count': today_attempts.count(),
                'blocked_attempts': blocked_count,
                'cap_left_today': cap_left,
            },
            'mission_mix': mission_mix,
            'alerts': alerts,
            'weekly_summary': (
                'Hệ thống đang ghi nhận các phiên học, đọc, vận động và giải trí gần đây để phụ huynh điều chỉnh luật phù hợp. '
                'Bản tóm tắt này chỉ mô tả hành vi sử dụng trong app, không đưa ra chẩn đoán.'
            ),
            'recent_sessions': UsageSessionSerializer(sessions[:10], many=True).data,
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
        },
        'usage_sessions': [
            {
                'session_type': session.session_type,
                'duration_minutes': session.duration_minutes,
                'started_at': session.started_at.isoformat() if session.started_at else None,
            }
            for session in sessions
        ],
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
def start_session(request):
    child_id = request.data.get('child_id')
    try:
        child = _get_child_for_parent(request.user, child_id)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Không tìm thấy hồ sơ trẻ.'}, status=status.HTTP_404_NOT_FOUND)

    now = timezone.now()
    open_sessions = UsageSession.objects.filter(
        child=child,
        session_type=UsageSession.SessionType.SCREEN_TIME,
        ended_at__isnull=True,
    )
    for open_session in open_sessions:
        open_session.duration_minutes = _elapsed_minutes(open_session.started_at, now)
        open_session.ended_at = now
        open_session.notes = 'Phiên cũ được hệ thống tự đóng trước khi bắt đầu phiên mới.'
        open_session.save(update_fields=['duration_minutes', 'ended_at', 'notes'])

    session = UsageSession.objects.create(
        child=child,
        session_type=UsageSession.SessionType.SCREEN_TIME,
        duration_minutes=0,
        notes='Phiên sử dụng app đang được tính giờ theo xác nhận của phụ huynh.',
    )

    ParentOverrideLog.objects.create(
        parent=request.user,
        child=child,
        action_type=ParentOverrideLog.ActionType.ENTERTAINMENT_RESUME,
        description=f'Bắt đầu phiên sử dụng thời gian thực cho trẻ: {child.nickname}',
        metadata={'usage_session_id': str(session.id)},
    )
    return Response({'ok': True, 'session_id': session.id, 'started_at': session.started_at})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def stop_session(request):
    child_id = request.data.get('child_id')
    session_id = request.data.get('session_id')
    discard = bool(request.data.get('discard', False))

    try:
        child = _get_child_for_parent(request.user, child_id)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Không tìm thấy hồ sơ trẻ.'}, status=status.HTTP_404_NOT_FOUND)

    session_qs = UsageSession.objects.filter(
        child=child,
        session_type=UsageSession.SessionType.SCREEN_TIME,
    )
    if session_id:
        session_qs = session_qs.filter(id=session_id)
    else:
        session_qs = session_qs.filter(ended_at__isnull=True)

    session = session_qs.order_by('-started_at').first()
    if not session:
        return Response({'detail': 'Không tìm thấy phiên sử dụng đang mở.'}, status=status.HTTP_404_NOT_FOUND)

    if discard:
        ParentOverrideLog.objects.create(
            parent=request.user,
            child=child,
            action_type=ParentOverrideLog.ActionType.ENTERTAINMENT_PAUSE,
            description=f'Phụ huynh kết thúc phiên sử dụng của trẻ {child.nickname} nhưng không lưu thời lượng.',
            metadata={'usage_session_id': str(session.id), 'discarded': True},
        )
        session.delete()
        return Response({'ok': True, 'discarded': True, 'saved_minutes': 0})

    now = timezone.now()
    duration_minutes = _elapsed_minutes(session.started_at, now)
    session.duration_minutes = duration_minutes
    session.ended_at = now
    session.notes = 'Phiên sử dụng app được phụ huynh xác nhận kết thúc.'
    session.save(update_fields=['duration_minutes', 'ended_at', 'notes'])

    ParentOverrideLog.objects.create(
        parent=request.user,
        child=child,
        action_type=ParentOverrideLog.ActionType.ENTERTAINMENT_PAUSE,
        description=f'Kết thúc phiên sử dụng của trẻ {child.nickname}: {duration_minutes} phút',
        metadata={'usage_session_id': str(session.id)},
    )

    return Response({'ok': True, 'session_id': session.id, 'saved_minutes': duration_minutes, 'ended_at': session.ended_at})
