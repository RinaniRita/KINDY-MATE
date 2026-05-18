from rest_framework import serializers

from apps.gamification.models import RewardWallet

from .models import ChildProfile, ParentRule


class ParentRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParentRule
        fields = [
            'id',
            'daily_entertainment_cap_minutes',
            'bedtime_lock_start',
            'bedtime_lock_end',
            'point_conversion_rate',
            'cooldown_minutes',
            'voice_enabled',
            'camera_enabled',
            'entertainment_paused',
            'allowed_categories',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']


class ChildProfileSerializer(serializers.ModelSerializer):
    rules = ParentRuleSerializer(read_only=True)
    wallet_balance = serializers.IntegerField(source='wallet.points_balance', read_only=True)

    class Meta:
        model = ChildProfile
        fields = [
            'id',
            'nickname',
            'age',
            'avatar_id',
            'interests',
            'favorite_subjects',
            'default_language',
            'is_active',
            'created_at',
            'rules',
            'wallet_balance',
        ]
        read_only_fields = ['id', 'created_at', 'rules', 'wallet_balance']

    def validate_age(self, value):
        if not (2 <= value <= 8):
            raise serializers.ValidationError("Độ tuổi của trẻ phải từ 2 đến 8 tuổi.")
        return value

    def create(self, validated_data):
        child = ChildProfile.objects.create(parent=self.context['request'].user, **validated_data)
        ParentRule.objects.create(
            child=child,
            allowed_categories=[
                'documentary',
                'entertainment',
                'customization',
                'learning',
                'reading',
                'movement',
                'creative',
                'mascot_item',
            ],
        )
        RewardWallet.objects.create(child=child, points_balance=20, points_earned_total=20)
        return child
