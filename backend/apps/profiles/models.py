from django.db import models

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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Rules for {self.child.nickname}'
