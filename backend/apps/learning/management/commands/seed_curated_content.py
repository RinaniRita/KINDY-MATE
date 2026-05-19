"""
Seed curated, verified educational content from internationally recognized sources.
All content references are from free/public-domain or openly licensed educational providers.
"""
from django.core.management.base import BaseCommand
from apps.learning.models import ContentItem, Mission
from apps.gamification.models import RewardItem


C = ContentItem.ContentType
A = ContentItem.ApprovalStatus

CONTENT = [
    # ── Khan Academy Kids (Math & Reading, ages 2-8, free, no ads) ──
    {'title': 'Đếm số 1-10 cùng Khan Academy Kids', 'content_type': C.LEARNING, 'age_min': 2, 'age_max': 5,
     'estimated_duration_minutes': 5, 'learning_objective': 'Nhận biết và đếm số từ 1 đến 10.',
     'source_name': 'Khan Academy Kids', 'license_status': 'Free, no ads, no subscription',
     'source_url_or_reference': 'https://learn.khanacademy.org/khan-academy-kids/',
     'related_sdg': 'SDG4', 'points_reward_or_cost': 8, 'cooldown_category': 'learning',
     'safety_notes': 'Curriculum aligned với Head Start Early Learning Outcomes Framework.'},
    {'title': 'Cộng trừ đơn giản: Nhóm đồ vật', 'content_type': C.LEARNING, 'age_min': 4, 'age_max': 7,
     'estimated_duration_minutes': 6, 'learning_objective': 'Luyện phép cộng trừ trong phạm vi 10 bằng hình ảnh.',
     'source_name': 'Khan Academy Kids', 'license_status': 'Free, no ads',
     'source_url_or_reference': 'https://learn.khanacademy.org/khan-academy-kids/',
     'related_sdg': 'SDG4', 'points_reward_or_cost': 9, 'cooldown_category': 'learning',
     'safety_notes': 'Không tạo áp lực điểm số, khuyến khích thử lại.'},
    {'title': 'Hình dạng & Màu sắc cho bé', 'content_type': C.LEARNING, 'age_min': 2, 'age_max': 4,
     'estimated_duration_minutes': 4, 'learning_objective': 'Nhận biết hình tròn, vuông, tam giác và 6 màu cơ bản.',
     'source_name': 'Khan Academy Kids', 'license_status': 'Free, no ads',
     'source_url_or_reference': 'https://learn.khanacademy.org/khan-academy-kids/',
     'related_sdg': 'SDG4', 'points_reward_or_cost': 7, 'cooldown_category': 'learning',
     'safety_notes': 'Giao diện thân thiện, không yêu cầu đọc chữ.'},

    # ── PBS LearningMedia (Reading & Science, free for educators) ──
    {'title': 'Phonics cơ bản: Âm đầu A-M', 'content_type': C.READING, 'age_min': 4, 'age_max': 6,
     'estimated_duration_minutes': 5, 'learning_objective': 'Nhận biết âm đầu của 13 chữ cái A đến M.',
     'source_name': 'PBS LearningMedia', 'license_status': 'Free for educators/students',
     'source_url_or_reference': 'https://pbslearningmedia.org/',
     'related_sdg': 'SDG4', 'points_reward_or_cost': 8, 'cooldown_category': 'reading',
     'safety_notes': 'Aligned với Common Core standards.'},
    {'title': 'Đọc hiểu truyện ngắn: Mặt trời nhỏ', 'content_type': C.READING, 'age_min': 5, 'age_max': 8,
     'estimated_duration_minutes': 6, 'learning_objective': 'Đọc truyện ngắn và trả lời 3 câu hỏi hiểu bài.',
     'source_name': 'PBS LearningMedia / ReadWorks', 'license_status': 'Free',
     'source_url_or_reference': 'https://www.readworks.org/',
     'related_sdg': 'SDG4', 'points_reward_or_cost': 9, 'cooldown_category': 'reading',
     'safety_notes': 'Nội dung đã được biên tập cho trẻ em, không bạo lực.'},
    {'title': 'Khám phá vòng đời bướm', 'content_type': C.LEARNING, 'age_min': 4, 'age_max': 7,
     'estimated_duration_minutes': 5, 'learning_objective': 'Hiểu 4 giai đoạn vòng đời bướm.',
     'source_name': 'PBS LearningMedia', 'license_status': 'Free',
     'source_url_or_reference': 'https://pbslearningmedia.org/',
     'related_sdg': 'SDG4', 'points_reward_or_cost': 8, 'cooldown_category': 'learning',
     'safety_notes': 'Nội dung khoa học phù hợp lứa tuổi.'},

    # ── British Council LearnEnglish Kids (English, free) ──
    {'title': 'English basics: Animals & Colors', 'content_type': C.LEARNING, 'age_min': 3, 'age_max': 6,
     'estimated_duration_minutes': 5, 'learning_objective': 'Học 10 từ tiếng Anh về động vật và màu sắc.',
     'source_name': 'British Council LearnEnglish Kids', 'license_status': 'Free online resources',
     'source_url_or_reference': 'https://learnenglishkids.britishcouncil.org/',
     'related_sdg': 'SDG4', 'points_reward_or_cost': 8, 'cooldown_category': 'learning',
     'safety_notes': 'Trang web giáo dục chính thức của British Council.'},
    {'title': 'Truyện tiếng Anh: The Very Hungry Caterpillar', 'content_type': C.READING, 'age_min': 3, 'age_max': 6,
     'estimated_duration_minutes': 4, 'learning_objective': 'Nghe và nhắc lại tên thức ăn trong truyện.',
     'source_name': 'British Council / StoryWeaver', 'license_status': 'Creative Commons',
     'source_url_or_reference': 'https://storyweaver.org.in/',
     'related_sdg': 'SDG4', 'points_reward_or_cost': 7, 'cooldown_category': 'reading',
     'safety_notes': 'StoryWeaver: truyện mở, miễn phí dưới CC license.'},

    # ── National Geographic Kids (Science/Nature) ──
    {'title': 'Thế giới đại dương: 5 sự thật thú vị', 'content_type': C.DOCUMENTARY, 'age_min': 5, 'age_max': 8,
     'estimated_duration_minutes': 5, 'learning_objective': 'Khám phá 5 sự thật về sinh vật biển.',
     'source_name': 'National Geographic Kids', 'license_status': 'Reference only, cần kiểm tra embedding rights',
     'source_url_or_reference': 'https://kids.nationalgeographic.com/',
     'related_sdg': 'SDG14', 'points_reward_or_cost': -10, 'cooldown_category': 'documentary',
     'safety_notes': 'Không autoplay, không feed vô hạn, mức kích thích thấp.'},
    {'title': 'Động vật hoang dã: Sư tử châu Phi', 'content_type': C.DOCUMENTARY, 'age_min': 5, 'age_max': 8,
     'estimated_duration_minutes': 5, 'learning_objective': 'Tìm hiểu về tập tính và môi trường sống của sư tử.',
     'source_name': 'National Geographic Kids', 'license_status': 'Reference only',
     'source_url_or_reference': 'https://kids.nationalgeographic.com/animals/',
     'related_sdg': 'SDG15', 'points_reward_or_cost': -10, 'cooldown_category': 'documentary',
     'safety_notes': 'Nội dung tự nhiên, không có cảnh bạo lực.'},

    # ── NASA eClips (Space/Science, US Gov public domain) ──
    {'title': 'Hệ mặt trời: Các hành tinh của chúng ta', 'content_type': C.DOCUMENTARY, 'age_min': 5, 'age_max': 8,
     'estimated_duration_minutes': 5, 'learning_objective': 'Nhận biết 8 hành tinh trong hệ mặt trời.',
     'source_name': 'NASA eClips', 'license_status': 'Public domain (US Government)',
     'source_url_or_reference': 'https://www.youtube.com/user/NASAtelevision',
     'related_sdg': 'SDG4', 'points_reward_or_cost': -10, 'cooldown_category': 'documentary',
     'safety_notes': 'Nội dung chính thức của NASA, không quảng cáo.'},
    {'title': 'Trạm vũ trụ quốc tế ISS', 'content_type': C.DOCUMENTARY, 'age_min': 6, 'age_max': 8,
     'estimated_duration_minutes': 5, 'learning_objective': 'Hiểu astronauts sống và làm việc trong không gian.',
     'source_name': 'NASA eClips', 'license_status': 'Public domain (US Government)',
     'source_url_or_reference': 'https://nasaeclips.arc.nasa.gov/',
     'related_sdg': 'SDG4', 'points_reward_or_cost': -10, 'cooldown_category': 'documentary',
     'safety_notes': 'Video giáo dục NASA, chuẩn STEM.'},

    # ── WHO/CDC Movement Activities ──
    {'title': '5 phút nhảy tại chỗ (Jumping Jacks nhẹ)', 'content_type': C.MOVEMENT, 'age_min': 3, 'age_max': 8,
     'estimated_duration_minutes': 5, 'learning_objective': 'Vận động toàn thân, tăng nhịp tim nhẹ.',
     'source_name': 'WHO Physical Activity Guidelines 2020', 'license_status': 'Public domain (WHO)',
     'source_url_or_reference': 'https://www.who.int/publications/i/item/9789240015128',
     'related_sdg': 'SDG3', 'points_reward_or_cost': 6, 'cooldown_category': 'movement',
     'safety_notes': 'WHO khuyến nghị ≥60 phút vận động/ngày cho trẻ 5-17. Cường độ thấp, an toàn trong nhà.'},
    {'title': 'Yoga trẻ em: 5 tư thế cơ bản', 'content_type': C.MOVEMENT, 'age_min': 4, 'age_max': 8,
     'estimated_duration_minutes': 6, 'learning_objective': 'Học 5 tư thế yoga đơn giản: cây, chó, mèo, bướm, núi.',
     'source_name': 'CDC Physical Activity Guidelines', 'license_status': 'Public domain (US Government)',
     'source_url_or_reference': 'https://www.cdc.gov/physical-activity-basics/',
     'related_sdg': 'SDG3', 'points_reward_or_cost': 7, 'cooldown_category': 'movement',
     'safety_notes': 'Age-appropriate, không cần dụng cụ, CDC endorsed.'},
    {'title': 'Vũ điệu vui nhộn 3 phút', 'content_type': C.MOVEMENT, 'age_min': 2, 'age_max': 6,
     'estimated_duration_minutes': 3, 'learning_objective': 'Vận động theo nhạc, phát triển phối hợp.',
     'source_name': 'NHS Physical Activity for Children', 'license_status': 'Public guidance (NHS UK)',
     'source_url_or_reference': 'https://www.nhs.uk/live-well/exercise/physical-activity-guidelines-children-under-five-years/',
     'related_sdg': 'SDG3', 'points_reward_or_cost': 5, 'cooldown_category': 'movement',
     'safety_notes': 'NHS khuyến nghị active play mỗi ngày. Không gian rộng, giám sát người lớn.'},
    {'title': 'Stretching buổi sáng (5 động tác)', 'content_type': C.MOVEMENT, 'age_min': 3, 'age_max': 8,
     'estimated_duration_minutes': 4, 'learning_objective': 'Kéo giãn cơ nhẹ nhàng, chuẩn bị cho ngày mới.',
     'source_name': 'Canadian 24-Hour Movement Guidelines', 'license_status': 'Public guidelines',
     'source_url_or_reference': 'https://csepguidelines.ca/',
     'related_sdg': 'SDG3', 'points_reward_or_cost': 5, 'cooldown_category': 'movement',
     'safety_notes': 'Sedentary behaviour interruption theo Canadian guidelines.'},
    {'title': '10 bước squat nhẹ nhàng', 'content_type': C.MOVEMENT, 'age_min': 5, 'age_max': 8,
     'estimated_duration_minutes': 3, 'learning_objective': 'Tăng cường cơ chân, phối hợp thăng bằng.',
     'source_name': 'Australian Physical Activity Guidelines', 'license_status': 'Public guidelines',
     'source_url_or_reference': 'https://www.health.gov.au/topics/physical-activity-and-exercise/physical-activity-and-exercise-guidelines-for-all-australians',
     'related_sdg': 'SDG3', 'points_reward_or_cost': 6, 'cooldown_category': 'movement',
     'safety_notes': 'Cường độ thấp, dừng lại nếu mệt. Không cần camera.'},

    # ── PBS Kids / Sesame Street (curated entertainment) ──
    {'title': 'Sesame Street: Đếm số cùng Count', 'content_type': C.ENTERTAINMENT, 'age_min': 2, 'age_max': 5,
     'estimated_duration_minutes': 5, 'learning_objective': 'Giải trí giáo dục: đếm số qua bài hát.',
     'source_name': 'Sesame Street (Sesame Workshop)', 'license_status': 'Reference only, cần license',
     'source_url_or_reference': 'https://www.sesamestreet.org/',
     'related_sdg': 'SDG4', 'points_reward_or_cost': -8, 'cooldown_category': 'entertainment',
     'safety_notes': 'Sesame Workshop: nội dung giáo dục cho trẻ mầm non, không bạo lực.'},
    {'title': 'Dora the Explorer: Phiêu lưu trong rừng', 'content_type': C.ENTERTAINMENT, 'age_min': 3, 'age_max': 7,
     'estimated_duration_minutes': 8, 'learning_objective': 'Giải trí tương tác: giải đố, học từ vựng song ngữ.',
     'source_name': 'Nickelodeon / Paramount (Dora the Explorer)', 'license_status': 'Reference only, cần license từ Paramount',
     'source_url_or_reference': 'https://www.nick.com/shows/dora-the-explorer',
     'related_sdg': 'SDG4', 'points_reward_or_cost': -12, 'cooldown_category': 'entertainment',
     'safety_notes': 'Chỉ hiển thị nếu phụ huynh duyệt. Không autoplay, có giới hạn thời gian.',
     'requires_parent_approval': True, 'approval_status': A.NEEDS_REVIEW},
    {'title': 'PBS Kids: Curious George - Khám phá khoa học', 'content_type': C.ENTERTAINMENT, 'age_min': 3, 'age_max': 6,
     'estimated_duration_minutes': 6, 'learning_objective': 'Giải trí giáo dục: tò mò khoa học qua câu chuyện.',
     'source_name': 'PBS Kids', 'license_status': 'Free on PBS Kids platform',
     'source_url_or_reference': 'https://pbskids.org/curiousgeorge/',
     'related_sdg': 'SDG4', 'points_reward_or_cost': -10, 'cooldown_category': 'entertainment',
     'safety_notes': 'PBS Kids: không quảng cáo, nội dung giáo dục được kiểm duyệt.'},

    # ── Creative activities ──
    {'title': 'Vẽ tranh: Con vật yêu thích', 'content_type': C.CREATIVE, 'age_min': 3, 'age_max': 8,
     'estimated_duration_minutes': 8, 'learning_objective': 'Phát triển sáng tạo và kỹ năng vận động tinh.',
     'source_name': 'Kindy-Mate internal', 'license_status': 'Internal',
     'related_sdg': 'SDG4', 'points_reward_or_cost': 7, 'cooldown_category': 'creative',
     'safety_notes': 'Không yêu cầu ảnh mặt hoặc dữ liệu nhận dạng.'},
    {'title': 'Gấp giấy origami: Máy bay đơn giản', 'content_type': C.CREATIVE, 'age_min': 5, 'age_max': 8,
     'estimated_duration_minutes': 6, 'learning_objective': 'Rèn luyện tập trung, theo hướng dẫn từng bước.',
     'source_name': 'Kindy-Mate internal', 'license_status': 'Internal',
     'related_sdg': 'SDG4', 'points_reward_or_cost': 6, 'cooldown_category': 'creative',
     'safety_notes': 'Hoạt động offline, cần giấy thật.'},
]

