from datetime import timedelta

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.activity_logger.models import ActivityLog, EntertainmentSession, ParentAlert, UsageSession
from apps.learning.models import ContentItem, MissionAttempt

from .models import RewardTransaction


FRIENDLY_BLOCK_MESSAGES = {
    'not_enough_points': 'Con chưa đủ điểm. Con có thể chọn một nhiệm vụ đọc nhẹ nhàng để nhận thêm điểm.',
    'daily_cap_reached': 'Hôm nay con đã dùng hết thời gian giải trí. Con có thể quay lại vào ngày mai hoặc chọn một nhiệm vụ đọc nhẹ nhàng.',
    'cooldown_active': 'Bây giờ là thời gian nghỉ sau giải trí. Con có thể chọn nhiệm vụ vận động nhẹ hoặc đọc ngắn.',
    'parent_pause': 'Phụ huynh đang tạm dừng giải trí. Con vẫn có thể làm nhiệm vụ tăng trưởng.',
    'content_not_approved': 'Nội dung này đang chờ phụ huynh duyệt. Con hãy chọn một nội dung đã được duyệt.',
    'category_not_allowed': 'Danh mục này chưa được phụ huynh cho phép. Con hãy chọn một hoạt động khác.',
    'age_mismatch': 'Nội dung này chưa phù hợp với độ tuổi của con. Hãy chọn một nội dung khác.',
    'bedtime_lock': 'Bây giờ là thời gian nghỉ theo cài đặt của phụ huynh.',
    'need_reading_first': 'Con cần hoàn thành một nhiệm vụ đọc hoặc học trước khi mở thêm giải trí.',
}


def entertainment_minutes_today(child):
    return (
        EntertainmentSession.objects.filter(
            child=child,
            status__in=[EntertainmentSession.Status.ACTIVE, EntertainmentSession.Status.COMPLETED],
            started_at__date=timezone.localdate(),
        ).aggregate(total=Sum('duration_minutes_actual'))['total']
        or 0
    )


def is_bedtime_locked(rules):
    if not rules.bedtime_lock_start or not rules.bedtime_lock_end:
        return False
    now = timezone.localtime().time()
    if rules.bedtime_lock_start < rules.bedtime_lock_end:
        return rules.bedtime_lock_start <= now <= rules.bedtime_lock_end
    return now >= rules.bedtime_lock_start or now <= rules.bedtime_lock_end


def check_reward_access(child, reward_item):
    rules = child.rules
    wallet = child.wallet
    content = reward_item.content_item
    is_timed = reward_item.duration_minutes > 0

    if rules.entertainment_paused:
        return False, 'parent_pause'
    if is_bedtime_locked(rules):
        return False, 'bedtime_lock'
    if reward_item.approval_status != reward_item.ApprovalStatus.APPROVED:
        return False, 'content_not_approved'
    if content and content.approval_status != ContentItem.ApprovalStatus.APPROVED:
        return False, 'content_not_approved'
    if content and not (content.age_min <= child.age <= content.age_max):
        return False, 'age_mismatch'
    if reward_item.reward_type not in rules.allowed_categories:
        return False, 'category_not_allowed'
    if wallet.points_balance < reward_item.points_cost:
        return False, 'not_enough_points'
    if is_timed and reward_item.duration_minutes > max(rules.daily_entertainment_cap_minutes - entertainment_minutes_today(child), 0):
        return False, 'daily_cap_reached'
    if is_timed and rules.cooldown_minutes:
        recent_cutoff = timezone.now() - timedelta(minutes=rules.cooldown_minutes)
        if EntertainmentSession.objects.filter(child=child, started_at__gte=recent_cutoff).exists():
            return False, 'cooldown_active'
    if is_timed and rules.require_balanced_missions:
        has_reading_or_learning = MissionAttempt.objects.filter(
            child=child,
            status=MissionAttempt.Status.COMPLETED,
            mission__mission_type__in=['reading', 'learning'],
            completed_at__date=timezone.localdate(),
        ).exists()
        if not has_reading_or_learning:
            return False, 'need_reading_first'
    return True, ''


@transaction.atomic
def spend_reward_for_child(child, reward_item):
    allowed, reason_code = check_reward_access(child, reward_item)
    content = reward_item.content_item
    if not allowed:
        message = FRIENDLY_BLOCK_MESSAGES[reason_code]
        RewardTransaction.objects.create(
            child=child,
            transaction_type=RewardTransaction.TransactionType.BLOCKED,
            points_amount=0,
            reason=message,
            source_type='reward',
            content=content,
        )
        EntertainmentSession.objects.create(
            child=child,
            reward_item=reward_item,
            content=content,
            status=EntertainmentSession.Status.BLOCKED,
            blocked_reason=message,
        )
        ActivityLog.objects.create(
            child=child,
            event_type='reward_blocked',
            event_category='safety',
            metadata={'reward_item_id': reward_item.id, 'reason_code': reason_code},
        )
        ParentAlert.objects.create(
            parent=child.parent,
            child=child,
            alert_type=reason_code,
            severity=ParentAlert.Severity.INFO,
            message=message,
        )
        return False, message, child.wallet

    wallet = child.wallet
    now = timezone.now()
    wallet.points_balance -= reward_item.points_cost
    wallet.points_spent_total += reward_item.points_cost
    wallet.save(update_fields=['points_balance', 'points_spent_total', 'updated_at'])
    RewardTransaction.objects.create(
        child=child,
        transaction_type=RewardTransaction.TransactionType.SPEND,
        points_amount=-reward_item.points_cost,
        reason=f'Reward spent: {reward_item.title}',
        source_type='reward',
        content=content,
    )
    EntertainmentSession.objects.create(
        child=child,
        reward_item=reward_item,
        content=content,
        points_spent=reward_item.points_cost,
        duration_minutes_allowed=reward_item.duration_minutes,
        duration_minutes_actual=reward_item.duration_minutes,
        status=EntertainmentSession.Status.COMPLETED,
        started_at=now,
        ended_at=now,
    )
    usage_session = UsageSession.objects.create(
        child=child,
        session_type=reward_item.reward_type,
        content=content,
        duration_minutes=reward_item.duration_minutes,
        points_spent=reward_item.points_cost,
        notes='Reward allowed within parent rules.',
    )
    if reward_item.duration_minutes > 0:
        usage_session.ended_at = usage_session.started_at + timedelta(minutes=reward_item.duration_minutes)
        usage_session.save(update_fields=['ended_at'])
    ActivityLog.objects.create(
        child=child,
        event_type='reward_spent',
        event_category=reward_item.reward_type,
        duration_seconds=reward_item.duration_minutes * 60,
        metadata={'reward_item_id': reward_item.id, 'points_spent': reward_item.points_cost},
    )
    return True, 'Reward allowed within parent rules.', wallet
