from rest_framework import serializers

from .models import ContentItem, Mission, MissionAttempt


class ContentItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentItem
        fields = '__all__'


class MissionSerializer(serializers.ModelSerializer):
    source_content = ContentItemSerializer(read_only=True)

    class Meta:
        model = Mission
        fields = '__all__'


class MissionAttemptSerializer(serializers.ModelSerializer):
    mission = MissionSerializer(read_only=True)

    class Meta:
        model = MissionAttempt
        fields = '__all__'
