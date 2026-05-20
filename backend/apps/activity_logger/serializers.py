from rest_framework import serializers

from .models import ActivityLog, BreakRequirement, ChildModeSession, EntertainmentSession, ParentAlert, UsageSession


class UsageSessionSerializer(serializers.ModelSerializer):
    content_title = serializers.CharField(source='content.title', read_only=True)

    class Meta:
        model = UsageSession
        fields = [
            'id',
            'session_type',
            'content',
            'content_title',
            'child_mode_session',
            'status',
            'screen_class',
            'screen_based',
            'activity_category',
            'display_category',
            'duration_minutes',
            'points_spent',
            'notes',
            'started_at',
            'ended_at',
            'last_heartbeat_at',
        ]


class BreakRequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = BreakRequirement
        fields = '__all__'


class ChildModeSessionSerializer(serializers.ModelSerializer):
    active_break_requirement = serializers.SerializerMethodField()

    class Meta:
        model = ChildModeSession
        fields = [
            'id',
            'child',
            'status',
            'ended_reason',
            'session_minutes',
            'screen_minutes',
            'continuous_screen_minutes',
            'offscreen_minutes',
            'last_heartbeat_at',
            'current_activity_type',
            'current_activity_title',
            'current_segment_started_at',
            'started_at',
            'ended_at',
            'active_break_requirement',
        ]

    def get_active_break_requirement(self, obj):
        active_break = obj.break_requirements.filter(status=BreakRequirement.Status.PENDING).first()
        if not active_break:
            return None
        return BreakRequirementSerializer(active_break).data


class EntertainmentSessionSerializer(serializers.ModelSerializer):
    reward_title = serializers.CharField(source='reward_item.title', read_only=True)
    content_title = serializers.CharField(source='content.title', read_only=True)

    class Meta:
        model = EntertainmentSession
        fields = '__all__'


class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = '__all__'


class ParentAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParentAlert
        fields = '__all__'
