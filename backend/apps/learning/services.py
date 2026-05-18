from django.utils import timezone

from apps.activity_logger.models import ActivityLog, UsageSession
from apps.gamification.models import RewardTransaction

from .models import MissionAttempt


def calculate_mission_points(child, mission):
    repeated_count = MissionAttempt.objects.filter(
        child=child,
        mission__mission_type=mission.mission_type,
        status=MissionAttempt.Status.COMPLETED,
        started_at__date=timezone.localdate(),
    ).count()
    if repeated_count >= 4:
        return max(mission.points_reward // 4, 1)
    if repeated_count >= 2:
        return max(mission.points_reward // 2, 2)
    return mission.points_reward


def complete_mission_for_child(child, mission, score=100):
    points_awarded = calculate_mission_points(child, mission)
    attempt = MissionAttempt.objects.create(
        child=child,
        mission=mission,
        status=MissionAttempt.Status.COMPLETED,
        score=score,
        points_awarded=points_awarded,
        verification_method=mission.verification_method,
        completed_at=timezone.now(),
        metadata={'source': 'mvp_rule_based'},
    )
    wallet = child.wallet
    wallet.points_balance += points_awarded
    wallet.points_earned_total += points_awarded
    wallet.save(update_fields=['points_balance', 'points_earned_total', 'updated_at'])
    RewardTransaction.objects.create(
        child=child,
        transaction_type=RewardTransaction.TransactionType.EARN,
        points_amount=points_awarded,
        reason=f'Mission completed: {mission.title}',
        source_type='mission',
        content=mission.source_content,
    )
    UsageSession.objects.create(
        child=child,
        session_type=mission.mission_type,
        content=mission.source_content,
        duration_minutes=mission.estimated_duration_minutes,
        notes='Mission completed through guided flow.',
    )
    ActivityLog.objects.create(
        child=child,
        event_type='mission_completed',
        event_category=mission.mission_type,
        duration_seconds=mission.estimated_duration_minutes * 60,
        metadata={'mission_id': mission.id, 'points_awarded': points_awarded},
    )
    return attempt, wallet
