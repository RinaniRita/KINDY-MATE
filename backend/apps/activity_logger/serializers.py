from rest_framework import serializers

from .models import ActivityLog, EntertainmentSession, ParentAlert, UsageSession


class UsageSessionSerializer(serializers.ModelSerializer):
    content_title = serializers.CharField(source='content.title', read_only=True)

    class Meta:
        model = UsageSession
        fields = [
            'id',
            'session_type',
            'content',
            'content_title',
            'duration_minutes',
            'points_spent',
            'notes',
            'started_at',
            'ended_at',
        ]


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
