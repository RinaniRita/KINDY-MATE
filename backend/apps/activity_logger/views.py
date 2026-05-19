from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.gamification.models import RewardTransaction, RewardWallet
from apps.gamification.serializers import RewardWalletSerializer
from apps.learning.models import MissionAttempt
from apps.profiles.models import ChildProfile, ParentRule
from apps.profiles.serializers import ChildProfileSerializer

from .models import ParentAlert, ParentOverrideLog, UsageSession
from .serializers import UsageSessionSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request):
    child_id = request.query_params.get('child_id')
    try:
        child = ChildProfile.objects.select_related('rules', 'wallet').get(id=child_id, parent=request.user)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Không tìm thấy hồ sơ trẻ thuộc tài khoản này.'}, status=status.HTTP_404_NOT_FOUND)

    today = timezone.localdate()
    sessions = UsageSession.objects.filter(child=child)
    attempts = MissionAttempt.objects.filter(child=child, status=MissionAttempt.Status.COMPLETED)
    today_sessions = sessions.filter(started_at__date=today)

    session_totals = {
        item['session_type']: item['total'] or 0
        for item in today_sessions.values('session_type').annotate(total=Sum('duration_minutes'))
    }
    now = timezone.now()
    open_screen_minutes = sum(
        max(round((now - session.started_at).total_seconds() / 60), 1)
        for session in today_sessions.filter(
            session_type=UsageSession.SessionType.SCREEN_TIME,
            ended_at__isnull=True,
        )
    )
    total_app_minutes = (
        today_sessions.exclude(session_type='blocked').aggregate(total=Sum('duration_minutes'))['total'] or 0
    ) + open_screen_minutes
    mission_mix = {
        item['mission__mission_type']: item['count']
        for item in attempts.values('mission__mission_type').annotate(count=Count('id'))
    }
    entertainment_today = (
        today_sessions.filter(session_type__in=['entertainment', 'documentary']).aggregate(
            total=Sum('duration_minutes')
        )['total']
        or 0
    )
    blocked_count = today_sessions.filter(session_type='blocked').count()
    transactions = RewardTransaction.objects.filter(child=child).order_by('-created_at')[:8]

    alerts = []
    cap_left = max(child.rules.daily_entertainment_cap_minutes - entertainment_today, 0)
    if cap_left == 0:
        alerts.append('Giải trí hôm nay đã đạt giới hạn phụ huynh đặt.')
    else:
        alerts.append(f'Còn {cap_left} phút giải trí theo giới hạn hôm nay.')
    if mission_mix.get('reading', 0) < 1:
        alerts.append('Nhiệm vụ đọc còn ít. Có thể ưu tiên một nhiệm vụ đọc nhẹ nhàng trước giải trí.')
    if blocked_count:
        alerts.append('Có lượt bị chặn do luật an toàn. Đây là tín hiệu để phụ huynh xem lại cài đặt, không phải đánh giá trẻ.')
    if child.rules.entertainment_paused:
        alerts.append('Phụ huynh đang tạm dừng giải trí. Trẻ vẫn có thể làm nhiệm vụ học tập, đọc và vận động.')

    alerts = []
    if cap_left == 0:
        alerts.append('Giải trí hôm nay đã đạt giới hạn phụ huynh đặt.')
    if attempts.count() > 0 and mission_mix.get('reading', 0) < 1:
        alerts.append('Hôm nay chưa có nhiệm vụ đọc. Có thể gợi ý một nhiệm vụ đọc nhẹ nhàng trước giải trí.')
    if blocked_count:
        alerts.append('Có lượt bị chặn do luật an toàn hôm nay. Đây là tín hiệu để phụ huynh xem lại cài đặt, không phải đánh giá trẻ.')
    if child.rules.entertainment_paused:
        alerts.append('Phụ huynh đang tạm dừng giải trí. Trẻ vẫn có thể làm nhiệm vụ học tập, đọc và vận động.')
    alerts.extend(
        ParentAlert.objects.filter(child=child, is_read=False)
        .order_by('-created_at')
        .values_list('message', flat=True)[:4]
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
            },
            'metrics': {
                'learning_minutes': session_totals.get('learning', 0),
                'reading_minutes': session_totals.get('reading', 0),
                'movement_minutes': session_totals.get('movement', 0),
                'creative_minutes': session_totals.get('creative', 0),
                'entertainment_minutes_today': entertainment_today,
                'documentary_minutes': session_totals.get('documentary', 0),
                'screen_time_minutes': session_totals.get('screen_time', 0) + open_screen_minutes,
                'total_app_minutes': total_app_minutes,
                'mission_completion_count': attempts.count(),
                'blocked_attempts': blocked_count,
                'cap_left_today': cap_left,
            },
            'mission_mix': mission_mix,
            'alerts': alerts,
            'weekly_summary': (
                'Hệ thống ghi nhận hoạt động học, đọc, vận động và giải trí để phụ huynh điều chỉnh luật phù hợp. '
                'Báo cáo này không đưa ra chẩn đoán y tế hoặc tâm lý.'
            ),
            'recent_sessions': UsageSessionSerializer(sessions[:8], many=True).data,
            'recent_transactions': [
                {
                    'id': transaction.id,
                    'type': transaction.transaction_type,
                    'points': transaction.points_amount,
                    'reason': transaction.reason,
                    'created_at': transaction.created_at,
                }
                for transaction in transactions
            ],
        }
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def hourly_usage(request):
    """Return usage breakdown by hour-of-day for a child (today)."""
    child_id = request.query_params.get('child_id')
    try:
        child = ChildProfile.objects.get(id=child_id, parent=request.user)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Không tìm thấy hồ sơ trẻ.'}, status=status.HTTP_404_NOT_FOUND)

    today = timezone.localdate()
    sessions = UsageSession.objects.filter(child=child, started_at__date=today)
    now = timezone.now()

    # Build 24-hour breakdown
    hours = []
    for h in range(24):
        hour_sessions = sessions.filter(started_at__hour=h)
        total = hour_sessions.aggregate(total=Sum('duration_minutes'))['total'] or 0
        breakdown = {}
        for item in hour_sessions.values('session_type').annotate(mins=Sum('duration_minutes')):
            breakdown[item['session_type']] = item['mins'] or 0
        for open_session in hour_sessions.filter(ended_at__isnull=True):
            elapsed = max(round((now - open_session.started_at).total_seconds() / 60), 1)
            total += elapsed
            breakdown[open_session.session_type] = breakdown.get(open_session.session_type, 0) + elapsed
        hours.append({
            'hour': h,
            'label': f'{h:02d}:00',
            'total_minutes': total,
            'breakdown': breakdown,
        })

    return Response({'child_id': str(child.id), 'date': str(today), 'hours': hours})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_log(request):
    """Return paginated audit log of parent override actions."""
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
    """Export all data for a child as JSON (GDPR/COPPA compliance)."""
    try:
        child = ChildProfile.objects.select_related('rules', 'wallet').get(id=child_id, parent=request.user)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Không tìm thấy hồ sơ trẻ.'}, status=status.HTTP_404_NOT_FOUND)

    # Log the export action
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
                'session_type': s.session_type,
                'duration_minutes': s.duration_minutes,
                'started_at': s.started_at.isoformat() if s.started_at else None,
            }
            for s in sessions
        ],
        'mission_attempts': [
            {
                'mission_title': a.mission.title,
                'status': a.status,
                'points_awarded': a.points_awarded,
                'started_at': a.started_at.isoformat() if a.started_at else None,
                'completed_at': a.completed_at.isoformat() if a.completed_at else None,
            }
            for a in attempts.select_related('mission')
        ],
        'transactions': [
            {
                'type': t.transaction_type,
                'points': t.points_amount,
                'reason': t.reason,
                'created_at': t.created_at.isoformat(),
            }
            for t in transactions
        ],
    }

    return Response(export_data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_child_data(request, child_id):
    """Permanently delete all data for a child (GDPR right to be forgotten)."""
    try:
        child = ChildProfile.objects.get(id=child_id, parent=request.user)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Không tìm thấy hồ sơ trẻ.'}, status=status.HTTP_404_NOT_FOUND)

    nickname = child.nickname

    # Log the delete action BEFORE deleting
    ParentOverrideLog.objects.create(
        parent=request.user,
        child=None,  # will be null after deletion
        action_type=ParentOverrideLog.ActionType.CHILD_DATA_DELETE,
        description=f'Permanently deleted all data for child: {nickname}',
        metadata={'deleted_child_nickname': nickname, 'deleted_child_id': str(child_id)},
    )

    child.delete()

    return Response({'detail': f'Toàn bộ dữ liệu của {nickname} đã được xóa vĩnh viễn.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_session(request):
    """Start tracking real-time usage session for child profile."""
    child_id = request.data.get('child_id')
    try:
        child = ChildProfile.objects.get(id=child_id, parent=request.user)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Không tìm thấy hồ sơ trẻ.'}, status=status.HTTP_404_NOT_FOUND)

    now = timezone.now()
    open_sessions = UsageSession.objects.filter(
        child=child,
        session_type=UsageSession.SessionType.SCREEN_TIME,
        ended_at__isnull=True,
    )
    for open_session in open_sessions:
        elapsed_seconds = max(int((now - open_session.started_at).total_seconds()), 0)
        open_session.duration_minutes = max(round(elapsed_seconds / 60), 1)
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
    """Stop tracking real-time usage session, persisting total duration into PostgreSQL."""
    child_id = request.data.get('child_id')
    session_id = request.data.get('session_id')
    discard = bool(request.data.get('discard', False))

    try:
        child = ChildProfile.objects.get(id=child_id, parent=request.user)
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
    elapsed_seconds = max(int((now - session.started_at).total_seconds()), 0)
    duration_minutes = max(round(elapsed_seconds / 60), 1)
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
