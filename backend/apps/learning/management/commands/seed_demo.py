from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.activity_logger.models import ActivityLog, EntertainmentSession, ParentAlert, UsageSession
from apps.gamification.models import ChildMascotInventory, MascotItem, RewardItem, RewardWallet
from apps.learning.models import ContentItem, Mission
from apps.profiles.models import ChildProfile, ParentRule


class Command(BaseCommand):
    help = 'Seed Kindy-Mate demo missions and approved content.'

    def handle(self, *args, **options):
        User = get_user_model()
        parent, _ = User.objects.update_or_create(
            username='demo_parent',
            defaults={
                'email': 'parent@kindymate.local',
                'role': User.Role.PARENT,
                'consent_status': True,
                'is_staff': True,
            },
        )
        parent.set_password('demo1234')
        parent.save()

        child, _ = ChildProfile.objects.update_or_create(
            parent=parent,
            nickname='Mina',
            defaults={
                'age': 7,
                'avatar_id': 'milo',
                'interests': 'đại dương, vũ trụ, truyện ngắn',
                'default_language': 'vi',
            },
        )
        ParentRule.objects.update_or_create(
            child=child,
            defaults={
                'daily_entertainment_cap_minutes': 25,
                'cooldown_minutes': 15,
                'require_balanced_missions': True,
                'allowed_categories': ['reading', 'learning', 'movement', 'documentary', 'entertainment', 'mascot_item'],
            },
        )
        RewardWallet.objects.update_or_create(
            child=child,
            defaults={'points_balance': 24, 'points_earned_total': 42, 'points_spent_total': 18},
        )

        content_items = [
            {
                'title': 'Truyện ngắn: Đám mây biết đếm',
                'content_type': ContentItem.ContentType.READING,
                'age_min': 6,
                'age_max': 8,
                'estimated_duration_minutes': 4,
                'learning_objective': 'Đọc hiểu ý chính và nhớ một từ mới.',
                'related_sdg': 'SDG4',
                'points_reward_or_cost': 8,
                'cooldown_category': 'reading',
                'safety_notes': 'Nội dung tự viết, không bạo lực, không hỏi thông tin cá nhân.',
            },
            {
                'title': 'Đếm sao theo nhóm',
                'content_type': ContentItem.ContentType.LEARNING,
                'age_min': 5,
                'age_max': 7,
                'estimated_duration_minutes': 5,
                'learning_objective': 'Luyện cộng đơn giản bằng nhóm hình ảnh.',
                'related_sdg': 'SDG4',
                'points_reward_or_cost': 9,
                'cooldown_category': 'learning',
                'safety_notes': 'Câu hỏi ngắn, không tạo áp lực điểm số.',
            },
            {
                'title': '10 lần đứng lên ngồi xuống nhẹ',
                'content_type': ContentItem.ContentType.MOVEMENT,
                'age_min': 6,
                'age_max': 9,
                'estimated_duration_minutes': 3,
                'learning_objective': 'Khuyến khích vận động ngắn, an toàn trong nhà.',
                'related_sdg': 'SDG3',
                'points_reward_or_cost': 6,
                'cooldown_category': 'movement',
                'safety_notes': 'Không cần dụng cụ, có lựa chọn không dùng camera.',
            },
            {
                'title': 'Video đại dương 5 phút',
                'content_type': ContentItem.ContentType.DOCUMENTARY,
                'age_min': 6,
                'age_max': 9,
                'estimated_duration_minutes': 5,
                'learning_objective': 'Quan sát động vật biển và trả lời câu hỏi sau khi xem.',
                'related_sdg': 'SDG4',
                'points_reward_or_cost': -10,
                'cooldown_category': 'documentary',
                'license_status': 'Internal demo placeholder; production needs licensed content.',
                'safety_notes': 'Không autoplay, không feed vô hạn, mức kích thích thấp.',
            },
            {
                'title': 'Mũ phi hành gia cho Milo',
                'content_type': ContentItem.ContentType.CUSTOMIZATION,
                'age_min': 5,
                'age_max': 9,
                'estimated_duration_minutes': 0,
                'learning_objective': 'Tùy chỉnh mascot nhẹ, không random reward.',
                'points_reward_or_cost': -6,
                'cooldown_category': 'customization',
                'license_status': 'Internal demo asset.',
                'safety_notes': 'Không gacha, không loot box, không mua bằng tiền thật.',
            },
            {
                'title': 'Clip khu rừng cần duyệt',
                'content_type': ContentItem.ContentType.DOCUMENTARY,
                'age_min': 6,
                'age_max': 9,
                'estimated_duration_minutes': 8,
                'approval_status': ContentItem.ApprovalStatus.NEEDS_REVIEW,
                'requires_parent_approval': True,
                'learning_objective': 'Ví dụ nội dung chưa được duyệt.',
                'points_reward_or_cost': -12,
                'cooldown_category': 'documentary',
                'license_status': 'Pending review.',
                'safety_notes': 'Không hiển thị cho trẻ cho tới khi phụ huynh duyệt.',
            },
        ]

        content_by_title = {}
        for item in content_items:
            content, _ = ContentItem.objects.update_or_create(
                title=item['title'],
                defaults=item,
            )
            content_by_title[content.title] = content

        missions = [
            {
                'title': 'Đọc truyện 4 phút',
                'mission_type': Mission.MissionType.READING,
                'description': 'Đọc truyện ngắn về đám mây, sau đó trả lời 2 câu hỏi hiểu bài.',
                'points_reward': 8,
                'estimated_duration_minutes': 4,
                'source_content': content_by_title['Truyện ngắn: Đám mây biết đếm'],
                'verification_method': 'reading_comprehension_quiz',
                'safety_notes': 'Không dùng free-chat, không hỏi bí mật cá nhân.',
            },
            {
                'title': 'Đếm sao theo nhóm',
                'mission_type': Mission.MissionType.LEARNING,
                'description': 'Giải 3 câu toán cộng đơn giản bằng hình ảnh sao.',
                'points_reward': 9,
                'estimated_duration_minutes': 5,
                'source_content': content_by_title['Đếm sao theo nhóm'],
                'verification_method': 'rule_based_quiz',
                'safety_notes': 'Câu hỏi từ content bank đã duyệt.',
            },
            {
                'title': '10 lần đứng lên ngồi xuống nhẹ',
                'mission_type': Mission.MissionType.MOVEMENT,
                'description': 'Hoàn thành bài vận động ngắn, cường độ thấp.',
                'points_reward': 6,
                'estimated_duration_minutes': 3,
                'source_content': content_by_title['10 lần đứng lên ngồi xuống nhẹ'],
                'verification_method': 'self_confirm_or_parent_enabled_camera',
                'safety_notes': 'Dừng lại nếu mệt hoặc không đủ không gian.',
            },
            {
                'title': 'Vẽ kết thúc câu chuyện',
                'mission_type': Mission.MissionType.CREATIVE,
                'description': 'Vẽ một cảnh kết thúc bình yên cho câu chuyện vừa đọc.',
                'points_reward': 7,
                'estimated_duration_minutes': 6,
                'verification_method': 'parent_review_optional',
                'safety_notes': 'Không yêu cầu ảnh mặt hoặc dữ liệu nhận dạng.',
            },
            {
                'title': 'Một từ mới hôm nay',
                'mission_type': Mission.MissionType.REFLECTION,
                'description': 'Chọn một từ mới và nói nghĩa đơn giản của từ đó.',
                'points_reward': 4,
                'estimated_duration_minutes': 2,
                'verification_method': 'guided_prompt',
                'safety_notes': 'Không hỏi cảm xúc sâu, bí mật hoặc chủ đề nhạy cảm.',
            },
        ]

        for mission in missions:
            Mission.objects.update_or_create(title=mission['title'], defaults=mission)

        for title, reward_type, cost, minutes, content_title in [
            ('Video đại dương 5 phút', RewardItem.RewardType.DOCUMENTARY, 10, 5, 'Video đại dương 5 phút'),
            ('Ghép hình bình tĩnh', RewardItem.RewardType.ENTERTAINMENT, 8, 6, None),
            ('Mũ phi hành gia cho Milo', RewardItem.RewardType.MASCOT_ITEM, 6, 0, 'Mũ phi hành gia cho Milo'),
            ('Clip khu rừng cần duyệt', RewardItem.RewardType.DOCUMENTARY, 12, 8, 'Clip khu rừng cần duyệt'),
        ]:
            content = content_by_title.get(content_title) if content_title else None
            RewardItem.objects.update_or_create(
                title=title,
                defaults={
                    'reward_type': reward_type,
                    'points_cost': cost,
                    'duration_minutes': minutes,
                    'content_item': content,
                    'approval_status': RewardItem.ApprovalStatus.PENDING if 'cần duyệt' in title else RewardItem.ApprovalStatus.APPROVED,
                    'description': 'Demo reward item with child-safe metadata.',
                    'demo_only': True,
                },
            )

        mascot_items = [
            ('Mũ phi hành gia', MascotItem.ItemType.ACCESSORY, 6),
            ('Áo đọc sách', MascotItem.ItemType.OUTFIT, 6),
            ('Nền đại dương', MascotItem.ItemType.BACKGROUND, 6),
            ('Phòng khám phá', MascotItem.ItemType.ROOM, 8),
            ('Huy hiệu đọc sách', MascotItem.ItemType.BADGE, 4),
            ('Áo nhà khoa học', MascotItem.ItemType.OUTFIT, 7),
            ('Kính thiên văn', MascotItem.ItemType.ACCESSORY, 5),
            ('Nền vũ trụ', MascotItem.ItemType.BACKGROUND, 7),
            ('Huy hiệu vận động', MascotItem.ItemType.BADGE, 4),
            ('Phòng sáng tạo', MascotItem.ItemType.ROOM, 8),
        ]
        first_item = None
        for name, item_type, cost in mascot_items:
            item, _ = MascotItem.objects.update_or_create(
                name=name,
                defaults={'item_type': item_type, 'points_cost': cost, 'is_random_reward': False},
            )
            first_item = first_item or item
        if first_item:
            ChildMascotInventory.objects.get_or_create(child=child, item=first_item)

        UsageSession.objects.get_or_create(
            child=child,
            session_type=UsageSession.SessionType.READING,
            duration_minutes=12,
            notes='Seeded reading activity.',
        )
        EntertainmentSession.objects.get_or_create(
            child=child,
            status=EntertainmentSession.Status.COMPLETED,
            duration_minutes_allowed=5,
            duration_minutes_actual=5,
            points_spent=10,
        )
        ActivityLog.objects.get_or_create(
            child=child,
            event_type='seeded_demo_activity',
            event_category='demo',
            defaults={'duration_seconds': 300, 'metadata': {'source': 'seed_demo'}},
        )
        ParentAlert.objects.get_or_create(
            parent=parent,
            child=child,
            alert_type='daily_cap_info',
            defaults={
                'severity': ParentAlert.Severity.INFO,
                'message': 'Còn thời gian giải trí theo giới hạn hôm nay.',
            },
        )

        self.stdout.write(self.style.SUCCESS('Seeded Kindy-Mate demo content and missions.'))
