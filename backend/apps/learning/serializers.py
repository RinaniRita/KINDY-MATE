from rest_framework import serializers

from .models import ContentItem, Mission, MissionAttempt


class ContentItemSerializer(serializers.ModelSerializer):
    display_category_label = serializers.CharField(source='get_display_category_display', read_only=True)

    class Meta:
        model = ContentItem
        fields = '__all__'


class MissionSerializer(serializers.ModelSerializer):
    source_content = ContentItemSerializer(read_only=True)
    display_category_label = serializers.CharField(source='get_display_category_display', read_only=True)
    mission_type_label = serializers.CharField(source='get_mission_type_display', read_only=True)

    class Meta:
        model = Mission
        fields = '__all__'


class MissionAttemptSerializer(serializers.ModelSerializer):
    mission = MissionSerializer(read_only=True)

    class Meta:
        model = MissionAttempt
        fields = '__all__'
