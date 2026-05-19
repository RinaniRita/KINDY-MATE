from rest_framework import serializers

from .models import ChildMascotInventory, MascotItem, RewardItem, RewardTransaction, RewardWallet


class RewardWalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardWallet
        fields = ['points_balance', 'points_earned_total', 'points_spent_total', 'updated_at']


class RewardTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardTransaction
        fields = '__all__'


class RewardItemSerializer(serializers.ModelSerializer):
    content_title = serializers.CharField(source='content_item.title', read_only=True)
    display_category_label = serializers.CharField(source='get_display_category_display', read_only=True)
    reward_type_label = serializers.CharField(source='get_reward_type_display', read_only=True)
    is_accessible = serializers.SerializerMethodField()
    blocked_reason = serializers.SerializerMethodField()

    class Meta:
        model = RewardItem
        fields = '__all__'

    def get_is_accessible(self, obj):
        child = self.context.get('child')
        if not child:
            return None
        allowed, _reason = self.context['check_reward_access'](child, obj)
        return allowed

    def get_blocked_reason(self, obj):
        child = self.context.get('child')
        if not child:
            return ''
        allowed, reason_code = self.context['check_reward_access'](child, obj)
        if allowed or not reason_code:
            return ''
        return self.context['friendly_messages'].get(reason_code, '')


class MascotItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MascotItem
        fields = '__all__'


class ChildMascotInventorySerializer(serializers.ModelSerializer):
    item = MascotItemSerializer(read_only=True)

    class Meta:
        model = ChildMascotInventory
        fields = '__all__'