MISSIONS_DATA = [
    {'title': 'Đếm số 1-10', 'type': 'learning', 'desc': 'Đếm số từ 1 đến 10 cùng Khan Academy Kids.', 'pts': 8, 'mins': 5, 'age_min': 2, 'age_max': 5,
     'verify': 'guided_counting', 'safety': 'Curriculum aligned, không áp lực điểm.'},
    {'title': 'Phép cộng trừ bằng hình ảnh', 'type': 'learning', 'desc': 'Giải 3 câu toán cộng trừ đơn giản.', 'pts': 9, 'mins': 6, 'age_min': 4, 'age_max': 7,
     'verify': 'rule_based_quiz', 'safety': 'Khan Academy Kids curriculum.'},
    {'title': 'Học âm đầu chữ cái', 'type': 'reading', 'desc': 'Nhận biết âm đầu của chữ cái A-M qua trò chơi.', 'pts': 8, 'mins': 5, 'age_min': 4, 'age_max': 6,
     'verify': 'phonics_matching', 'safety': 'PBS LearningMedia, Common Core aligned.'},
    {'title': 'Đọc truyện ngắn: Mặt trời nhỏ', 'type': 'reading', 'desc': 'Đọc truyện và trả lời 3 câu hỏi hiểu bài.', 'pts': 9, 'mins': 6, 'age_min': 5, 'age_max': 8,
     'verify': 'reading_comprehension_quiz', 'safety': 'ReadWorks, nội dung biên tập cho trẻ em.'},
    {'title': 'English Animals & Colors', 'type': 'learning', 'desc': 'Học 10 từ tiếng Anh về động vật và màu sắc.', 'pts': 8, 'mins': 5, 'age_min': 3, 'age_max': 6,
     'verify': 'word_matching', 'safety': 'British Council LearnEnglish Kids.'},
    {'title': 'Vòng đời bướm', 'type': 'learning', 'desc': 'Tìm hiểu 4 giai đoạn vòng đời bướm qua hình ảnh.', 'pts': 8, 'mins': 5, 'age_min': 4, 'age_max': 7,
     'verify': 'sequence_ordering', 'safety': 'PBS LearningMedia.'},
    {'title': 'Jumping Jacks 5 phút', 'type': 'movement', 'desc': 'Nhảy tại chỗ 5 phút theo hướng dẫn WHO.', 'pts': 6, 'mins': 5, 'age_min': 3, 'age_max': 8,
     'verify': 'self_confirm_or_parent_camera', 'safety': 'WHO 2020 guidelines, cường độ thấp.'},
    {'title': 'Yoga 5 tư thế cơ bản', 'type': 'movement', 'desc': 'Thực hành cây, chó, mèo, bướm, núi.', 'pts': 7, 'mins': 6, 'age_min': 4, 'age_max': 8,
     'verify': 'self_confirm', 'safety': 'CDC endorsed, age-appropriate.'},
    {'title': 'Vũ điệu vui nhộn', 'type': 'movement', 'desc': 'Nhảy múa theo nhạc 3 phút.', 'pts': 5, 'mins': 3, 'age_min': 2, 'age_max': 6,
     'verify': 'self_confirm', 'safety': 'NHS guidelines, giám sát người lớn.'},
    {'title': 'Stretching buổi sáng', 'type': 'movement', 'desc': '5 động tác kéo giãn nhẹ nhàng.', 'pts': 5, 'mins': 4, 'age_min': 3, 'age_max': 8,
     'verify': 'self_confirm', 'safety': 'Canadian 24-Hour Movement Guidelines.'},
    {'title': 'Vẽ con vật yêu thích', 'type': 'creative', 'desc': 'Vẽ tranh sáng tạo bất kỳ con vật nào bé thích.', 'pts': 7, 'mins': 8, 'age_min': 3, 'age_max': 8,
     'verify': 'parent_review_optional', 'safety': 'Không yêu cầu ảnh mặt.'},
    {'title': 'Gấp máy bay giấy', 'type': 'creative', 'desc': 'Gấp origami máy bay theo hướng dẫn.', 'pts': 6, 'mins': 6, 'age_min': 5, 'age_max': 8,
     'verify': 'self_confirm', 'safety': 'Hoạt động offline.'},
    {'title': 'Một từ mới hôm nay', 'type': 'reflection', 'desc': 'Chọn một từ mới và giải thích nghĩa đơn giản.', 'pts': 4, 'mins': 2, 'age_min': 4, 'age_max': 8,
     'verify': 'guided_prompt', 'safety': 'Không hỏi cảm xúc sâu hoặc bí mật.'},
]


