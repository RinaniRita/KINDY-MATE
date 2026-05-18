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

    class Meta:
        model = RewardItem
        fields = '__all__'


class MascotItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MascotItem
        fields = '__all__'


class ChildMascotInventorySerializer(serializers.ModelSerializer):
    item = MascotItemSerializer(read_only=True)

    class Meta:
        model = ChildMascotInventory
        fields = '__all__'
