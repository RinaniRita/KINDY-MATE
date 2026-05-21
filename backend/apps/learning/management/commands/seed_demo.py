from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.activity_logger.models import (
    ActivityLog,
    ChildModeSession,
    EntertainmentSession,
    ParentAlert,
    UsageSession,
)
from apps.gamification.models import (
    ChildMascotInventory,
    MascotItem,
    RewardItem,
    RewardTransaction,
    RewardWallet,
)
from apps.learning.models import ContentItem, Mission, MissionAttempt
from apps.profiles.models import ChildProfile, ParentRule


class Command(BaseCommand):
    help = "Seed dữ liệu demo Kindy-Mate với tài khoản phụ huynh và lịch sử hoạt động đủ dày cho báo cáo."

    def handle(self, *args, **options):
        user_model = get_user_model()

        parent, _ = user_model.objects.update_or_create(
            username="demo_parent",
            defaults={
                "email": "parent@kindymate.local",
                "role": user_model.Role.PARENT,
                "consent_status": True,
                "avatar_id": "parent-mint",
                "is_staff": True,
            },
        )
        parent.set_password("demo1234")
        parent.parent_pin_hash = make_password("1234")
        parent.save()

        parent.child_profiles.all().delete()

        mina = ChildProfile.objects.create(
            parent=parent,
            nickname="Mina",
            age=7,
            avatar_id="milo",
            interests="đại dương, vũ trụ, truyện ngắn",
            favorite_subjects="Đọc sách, khám phá khoa học, tô màu",
            default_language="vi",
        )
        nam = ChildProfile.objects.create(
            parent=parent,
            nickname="Nấm",
            age=5,
            avatar_id="milo",
            interests="động vật, ghép hình, kể chuyện",
            favorite_subjects="Vận động, kể chuyện, sáng tạo",
            default_language="vi",
        )

        for child, profile in (
            (
                mina,
                {
                    "daily_entertainment_cap_minutes": 45,
                    "cooldown_minutes": 10,
                    "require_balanced_missions": True,
                    "voice_enabled": True,
                    "camera_enabled": False,
                    "entertainment_paused": False,
                    "session_duration_limit_minutes": 90,
                    "total_screen_time_limit_minutes": 60,
                    "continuous_screen_time_limit_minutes": 20,
                    "minimum_offscreen_break_minutes": 5,
                    "time_profile": ParentRule.TimeProfile.BALANCED,
                    "allowed_categories": [
                        "reading",
                        "learning",
                        "movement",
                        "creative",
                        "reflection",
                        "documentary",
                        "entertainment",
                        "customization",
                        "mascot_item",
                    ],
                },
            ),
            (
                nam,
                {
                    "daily_entertainment_cap_minutes": 25,
                    "cooldown_minutes": 12,
                    "require_balanced_missions": True,
                    "voice_enabled": False,
                    "camera_enabled": False,
                    "entertainment_paused": False,
                    "session_duration_limit_minutes": 60,
                    "total_screen_time_limit_minutes": 35,
                    "continuous_screen_time_limit_minutes": 15,
                    "minimum_offscreen_break_minutes": 5,
                    "time_profile": ParentRule.TimeProfile.LOW_SCREEN,
                    "allowed_categories": [
                        "reading",
                        "learning",
                        "movement",
                        "creative",
                        "reflection",
                        "documentary",
                        "entertainment",
                        "customization",
                        "mascot_item",
                    ],
                },
            ),
        ):
            ParentRule.objects.create(child=child, **profile)

        mina_wallet = RewardWallet.objects.create(
            child=mina,
            points_balance=58,
            points_earned_total=186,
            points_spent_total=128,
        )
        RewardWallet.objects.create(
            child=nam,
            points_balance=22,
            points_earned_total=66,
            points_spent_total=44,
        )

        content_items = [
            {
                "title": "Truyện ngắn: Đám mây biết đếm",
                "content_type": ContentItem.ContentType.READING,
                "display_category": ContentItem.DisplayCategory.DOC_SACH,
                "age_min": 6,
                "age_max": 8,
                "estimated_duration_minutes": 4,
                "learning_objective": "Đọc hiểu ý chính và nhớ một từ mới.",
                "related_sdg": "SDG4",
                "points_reward_or_cost": 8,
                "cooldown_category": "reading",
                "safety_notes": "Nội dung tự viết, không bạo lực, không hỏi thông tin cá nhân.",
                "content_body": "Mina đọc câu chuyện ngắn về đám mây và trả lời hai câu hỏi hiểu bài.",
            },
            {
                "title": "Đếm sao theo nhóm",
                "content_type": ContentItem.ContentType.LEARNING,
                "display_category": ContentItem.DisplayCategory.HOC_HANH,
                "age_min": 5,
                "age_max": 7,
                "estimated_duration_minutes": 5,
                "learning_objective": "Luyện cộng đơn giản bằng nhóm hình ảnh.",
                "related_sdg": "SDG4",
                "points_reward_or_cost": 9,
                "cooldown_category": "learning",
                "safety_notes": "Câu hỏi ngắn, không tạo áp lực điểm số.",
                "content_body": "Bé đếm các nhóm sao và chọn đáp án đúng.",
            },
            {
                "title": "Jumping Jacks 5 phút",
                "content_type": ContentItem.ContentType.MOVEMENT,
                "display_category": ContentItem.DisplayCategory.VAN_DONG,
                "age_min": 6,
                "age_max": 9,
                "estimated_duration_minutes": 5,
                "learning_objective": "Khuyến khích vận động ngắn, an toàn trong nhà.",
                "related_sdg": "SDG3",
                "points_reward_or_cost": 6,
                "cooldown_category": "movement",
                "safety_notes": "Không cần dụng cụ, có lựa chọn không dùng camera.",
                "content_body": "Làm theo 3 bước vận động ngắn với nhịp chậm.",
            },
            {
                "title": "Sắp xếp bàn học trong 3 phút",
                "content_type": ContentItem.ContentType.REFLECTION,
                "display_category": ContentItem.DisplayCategory.KY_NANG_SONG,
                "age_min": 5,
                "age_max": 8,
                "estimated_duration_minutes": 3,
                "learning_objective": "Rèn nếp gọn gàng và chủ động hoàn thành việc nhỏ.",
                "related_sdg": "SDG4",
                "points_reward_or_cost": 5,
                "cooldown_category": "life_skills",
                "safety_notes": "Chỉ là việc nhỏ trong nhà, không yêu cầu chia sẻ dữ liệu cá nhân.",
                "content_body": "Cất bút, xếp sách, lau bàn học thật nhanh.",
            },
            {
                "title": "Vẽ con vật yêu thích",
                "content_type": ContentItem.ContentType.CREATIVE,
                "display_category": ContentItem.DisplayCategory.SANG_TAO,
                "age_min": 5,
                "age_max": 8,
                "estimated_duration_minutes": 6,
                "learning_objective": "Phát triển sáng tạo với hoạt động vẽ đơn giản.",
                "related_sdg": "SDG4",
                "points_reward_or_cost": 7,
                "cooldown_category": "creative",
                "safety_notes": "Không cần chụp ảnh khuôn mặt, có thể hoàn thành bằng tự xác nhận.",
                "content_body": "Vẽ một con vật và kể 1 câu ngắn về nó.",
            },
            {
                "title": "Video đại dương 5 phút",
                "content_type": ContentItem.ContentType.DOCUMENTARY,
                "display_category": ContentItem.DisplayCategory.KHAM_PHA_KHOA_HOC,
                "age_min": 6,
                "age_max": 9,
                "estimated_duration_minutes": 5,
                "learning_objective": "Quan sát động vật biển và trả lời câu hỏi sau khi xem.",
                "related_sdg": "SDG4",
                "points_reward_or_cost": -10,
                "cooldown_category": "documentary",
                "license_status": "Internal demo placeholder; production needs licensed content.",
                "safety_notes": "Không autoplay, không feed vô hạn, mức kích thích thấp.",
                "content_body": "Video ngắn về sinh vật biển với câu hỏi sau khi xem.",
            },
            {
                "title": "Tô màu khu vườn yên tĩnh",
                "content_type": ContentItem.ContentType.ENTERTAINMENT,
                "display_category": ContentItem.DisplayCategory.TO_MAU,
                "age_min": 5,
                "age_max": 8,
                "estimated_duration_minutes": 6,
                "learning_objective": "Giải trí nhẹ và luyện tập trung với nhịp chậm.",
                "points_reward_or_cost": -8,
                "cooldown_category": "entertainment",
                "license_status": "Internal demo asset.",
                "safety_notes": "Không âm thanh dồn dập, không tính điểm thắng thua.",
                "content_body": "Tô màu khu vườn và chọn bảng màu dịu.",
            },
            {
                "title": "Mũ phi hành gia cho Milo",
                "content_type": ContentItem.ContentType.CUSTOMIZATION,
                "display_category": ContentItem.DisplayCategory.MASCOT,
                "age_min": 5,
                "age_max": 9,
                "estimated_duration_minutes": 0,
                "learning_objective": "Tùy chỉnh mascot nhẹ, không random reward.",
                "points_reward_or_cost": -6,
                "cooldown_category": "customization",
                "license_status": "Internal demo asset.",
                "safety_notes": "Không gacha, không loot box, không mua bằng tiền thật.",
                "content_body": "Đổi đồ cho Milo bằng vật phẩm đã mở khóa.",
            },
            {
                "title": "Clip khu rừng cần duyệt",
                "content_type": ContentItem.ContentType.DOCUMENTARY,
                "display_category": ContentItem.DisplayCategory.KHAM_PHA_KHOA_HOC,
                "age_min": 6,
                "age_max": 9,
                "estimated_duration_minutes": 8,
                "approval_status": ContentItem.ApprovalStatus.NEEDS_REVIEW,
                "requires_parent_approval": True,
                "learning_objective": "Ví dụ nội dung chưa được duyệt.",
                "points_reward_or_cost": -12,
                "cooldown_category": "documentary",
                "license_status": "Pending review.",
                "safety_notes": "Không hiển thị cho trẻ cho tới khi phụ huynh duyệt.",
                "content_body": "Nội dung minh họa cho trạng thái chờ duyệt.",
            },
        ]

        content_by_title = {}
        for item in content_items:
            content, _ = ContentItem.objects.update_or_create(title=item["title"], defaults=item)
            content_by_title[content.title] = content

        missions = [
            {
                "title": "Đọc truyện 4 phút",
                "mission_type": Mission.MissionType.READING,
                "display_category": Mission.DisplayCategory.DOC_SACH,
                "description": "Đọc truyện ngắn về đám mây, sau đó trả lời 2 câu hỏi hiểu bài.",
                "points_reward": 8,
                "estimated_duration_minutes": 4,
                "source_content": content_by_title["Truyện ngắn: Đám mây biết đếm"],
                "verification_method": "reading_comprehension_quiz",
                "safety_notes": "Không dùng free-chat, không hỏi bí mật cá nhân.",
            },
            {
                "title": "Đếm sao theo nhóm",
                "mission_type": Mission.MissionType.LEARNING,
                "display_category": Mission.DisplayCategory.HOC_HANH,
                "description": "Giải 3 câu toán cộng đơn giản bằng hình ảnh sao.",
                "points_reward": 9,
                "estimated_duration_minutes": 5,
                "source_content": content_by_title["Đếm sao theo nhóm"],
                "verification_method": "rule_based_quiz",
                "safety_notes": "Câu hỏi từ content bank đã duyệt.",
            },
            {
                "title": "Jumping Jacks 5 phút",
                "mission_type": Mission.MissionType.MOVEMENT,
                "display_category": Mission.DisplayCategory.VAN_DONG,
                "description": "Hoàn thành bài vận động ngắn, cường độ thấp.",
                "points_reward": 6,
                "estimated_duration_minutes": 5,
                "source_content": content_by_title["Jumping Jacks 5 phút"],
                "verification_method": "self_confirm_or_parent_enabled_camera",
                "safety_notes": "Dừng lại nếu mệt hoặc không đủ không gian.",
            },
            {
                "title": "Sắp xếp góc học tập",
                "mission_type": Mission.MissionType.REFLECTION,
                "display_category": Mission.DisplayCategory.KY_NANG_SONG,
                "description": "Dành vài phút để cất bút, xếp sách và chuẩn bị bàn học gọn gàng.",
                "points_reward": 5,
                "estimated_duration_minutes": 3,
                "source_content": content_by_title["Sắp xếp bàn học trong 3 phút"],
                "verification_method": "guided_prompt",
                "safety_notes": "Chỉ yêu cầu thao tác đơn giản, không cần chụp hình.",
            },
            {
                "title": "Vẽ con vật yêu thích",
                "mission_type": Mission.MissionType.CREATIVE,
                "display_category": Mission.DisplayCategory.SANG_TAO,
                "description": "Vẽ một con vật yêu thích và kể 1 câu ngắn về nó.",
                "points_reward": 7,
                "estimated_duration_minutes": 6,
                "source_content": content_by_title["Vẽ con vật yêu thích"],
                "verification_method": "parent_review_optional",
                "safety_notes": "Không yêu cầu ảnh mặt hoặc dữ liệu nhận dạng.",
            },
        ]

        mission_by_title = {}
        for mission_data in missions:
            mission, _ = Mission.objects.update_or_create(title=mission_data["title"], defaults=mission_data)
            mission_by_title[mission.title] = mission

        reward_items = [
            {
                "title": "Video đại dương 5 phút",
                "reward_type": RewardItem.RewardType.DOCUMENTARY,
                "display_category": RewardItem.DisplayCategory.KHAM_PHA_KHOA_HOC,
                "points_cost": 10,
                "duration_minutes": 5,
                "content_item": content_by_title["Video đại dương 5 phút"],
            },
            {
                "title": "Ghép hình bình tĩnh",
                "reward_type": RewardItem.RewardType.ENTERTAINMENT,
                "display_category": RewardItem.DisplayCategory.GAME_NHE_NHANG,
                "points_cost": 8,
                "duration_minutes": 6,
                "content_item": None,
            },
            {
                "title": "Tô màu khu vườn yên tĩnh",
                "reward_type": RewardItem.RewardType.ENTERTAINMENT,
                "display_category": RewardItem.DisplayCategory.TO_MAU,
                "points_cost": 8,
                "duration_minutes": 6,
                "content_item": content_by_title["Tô màu khu vườn yên tĩnh"],
            },
            {
                "title": "Mũ phi hành gia cho Milo",
                "reward_type": RewardItem.RewardType.MASCOT_ITEM,
                "display_category": RewardItem.DisplayCategory.MASCOT,
                "points_cost": 6,
                "duration_minutes": 0,
                "content_item": content_by_title["Mũ phi hành gia cho Milo"],
            },
            {
                "title": "Clip khu rừng cần duyệt",
                "reward_type": RewardItem.RewardType.DOCUMENTARY,
                "display_category": RewardItem.DisplayCategory.KHAM_PHA_KHOA_HOC,
                "points_cost": 12,
                "duration_minutes": 8,
                "content_item": content_by_title["Clip khu rừng cần duyệt"],
                "approval_status": RewardItem.ApprovalStatus.PENDING,
            },
        ]

        reward_by_title = {}
        for reward in reward_items:
            item, _ = RewardItem.objects.update_or_create(
                title=reward["title"],
                defaults={
                    "reward_type": reward["reward_type"],
                    "display_category": reward["display_category"],
                    "points_cost": reward["points_cost"],
                    "duration_minutes": reward["duration_minutes"],
                    "content_item": reward.get("content_item"),
                    "approval_status": reward.get("approval_status", RewardItem.ApprovalStatus.APPROVED),
                    "description": "Nội dung giải trí an toàn cho trẻ trong hệ sinh thái Kindy-Mate.",
                    "demo_only": True,
                },
            )
            reward_by_title[item.title] = item

        mascot_items = [
            ("Mũ phi hành gia", MascotItem.ItemType.ACCESSORY, 6),
            ("Áo đọc sách", MascotItem.ItemType.OUTFIT, 6),
            ("Nền đại dương", MascotItem.ItemType.BACKGROUND, 6),
            ("Phòng khám phá", MascotItem.ItemType.ROOM, 8),
            ("Huy hiệu đọc sách", MascotItem.ItemType.BADGE, 4),
            ("Áo nhà khoa học", MascotItem.ItemType.OUTFIT, 7),
            ("Kính thiên văn", MascotItem.ItemType.ACCESSORY, 5),
            ("Nền vũ trụ", MascotItem.ItemType.BACKGROUND, 7),
            ("Huy hiệu vận động", MascotItem.ItemType.BADGE, 4),
            ("Phòng sáng tạo", MascotItem.ItemType.ROOM, 8),
        ]

        mascot_by_name = {}
        for name, item_type, cost in mascot_items:
            item, _ = MascotItem.objects.update_or_create(
                name=name,
                defaults={"item_type": item_type, "points_cost": cost, "is_random_reward": False},
            )
            mascot_by_name[name] = item

        ChildMascotInventory.objects.create(child=mina, item=mascot_by_name["Mũ phi hành gia"])
        ChildMascotInventory.objects.create(child=mina, item=mascot_by_name["Nền đại dương"])
        ChildMascotInventory.objects.create(child=mina, item=mascot_by_name["Huy hiệu đọc sách"])
        ChildMascotInventory.objects.create(child=nam, item=mascot_by_name["Áo đọc sách"])

        now = timezone.now()

        def set_created_at(instance, dt):
            instance.__class__.objects.filter(pk=instance.pk).update(created_at=dt)
            instance.refresh_from_db()

        def create_usage(child, *, start, duration, session_type, screen_class, activity_category, display_category="", content=None, status=UsageSession.Status.COMPLETED, points_spent=0, notes=""):
            session = UsageSession.objects.create(
                child=child,
                session_type=session_type,
                status=status,
                screen_class=screen_class,
                screen_based=screen_class in {
                    UsageSession.ScreenClass.SCREEN_LEARNING,
                    UsageSession.ScreenClass.SCREEN_DISCOVERY,
                    UsageSession.ScreenClass.SCREEN_HEALTHY_ENTERTAINMENT,
                    UsageSession.ScreenClass.SCREEN_MASCOT,
                    UsageSession.ScreenClass.IDLE_SCREEN,
                },
                activity_category=activity_category,
                display_category=display_category,
                content=content,
                duration_minutes=duration,
                points_spent=points_spent,
                notes=notes,
            )
            update_fields = {
                "started_at": start,
                "last_heartbeat_at": start + timedelta(minutes=duration),
            }
            if status != UsageSession.Status.ACTIVE:
                update_fields["ended_at"] = start + timedelta(minutes=duration)
            UsageSession.objects.filter(pk=session.pk).update(**update_fields)
            session.refresh_from_db()
            return session

        def create_attempt(child, mission, *, start, duration, points_awarded, score=100, status=MissionAttempt.Status.COMPLETED, metadata=None):
            attempt = MissionAttempt.objects.create(
                child=child,
                mission=mission,
                status=status,
                score=score,
                points_awarded=points_awarded,
                verification_method=mission.verification_method,
                metadata=metadata or {},
            )
            MissionAttempt.objects.filter(pk=attempt.pk).update(
                started_at=start,
                completed_at=start + timedelta(minutes=duration) if status == MissionAttempt.Status.COMPLETED else None,
            )
            attempt.refresh_from_db()
            return attempt

        def create_transaction(child, *, when, transaction_type, points_amount, reason, source_type="system", content=None):
            tx = RewardTransaction.objects.create(
                child=child,
                transaction_type=transaction_type,
                points_amount=points_amount,
                reason=reason,
                source_type=source_type,
                content=content,
            )
            RewardTransaction.objects.filter(pk=tx.pk).update(created_at=when)
            tx.refresh_from_db()
            return tx

        def create_entertainment(child, *, reward_item, when, status, duration_allowed, duration_actual, points_spent, blocked_reason=""):
            session = EntertainmentSession.objects.create(
                child=child,
                reward_item=reward_item,
                content=reward_item.content_item,
                points_spent=points_spent,
                duration_minutes_allowed=duration_allowed,
                duration_minutes_actual=duration_actual,
                status=status,
                blocked_reason=blocked_reason,
                started_at=when if status != EntertainmentSession.Status.BLOCKED else None,
                ended_at=when + timedelta(minutes=duration_actual) if status == EntertainmentSession.Status.COMPLETED else None,
            )
            EntertainmentSession.objects.filter(pk=session.pk).update(created_at=when)
            session.refresh_from_db()
            return session

        def create_log(child, *, when, event_type, event_category, duration_seconds=0, metadata=None):
            log = ActivityLog.objects.create(
                child=child,
                event_type=event_type,
                event_category=event_category,
                duration_seconds=duration_seconds,
                metadata=metadata or {},
            )
            ActivityLog.objects.filter(pk=log.pk).update(created_at=when)
            log.refresh_from_db()
            return log

        def create_alert(child, *, when, alert_type, severity, message, is_read=False):
            alert = ParentAlert.objects.create(
                parent=parent,
                child=child,
                alert_type=alert_type,
                severity=severity,
                message=message,
                is_read=is_read,
            )
            ParentAlert.objects.filter(pk=alert.pk).update(created_at=when)
            alert.refresh_from_db()
            return alert

        def create_child_mode_session(child, *, start, status, session_minutes, screen_minutes, continuous_screen_minutes, offscreen_minutes, current_activity_type="", current_activity_title="", ended_reason="", ended_at=None, last_heartbeat_at=None):
            session = ChildModeSession.objects.create(
                child=child,
                status=status,
                ended_reason=ended_reason,
                session_minutes=session_minutes,
                screen_minutes=screen_minutes,
                continuous_screen_minutes=continuous_screen_minutes,
                offscreen_minutes=offscreen_minutes,
                last_heartbeat_at=last_heartbeat_at or (ended_at or start),
                current_activity_type=current_activity_type,
                current_activity_title=current_activity_title,
                current_segment_started_at=start,
            )
            ChildModeSession.objects.filter(pk=session.pk).update(
                started_at=start,
                ended_at=ended_at,
                last_heartbeat_at=last_heartbeat_at or (ended_at or start),
            )
            session.refresh_from_db()
            return session

        # Mina: dữ liệu dày, đủ sống động cho dashboard/report
        mina_day_4 = now - timedelta(days=4, hours=5)
        mina_day_3 = now - timedelta(days=3, hours=4)
        mina_day_2 = now - timedelta(days=2, hours=3)
        mina_day_1 = now - timedelta(days=1, hours=2)
        mina_today_1 = now.replace(hour=9, minute=5, second=0, microsecond=0)
        mina_today_2 = now.replace(hour=14, minute=20, second=0, microsecond=0)
        mina_live_start = now - timedelta(minutes=12)

        create_child_mode_session(
            mina,
            start=mina_day_1,
            status=ChildModeSession.Status.COMPLETED,
            ended_reason=ChildModeSession.EndedReason.MANUAL_END,
            session_minutes=46,
            screen_minutes=30,
            continuous_screen_minutes=0,
            offscreen_minutes=16,
            current_activity_type="offscreen_task",
            current_activity_title="Jumping Jacks 5 phút",
            ended_at=mina_day_1 + timedelta(minutes=46),
        )

        mina_live_child_session = create_child_mode_session(
            mina,
            start=mina_live_start,
            status=ChildModeSession.Status.ACTIVE,
            session_minutes=0,
            screen_minutes=0,
            continuous_screen_minutes=0,
            offscreen_minutes=0,
            current_activity_type="screen_learning",
            current_activity_title="Đọc truyện 4 phút",
            last_heartbeat_at=now,
        )

        # Past sessions for Mina
        create_usage(
            mina,
            start=mina_day_4,
            duration=12,
            session_type=UsageSession.SessionType.READING,
            screen_class=UsageSession.ScreenClass.SCREEN_LEARNING,
            activity_category="reading",
            display_category="doc_sach",
            content=content_by_title["Truyện ngắn: Đám mây biết đếm"],
            notes="Đọc truyện và trả lời câu hỏi hiểu bài.",
        )
        create_usage(
            mina,
            start=mina_day_4 + timedelta(minutes=18),
            duration=8,
            session_type=UsageSession.SessionType.LEARNING,
            screen_class=UsageSession.ScreenClass.SCREEN_LEARNING,
            activity_category="learning",
            display_category="hoc_hanh",
            content=content_by_title["Đếm sao theo nhóm"],
            notes="Làm 3 câu học tập ngắn.",
        )
        create_usage(
            mina,
            start=mina_day_4 + timedelta(minutes=34),
            duration=6,
            session_type=UsageSession.SessionType.MOVEMENT,
            screen_class=UsageSession.ScreenClass.OFFSCREEN_TASK,
            activity_category="movement",
            display_category="van_dong",
            content=content_by_title["Jumping Jacks 5 phút"],
            notes="Hoạt động rời màn hình.",
        )
        create_usage(
            mina,
            start=mina_day_3,
            duration=7,
            session_type=UsageSession.SessionType.CREATIVE,
            screen_class=UsageSession.ScreenClass.OFFSCREEN_TASK,
            activity_category="creativity",
            display_category="sang_tao",
            content=content_by_title["Vẽ con vật yêu thích"],
            notes="Vẽ và kể chuyện ngắn.",
        )
        create_usage(
            mina,
            start=mina_day_3 + timedelta(minutes=20),
            duration=5,
            session_type=UsageSession.SessionType.DOCUMENTARY,
            screen_class=UsageSession.ScreenClass.SCREEN_DISCOVERY,
            activity_category="discovery",
            display_category="kham_pha_khoa_hoc",
            content=content_by_title["Video đại dương 5 phút"],
            points_spent=10,
            notes="Xem documentary ngắn.",
        )
        create_usage(
            mina,
            start=mina_day_2,
            duration=6,
            session_type=UsageSession.SessionType.ENTERTAINMENT,
            screen_class=UsageSession.ScreenClass.SCREEN_HEALTHY_ENTERTAINMENT,
            activity_category="healthy_entertainment",
            display_category="to_mau",
            content=content_by_title["Tô màu khu vườn yên tĩnh"],
            points_spent=8,
            notes="Tô màu digital.",
        )
        create_usage(
            mina,
            start=mina_day_2 + timedelta(minutes=18),
            duration=3,
            session_type=UsageSession.SessionType.CUSTOMIZATION,
            screen_class=UsageSession.ScreenClass.SCREEN_MASCOT,
            activity_category="mascot",
            display_category="mascot",
            content=content_by_title["Mũ phi hành gia cho Milo"],
            points_spent=6,
            notes="Đổi đồ cho Milo.",
        )
        create_usage(
            mina,
            start=mina_day_2 + timedelta(minutes=30),
            duration=4,
            session_type=UsageSession.SessionType.REFLECTION,
            screen_class=UsageSession.ScreenClass.OFFSCREEN_TASK,
            activity_category="life_skill",
            display_category="ky_nang_song",
            content=content_by_title["Sắp xếp bàn học trong 3 phút"],
            notes="Sắp xếp góc học tập.",
        )
        create_usage(
            mina,
            start=mina_today_1,
            duration=9,
            session_type=UsageSession.SessionType.LEARNING,
            screen_class=UsageSession.ScreenClass.SCREEN_LEARNING,
            activity_category="learning",
            display_category="hoc_hanh",
            content=content_by_title["Đếm sao theo nhóm"],
            notes="Học tập buổi sáng.",
        )
        create_usage(
            mina,
            start=mina_today_1 + timedelta(minutes=14),
            duration=5,
            session_type=UsageSession.SessionType.MOVEMENT,
            screen_class=UsageSession.ScreenClass.OFFSCREEN_TASK,
            activity_category="movement",
            display_category="van_dong",
            content=content_by_title["Jumping Jacks 5 phút"],
            notes="Nghỉ vận động ngắn.",
        )
        create_usage(
            mina,
            start=mina_today_2,
            duration=6,
            session_type=UsageSession.SessionType.DOCUMENTARY,
            screen_class=UsageSession.ScreenClass.SCREEN_DISCOVERY,
            activity_category="discovery",
            display_category="kham_pha_khoa_hoc",
            content=content_by_title["Video đại dương 5 phút"],
            points_spent=10,
            notes="Khám phá khoa học buổi chiều.",
        )
        create_usage(
            mina,
            start=mina_today_2 + timedelta(minutes=10),
            duration=6,
            session_type=UsageSession.SessionType.ENTERTAINMENT,
            screen_class=UsageSession.ScreenClass.SCREEN_HEALTHY_ENTERTAINMENT,
            activity_category="healthy_entertainment",
            display_category="to_mau",
            content=content_by_title["Tô màu khu vườn yên tĩnh"],
            points_spent=8,
            notes="Giải trí lành mạnh.",
        )
        create_usage(
            mina,
            start=now - timedelta(minutes=4),
            duration=0,
            session_type=UsageSession.SessionType.BLOCKED,
            screen_class=UsageSession.ScreenClass.SCREEN_HEALTHY_ENTERTAINMENT,
            activity_category="healthy_entertainment",
            display_category="game_nhe_nhang",
            status=UsageSession.Status.BLOCKED,
            notes="Con chưa đủ điểm. Con có thể chọn một nhiệm vụ đọc nhẹ nhàng để nhận thêm điểm.",
        )
        active_segment = create_usage(
            mina,
            start=mina_live_start,
            duration=12,
            session_type=UsageSession.SessionType.READING,
            screen_class=UsageSession.ScreenClass.SCREEN_LEARNING,
            activity_category="reading",
            display_category="doc_sach",
            content=content_by_title["Truyện ngắn: Đám mây biết đếm"],
            status=UsageSession.Status.ACTIVE,
            notes="Đọc truyện động vật biển.",
        )
        UsageSession.objects.filter(pk=active_segment.pk).update(
            child_mode_session=mina_live_child_session,
            ended_at=None,
            last_heartbeat_at=now,
        )
        ChildModeSession.objects.filter(pk=mina_live_child_session.pk).update(
            current_segment_started_at=mina_live_start,
            current_activity_type="screen_learning",
            current_activity_title="Đọc truyện động vật biển",
            last_heartbeat_at=now,
        )

        # Mission attempts for Mina
        create_attempt(mina, mission_by_title["Đọc truyện 4 phút"], start=mina_day_4, duration=4, points_awarded=8, metadata={"source": "seed_demo"})
        create_attempt(mina, mission_by_title["Đếm sao theo nhóm"], start=mina_day_4 + timedelta(minutes=18), duration=5, points_awarded=9, metadata={"source": "seed_demo"})
        create_attempt(mina, mission_by_title["Jumping Jacks 5 phút"], start=mina_day_3, duration=5, points_awarded=6, metadata={"source": "seed_demo"})
        create_attempt(mina, mission_by_title["Vẽ con vật yêu thích"], start=mina_day_3 + timedelta(minutes=16), duration=6, points_awarded=7, metadata={"source": "seed_demo"})
        create_attempt(mina, mission_by_title["Sắp xếp góc học tập"], start=mina_day_2 + timedelta(minutes=10), duration=3, points_awarded=5, metadata={"source": "seed_demo"})
        create_attempt(mina, mission_by_title["Đếm sao theo nhóm"], start=mina_today_1, duration=5, points_awarded=9, metadata={"source": "seed_demo"})
        create_attempt(mina, mission_by_title["Jumping Jacks 5 phút"], start=mina_today_1 + timedelta(minutes=14), duration=5, points_awarded=6, metadata={"source": "seed_demo"})
        create_attempt(mina, mission_by_title["Đọc truyện 4 phút"], start=mina_live_start, duration=4, points_awarded=8, metadata={"source": "seed_demo", "live_context": True})

        # Reward and activity timelines for Mina
        create_transaction(mina, when=mina_day_4 + timedelta(minutes=4), transaction_type=RewardTransaction.TransactionType.EARN, points_amount=8, reason="Hoàn thành nhiệm vụ: Đọc truyện 4 phút", source_type="mission", content=content_by_title["Truyện ngắn: Đám mây biết đếm"])
        create_transaction(mina, when=mina_day_4 + timedelta(minutes=24), transaction_type=RewardTransaction.TransactionType.EARN, points_amount=9, reason="Hoàn thành nhiệm vụ: Đếm sao theo nhóm", source_type="mission", content=content_by_title["Đếm sao theo nhóm"])
        create_transaction(mina, when=mina_day_3 + timedelta(minutes=8), transaction_type=RewardTransaction.TransactionType.SPEND, points_amount=-10, reason="Đổi phần thưởng: Video đại dương 5 phút", source_type="reward", content=content_by_title["Video đại dương 5 phút"])
        create_transaction(mina, when=mina_day_2 + timedelta(minutes=8), transaction_type=RewardTransaction.TransactionType.SPEND, points_amount=-8, reason="Đổi phần thưởng: Tô màu khu vườn yên tĩnh", source_type="reward", content=content_by_title["Tô màu khu vườn yên tĩnh"])
        create_transaction(mina, when=mina_day_2 + timedelta(minutes=20), transaction_type=RewardTransaction.TransactionType.SPEND, points_amount=-6, reason="Đổi phần thưởng: Mũ phi hành gia cho Milo", source_type="reward", content=content_by_title["Mũ phi hành gia cho Milo"])
        create_transaction(mina, when=mina_today_1 + timedelta(minutes=6), transaction_type=RewardTransaction.TransactionType.EARN, points_amount=9, reason="Hoàn thành nhiệm vụ: Đếm sao theo nhóm", source_type="mission", content=content_by_title["Đếm sao theo nhóm"])
        create_transaction(mina, when=mina_today_2 + timedelta(minutes=2), transaction_type=RewardTransaction.TransactionType.SPEND, points_amount=-10, reason="Đổi phần thưởng: Video đại dương 5 phút", source_type="reward", content=content_by_title["Video đại dương 5 phút"])
        create_transaction(mina, when=now - timedelta(minutes=3), transaction_type=RewardTransaction.TransactionType.BLOCKED, points_amount=0, reason="Con chưa đủ điểm. Con có thể chọn một nhiệm vụ đọc nhẹ nhàng để nhận thêm điểm.", source_type="reward", content=None)

        create_entertainment(mina, reward_item=reward_by_title["Video đại dương 5 phút"], when=mina_day_3 + timedelta(minutes=8), status=EntertainmentSession.Status.COMPLETED, duration_allowed=5, duration_actual=5, points_spent=10)
        create_entertainment(mina, reward_item=reward_by_title["Tô màu khu vườn yên tĩnh"], when=mina_day_2 + timedelta(minutes=8), status=EntertainmentSession.Status.COMPLETED, duration_allowed=6, duration_actual=6, points_spent=8)
        create_entertainment(mina, reward_item=reward_by_title["Mũ phi hành gia cho Milo"], when=mina_day_2 + timedelta(minutes=20), status=EntertainmentSession.Status.COMPLETED, duration_allowed=0, duration_actual=0, points_spent=6)
        create_entertainment(mina, reward_item=reward_by_title["Video đại dương 5 phút"], when=mina_today_2 + timedelta(minutes=2), status=EntertainmentSession.Status.COMPLETED, duration_allowed=5, duration_actual=5, points_spent=10)
        create_entertainment(mina, reward_item=reward_by_title["Ghép hình bình tĩnh"], when=now - timedelta(minutes=3), status=EntertainmentSession.Status.BLOCKED, duration_allowed=6, duration_actual=None, points_spent=0, blocked_reason="Con chưa đủ điểm. Con có thể chọn một nhiệm vụ đọc nhẹ nhàng để nhận thêm điểm.")

        create_log(mina, when=mina_day_4 + timedelta(minutes=4), event_type="mission_completed", event_category="reading", duration_seconds=240, metadata={"source": "seed_demo"})
        create_log(mina, when=mina_day_3 + timedelta(minutes=8), event_type="reward_spent", event_category="documentary", duration_seconds=300, metadata={"source": "seed_demo"})
        create_log(mina, when=mina_day_2 + timedelta(minutes=20), event_type="mascot_unlock", event_category="mascot", duration_seconds=0, metadata={"source": "seed_demo"})
        create_log(mina, when=mina_today_1 + timedelta(minutes=20), event_type="movement_completed", event_category="movement", duration_seconds=300, metadata={"source": "seed_demo"})
        create_log(mina, when=now - timedelta(minutes=3), event_type="reward_blocked", event_category="safety", duration_seconds=0, metadata={"source": "seed_demo", "reason": "not_enough_points"})

        create_alert(mina, when=now - timedelta(hours=5), alert_type="daily_cap_info", severity=ParentAlert.Severity.INFO, message="Hôm nay Mina đã có đủ học tập, đọc sách và một khoảng vận động ngắn.")
        create_alert(mina, when=now - timedelta(minutes=2), alert_type="not_enough_points", severity=ParentAlert.Severity.INFO, message="Mina vừa thử mở một phần thưởng nhưng chưa đủ điểm. Bạn có thể gợi ý một nhiệm vụ đọc ngắn.", is_read=False)

        # Nấm: dữ liệu nhẹ hơn để danh sách trẻ không trống trải
        bap_start = now - timedelta(days=1, hours=4)
        create_usage(
            nam,
            start=bap_start,
            duration=7,
            session_type=UsageSession.SessionType.READING,
            screen_class=UsageSession.ScreenClass.SCREEN_LEARNING,
            activity_category="reading",
            display_category="doc_sach",
            content=content_by_title["Truyện ngắn: Đám mây biết đếm"],
            notes="Đọc truyện ngắn buổi tối.",
        )
        create_usage(
            nam,
            start=bap_start + timedelta(minutes=12),
            duration=4,
            session_type=UsageSession.SessionType.MOVEMENT,
            screen_class=UsageSession.ScreenClass.OFFSCREEN_TASK,
            activity_category="movement",
            display_category="van_dong",
            content=content_by_title["Jumping Jacks 5 phút"],
            notes="Vận động ngắn.",
        )
        create_attempt(nam, mission_by_title["Đọc truyện 4 phút"], start=bap_start, duration=4, points_awarded=8, metadata={"source": "seed_demo"})
        create_transaction(nam, when=bap_start + timedelta(minutes=4), transaction_type=RewardTransaction.TransactionType.EARN, points_amount=8, reason="Hoàn thành nhiệm vụ: Đọc truyện 4 phút", source_type="mission", content=content_by_title["Truyện ngắn: Đám mây biết đếm"])
        create_alert(nam, when=now - timedelta(hours=3), alert_type="gentle_summary", severity=ParentAlert.Severity.INFO, message="Nấm có một phiên ngắn, phù hợp với cấu hình ít màn hình.", is_read=True)

        mina_wallet.points_earned_total = 186
        mina_wallet.points_spent_total = 128
        mina_wallet.points_balance = 58
        mina_wallet.save(update_fields=["points_balance", "points_earned_total", "points_spent_total", "updated_at"])

        self.stdout.write(self.style.SUCCESS("Seeded demo parent, demo PIN, children, and rich activity history."))
        self.stdout.write(self.style.SUCCESS("Demo parent: demo_parent / demo1234 / PIN 1234"))
