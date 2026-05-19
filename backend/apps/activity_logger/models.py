from django.db import models

class UsageSession(models.Model):
    class SessionType(models.TextChoices):
        LEARNING = 'learning', 'Learning'
        READING = 'reading', 'Reading'
        MOVEMENT = 'movement', 'Movement'
        CREATIVE = 'creative', 'Creative'
        REFLECTION = 'reflection', 'Reflection'
        ENTERTAINMENT = 'entertainment', 'Entertainment'
        DOCUMENTARY = 'documentary', 'Documentary'
        CUSTOMIZATION = 'customization', 'Customization'
        SCREEN_TIME = 'screen_time', 'Screen time'
        BLOCKED = 'blocked', 'Blocked'

    child = models.ForeignKey(
        'profiles.ChildProfile',
        on_delete=models.CASCADE,
        related_name='usage_sessions',
    )
    session_type = models.CharField(max_length=20, choices=SessionType.choices)
    content = models.ForeignKey(
        'learning.ContentItem',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='usage_sessions',
    )
    duration_minutes = models.PositiveSmallIntegerField(default=0)
    points_spent = models.PositiveSmallIntegerField(default=0)
    notes = models.CharField(max_length=255, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f'{self.child.nickname} - {self.session_type} ({self.duration_minutes}m)'


class EntertainmentSession(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', 'Scheduled'
        ACTIVE = 'active', 'Active'
        COMPLETED = 'completed', 'Completed'
        STOPPED = 'stopped', 'Stopped'
        BLOCKED = 'blocked', 'Blocked'

    child = models.ForeignKey(
        'profiles.ChildProfile',
        on_delete=models.CASCADE,
        related_name='entertainment_sessions',
    )
    reward_item = models.ForeignKey(
        'gamification.RewardItem',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='entertainment_sessions',
    )
    content = models.ForeignKey(
        'learning.ContentItem',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='entertainment_sessions',
    )
    points_spent = models.PositiveSmallIntegerField(default=0)
    duration_minutes_allowed = models.PositiveSmallIntegerField(default=0)
    duration_minutes_actual = models.PositiveSmallIntegerField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.SCHEDULED)
    blocked_reason = models.CharField(max_length=255, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.child.nickname} entertainment {self.status}'


class ActivityLog(models.Model):
    child = models.ForeignKey(
        'profiles.ChildProfile',
        on_delete=models.CASCADE,
        related_name='activity_logs',
    )
    event_type = models.CharField(max_length=80)
    event_category = models.CharField(max_length=40)
    duration_seconds = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.child.nickname} - {self.event_type}'


class ParentAlert(models.Model):
    class Severity(models.TextChoices):
        INFO = 'info', 'Info'
        WARNING = 'warning', 'Warning'
        URGENT = 'urgent', 'Urgent'

    parent = models.ForeignKey(
        'authentication.User',
        on_delete=models.CASCADE,
        related_name='parent_alerts',
    )
    child = models.ForeignKey(
        'profiles.ChildProfile',
        on_delete=models.CASCADE,
        related_name='alerts',
    )
    alert_type = models.CharField(max_length=80)
    severity = models.CharField(max_length=12, choices=Severity.choices, default=Severity.INFO)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.alert_type} for {self.child.nickname}'


class ParentOverrideLog(models.Model):
    """Audit trail for every significant parent action."""
    class ActionType(models.TextChoices):
        PIN_CHANGE = 'pin_change', 'PIN changed'
        PIN_RESET = 'pin_reset', 'PIN reset'
        RULE_CHANGE = 'rule_change', 'Rule changed'
        CONTENT_APPROVE = 'content_approve', 'Content approved'
        CONTENT_BLOCK = 'content_block', 'Content blocked'
        CHILD_DATA_EXPORT = 'child_data_export', 'Child data exported'
        CHILD_DATA_DELETE = 'child_data_delete', 'Child data deleted'
        ENTERTAINMENT_PAUSE = 'entertainment_pause', 'Entertainment paused'
        ENTERTAINMENT_RESUME = 'entertainment_resume', 'Entertainment resumed'
        MANUAL_POINT_ADJUST = 'manual_point_adjust', 'Manual point adjustment'

    parent = models.ForeignKey(
        'authentication.User',
        on_delete=models.CASCADE,
        related_name='override_logs',
    )
    child = models.ForeignKey(
        'profiles.ChildProfile',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='override_logs',
    )
    action_type = models.CharField(max_length=30, choices=ActionType.choices)
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.action_type} by {self.parent.username} at {self.created_at}'
