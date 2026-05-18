from django.db import models

class ContentItem(models.Model):
    class ContentType(models.TextChoices):
        LEARNING = 'learning', 'Learning'
        READING = 'reading', 'Reading'
        MOVEMENT = 'movement', 'Movement'
        CREATIVE = 'creative', 'Creative'
        REFLECTION = 'reflection', 'Reflection'
        ENTERTAINMENT = 'entertainment', 'Entertainment'
        DOCUMENTARY = 'documentary', 'Documentary'
        CUSTOMIZATION = 'customization', 'Customization'
        MASCOT_ITEM = 'mascot_item', 'Mascot item'

    class ApprovalStatus(models.TextChoices):
        APPROVED = 'approved', 'Approved'
        NEEDS_REVIEW = 'needs_review', 'Needs review'
        BLOCKED = 'blocked', 'Blocked'

    class StimulationLevel(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'

    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    content_type = models.CharField(max_length=24, choices=ContentType.choices)
    age_min = models.PositiveSmallIntegerField(default=5)
    age_max = models.PositiveSmallIntegerField(default=9)
    difficulty_level = models.CharField(max_length=40, default='easy')
    estimated_duration_minutes = models.PositiveSmallIntegerField(default=5)
    stimulation_level = models.CharField(
        max_length=12,
        choices=StimulationLevel.choices,
        default=StimulationLevel.LOW,
    )
    requires_audio = models.BooleanField(default=False)
    requires_camera = models.BooleanField(default=False)
    requires_parent_approval = models.BooleanField(default=False)
    approval_status = models.CharField(
        max_length=16,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.APPROVED,
    )
    source_name = models.CharField(max_length=120, default='Kindy-Mate demo content')
    source_url_or_reference = models.CharField(max_length=255, blank=True)
    license_status = models.CharField(max_length=120, default='Internal demo only')
    learning_objective = models.TextField()
    related_sdg = models.CharField(max_length=20, blank=True)
    points_reward_or_cost = models.IntegerField(default=0)
    cooldown_category = models.CharField(max_length=60, blank=True)
    safety_notes = models.TextField(blank=True)
    content_body = models.TextField(blank=True)
    media_url = models.CharField(max_length=255, blank=True)
    demo_only = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['content_type', 'title']

    def __str__(self):
        return self.title


class Mission(models.Model):
    class MissionType(models.TextChoices):
        LEARNING = 'learning', 'Learning'
        READING = 'reading', 'Reading'
        MOVEMENT = 'movement', 'Movement'
        CREATIVE = 'creative', 'Creative'
        REFLECTION = 'reflection', 'Reflection'

    mission_type = models.CharField(max_length=16, choices=MissionType.choices)
    title = models.CharField(max_length=160)
    description = models.TextField()
    age_min = models.PositiveSmallIntegerField(default=5)
    age_max = models.PositiveSmallIntegerField(default=9)
    difficulty = models.CharField(max_length=40, default='easy')
    estimated_duration_minutes = models.PositiveSmallIntegerField(default=5)
    points_reward = models.PositiveSmallIntegerField(default=5)
    source_content = models.ForeignKey(
        ContentItem,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='missions',
    )
    requires_voice = models.BooleanField(default=False)
    requires_camera = models.BooleanField(default=False)
    verification_method = models.CharField(max_length=120, default='rule_based')
    safety_notes = models.TextField(blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['mission_type', 'title']

    def __str__(self):
        return self.title


class MissionAttempt(models.Model):
    class Status(models.TextChoices):
        STARTED = 'started', 'Started'
        COMPLETED = 'completed', 'Completed'
        BLOCKED = 'blocked', 'Blocked'

    child = models.ForeignKey(
        'profiles.ChildProfile',
        on_delete=models.CASCADE,
        related_name='mission_attempts',
    )
    mission = models.ForeignKey(Mission, on_delete=models.CASCADE, related_name='attempts')
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.STARTED)
    score = models.PositiveSmallIntegerField(default=100)
    points_awarded = models.PositiveSmallIntegerField(default=0)
    verification_method = models.CharField(max_length=120, default='rule_based')
    metadata = models.JSONField(default=dict, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f'{self.child.nickname} - {self.mission.title}'