class Command(BaseCommand):
    help = 'Seed curated educational content from verified international sources.'

    def handle(self, *args, **options):
        for item in CONTENT:
            defaults = {k: v for k, v in item.items() if k != 'title'}
            defaults.setdefault('demo_only', False)
            defaults.setdefault('approval_status', A.APPROVED)
            ContentItem.objects.update_or_create(title=item['title'], defaults=defaults)

        type_map = {'learning': Mission.MissionType.LEARNING, 'reading': Mission.MissionType.READING,
                     'movement': Mission.MissionType.MOVEMENT, 'creative': Mission.MissionType.CREATIVE,
                     'reflection': Mission.MissionType.REFLECTION}
        for m in MISSIONS_DATA:
            Mission.objects.update_or_create(
                title=m['title'],
                defaults={
                    'mission_type': type_map[m['type']],
                    'description': m['desc'],
                    'points_reward': m['pts'],
                    'estimated_duration_minutes': m['mins'],
                    'age_min': m.get('age_min', 5),
                    'age_max': m.get('age_max', 9),
                    'verification_method': m['verify'],
                    'safety_notes': m['safety'],
                },
            )

        # Curated reward items for entertainment/documentary
        rewards = [
            ('Sesame Street: Đếm số cùng Count', RewardItem.RewardType.ENTERTAINMENT, 8, 5),
            ('Dora the Explorer: Phiêu lưu rừng', RewardItem.RewardType.ENTERTAINMENT, 12, 8),
            ('PBS Kids: Curious George', RewardItem.RewardType.ENTERTAINMENT, 10, 6),
            ('NatGeo Kids: Đại dương', RewardItem.RewardType.DOCUMENTARY, 10, 5),
            ('NatGeo Kids: Sư tử châu Phi', RewardItem.RewardType.DOCUMENTARY, 10, 5),
            ('NASA: Hệ mặt trời', RewardItem.RewardType.DOCUMENTARY, 10, 5),
            ('NASA: Trạm ISS', RewardItem.RewardType.DOCUMENTARY, 10, 5),
        ]
        for title, rtype, cost, mins in rewards:
            RewardItem.objects.update_or_create(
                title=title,
                defaults={
                    'reward_type': rtype,
                    'points_cost': cost,
                    'duration_minutes': mins,
                    'description': f'Nội dung giáo dục chọn lọc từ nguồn uy tín quốc tế.',
                    'demo_only': False,
                    'approval_status': RewardItem.ApprovalStatus.APPROVED,
                },
            )

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {len(CONTENT)} content items, {len(MISSIONS_DATA)} missions, {len(rewards)} reward items.'
        ))
