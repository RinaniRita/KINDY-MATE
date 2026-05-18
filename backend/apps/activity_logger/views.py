from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.gamification.models import RewardTransaction
from apps.learning.models import MissionAttempt
from apps.profiles.models import ChildProfile

from .models import UsageSession
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
        for item in sessions.values('session_type').annotate(total=Sum('duration_minutes'))
    }
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
    blocked_count = sessions.filter(session_type='blocked').count()
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
