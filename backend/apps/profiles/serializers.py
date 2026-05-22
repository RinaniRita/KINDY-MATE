from rest_framework import serializers

from apps.gamification.models import RewardWallet

from .models import ChildProfile, ParentRule
from .time_rules import ceiling_for_age, default_limits_for_age


class ParentRuleSerializer(serializers.ModelSerializer):
    age_band = serializers.CharField(read_only=True)

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
            'session_duration_limit_minutes',
            'total_screen_time_limit_minutes',
            'continuous_screen_time_limit_minutes',
            'minimum_offscreen_break_minutes',
            'time_profile',
            'age_band',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']

    def validate(self, attrs):
        instance = self.instance
        child = instance.child if instance else self.context['child']
        candidate = {
            'session_duration_limit_minutes': attrs.get(
                'session_duration_limit_minutes',
                instance.session_duration_limit_minutes if instance else default_limits_for_age(child.age)['session_duration_limit_minutes'],
            ),
            'total_screen_time_limit_minutes': attrs.get(
                'total_screen_time_limit_minutes',
                instance.total_screen_time_limit_minutes if instance else default_limits_for_age(child.age)['total_screen_time_limit_minutes'],
            ),
            'continuous_screen_time_limit_minutes': attrs.get(
                'continuous_screen_time_limit_minutes',
                instance.continuous_screen_time_limit_minutes if instance else default_limits_for_age(child.age)['continuous_screen_time_limit_minutes'],
            ),
            'minimum_offscreen_break_minutes': attrs.get(
                'minimum_offscreen_break_minutes',
                instance.minimum_offscreen_break_minutes if instance else default_limits_for_age(child.age)['minimum_offscreen_break_minutes'],
            ),
        }

        profile = attrs.get('time_profile')
        if profile and profile != ParentRule.TimeProfile.CUSTOM:
            candidate.update(default_limits_for_age(child.age, profile))

        if candidate['total_screen_time_limit_minutes'] > candidate['session_duration_limit_minutes']:
            raise serializers.ValidationError(
                {'total_screen_time_limit_minutes': 'Tổng screen time không được lớn hơn tổng thời lượng phiên.'}
            )
        if candidate['continuous_screen_time_limit_minutes'] > candidate['total_screen_time_limit_minutes']:
            raise serializers.ValidationError(
                {'continuous_screen_time_limit_minutes': 'Screen time liên tục không được lớn hơn tổng screen time của phiên.'}
            )
        if candidate['minimum_offscreen_break_minutes'] < 3 or candidate['minimum_offscreen_break_minutes'] > 15:
            raise serializers.ValidationError(
                {'minimum_offscreen_break_minutes': 'Thời gian nghỉ ngoài màn hình phải từ 3 đến 15 phút.'}
            )

        ceiling = ceiling_for_age(child.age)
        if candidate['session_duration_limit_minutes'] > ceiling['session']:
            raise serializers.ValidationError(
                {'session_duration_limit_minutes': f"Trẻ ở nhóm tuổi này chỉ được đặt tối đa {ceiling['session']} phút cho một phiên."}
            )
        if candidate['total_screen_time_limit_minutes'] > ceiling['total_screen']:
            raise serializers.ValidationError(
                {'total_screen_time_limit_minutes': f"Trẻ ở nhóm tuổi này chỉ được đặt tối đa {ceiling['total_screen']} phút screen time trong một phiên."}
            )
        if candidate['continuous_screen_time_limit_minutes'] > ceiling['continuous']:
            raise serializers.ValidationError(
                {'continuous_screen_time_limit_minutes': f"Trẻ ở nhóm tuổi này chỉ được đặt tối đa {ceiling['continuous']} phút screen time liên tục."}
            )
        return attrs

    def update(self, instance, validated_data):
        profile = validated_data.get('time_profile')
        if profile and profile != ParentRule.TimeProfile.CUSTOM:
            instance.apply_time_profile(profile)
            validated_data.pop('session_duration_limit_minutes', None)
            validated_data.pop('total_screen_time_limit_minutes', None)
            validated_data.pop('continuous_screen_time_limit_minutes', None)
            validated_data.pop('minimum_offscreen_break_minutes', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


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
        default_limits = default_limits_for_age(child.age, 'balanced')
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
                'reflection',
                'mascot_item',
            ],
            **default_limits,
        )
        RewardWallet.objects.create(child=child, points_balance=20, points_earned_total=20)
        return child
