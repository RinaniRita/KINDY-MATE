from django.db import models

from .time_rules import age_band_for_age, default_limits_for_age

class ChildProfile(models.Model):
    parent = models.ForeignKey(
        'authentication.User',
        on_delete=models.CASCADE,
        related_name='child_profiles',
    )
    nickname = models.CharField(max_length=80)
    age = models.PositiveSmallIntegerField()
    avatar_id = models.CharField(max_length=40, default='milo')
    interests = models.CharField(max_length=255, blank=True)
    favorite_subjects = models.CharField(max_length=255, blank=True, default='')
    default_language = models.CharField(max_length=8, default='vi')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nickname']

    def __str__(self):
        return f'{self.nickname} ({self.age})'


class ParentRule(models.Model):
    class TimeProfile(models.TextChoices):
        LOW_SCREEN = 'low_screen', 'Low screen'
        BALANCED = 'balanced', 'Balanced'
        LEARNING_FOCUSED = 'learning_focused', 'Learning focused'
        CUSTOM = 'custom', 'Custom'

    child = models.OneToOneField(
        ChildProfile,
        on_delete=models.CASCADE,
        related_name='rules',
    )
    daily_entertainment_cap_minutes = models.PositiveSmallIntegerField(default=20)
    bedtime_lock_start = models.TimeField(null=True, blank=True)
    bedtime_lock_end = models.TimeField(null=True, blank=True)
    point_conversion_rate = models.PositiveSmallIntegerField(default=2)
    cooldown_minutes = models.PositiveSmallIntegerField(default=15)
    max_sessions_per_day = models.PositiveSmallIntegerField(default=3)
    require_balanced_missions = models.BooleanField(default=True)
    voice_enabled = models.BooleanField(default=False)
    camera_enabled = models.BooleanField(default=False)
    allow_external_video = models.BooleanField(default=False)
    entertainment_paused = models.BooleanField(default=False)
    allowed_categories = models.JSONField(default=list, blank=True)
    session_duration_limit_minutes = models.PositiveSmallIntegerField(default=60)
    total_screen_time_limit_minutes = models.PositiveSmallIntegerField(default=35)
    continuous_screen_time_limit_minutes = models.PositiveSmallIntegerField(default=15)
    minimum_offscreen_break_minutes = models.PositiveSmallIntegerField(default=5)
    time_profile = models.CharField(
        max_length=24,
        choices=TimeProfile.choices,
        default=TimeProfile.BALANCED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Rules for {self.child.nickname}'

    @property
    def age_band(self):
        return age_band_for_age(self.child.age)

    def apply_time_profile(self, profile):
        values = default_limits_for_age(self.child.age, profile)
        self.time_profile = values['time_profile']
        self.session_duration_limit_minutes = values['session_duration_limit_minutes']
        self.total_screen_time_limit_minutes = values['total_screen_time_limit_minutes']
        self.continuous_screen_time_limit_minutes = values['continuous_screen_time_limit_minutes']
        self.minimum_offscreen_break_minutes = values['minimum_offscreen_break_minutes']

    def preset_metadata(self):
        presets = default_limits_for_age(self.child.age, 'balanced')
        from .time_rules import presets_for_age

        return presets_for_age(self.child.age)
