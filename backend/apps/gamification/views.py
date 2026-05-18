from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.profiles.models import ChildProfile

from .models import ChildMascotInventory, MascotItem, RewardItem
from .serializers import (
    ChildMascotInventorySerializer,
    MascotItemSerializer,
    RewardItemSerializer,
    RewardWalletSerializer,
)
from .services import spend_reward_for_child


def get_child(request, child_id):
    return ChildProfile.objects.select_related('rules', 'wallet').get(id=child_id, parent=request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wallet_detail(request):
    child_id = request.query_params.get('child_id')
    try:
        child = get_child(request, child_id)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Child profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(RewardWalletSerializer(child.wallet).data)


class RewardItemViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RewardItemSerializer

    def get_queryset(self):
        child_id = self.request.query_params.get('child_id')
        queryset = RewardItem.objects.filter(active=True)
        if child_id:
            try:
                child = ChildProfile.objects.get(id=child_id, parent=self.request.user)
            except ChildProfile.DoesNotExist:
                return RewardItem.objects.none()
            queryset = queryset.filter(
                reward_type__in=child.rules.allowed_categories,
                approval_status=RewardItem.ApprovalStatus.APPROVED,
            )
        return queryset.select_related('content_item')


class MascotItemViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MascotItemSerializer

    def get_queryset(self):
        return MascotItem.objects.filter(is_active=True, is_random_reward=False)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mascot_inventory(request):
    child_id = request.query_params.get('child_id')
    try:
        child = get_child(request, child_id)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Child profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    inventory = ChildMascotInventory.objects.filter(child=child).select_related('item')
    return Response(ChildMascotInventorySerializer(inventory, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def spend_reward(request):
    child_id = request.data.get('child_id')
    reward_item_id = request.data.get('reward_item_id')
    try:
        child = get_child(request, child_id)
        reward_item = RewardItem.objects.select_related('content_item').get(id=reward_item_id, active=True)
    except ChildProfile.DoesNotExist:
        return Response({'detail': 'Child profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except RewardItem.DoesNotExist:
        return Response({'detail': 'Reward content not found.'}, status=status.HTTP_404_NOT_FOUND)

    allowed, detail, wallet = spend_reward_for_child(child, reward_item)
    if not allowed:
        return Response(
            {'allowed': False, 'detail': detail, 'wallet': RewardWalletSerializer(wallet).data},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(
        {
            'allowed': True,
            'detail': detail,
            'wallet': RewardWalletSerializer(wallet).data,
        }
    )
