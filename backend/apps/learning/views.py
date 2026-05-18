from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.profiles.models import ChildProfile

from .models import ContentItem, Mission, MissionAttempt
from .serializers import ContentItemSerializer, MissionAttemptSerializer, MissionSerializer
from .services import complete_mission_for_child


class ContentItemViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ContentItemSerializer

    def get_queryset(self):
        return ContentItem.objects.filter(approval_status=ContentItem.ApprovalStatus.APPROVED)


class MissionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MissionSerializer

    def get_queryset(self):
        child_id = self.request.query_params.get('child_id')
        queryset = Mission.objects.filter(active=True).select_related('source_content')
        if child_id:
            try:
                child = ChildProfile.objects.get(id=child_id, parent=self.request.user)
            except ChildProfile.DoesNotExist:
                return Mission.objects.none()
            queryset = queryset.filter(age_min__lte=child.age, age_max__gte=child.age)
        return queryset

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        mission = self.get_object()
        child_id = request.data.get('child_id')
        try:
            child = ChildProfile.objects.select_related('wallet').get(id=child_id, parent=request.user)
        except ChildProfile.DoesNotExist:
            return Response({'detail': 'Child profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        attempt, wallet = complete_mission_for_child(child, mission, request.data.get('score', 100))

        return Response(
            {
                'attempt': MissionAttemptSerializer(attempt).data,
                'wallet': {
                    'points_balance': wallet.points_balance,
                    'points_earned_total': wallet.points_earned_total,
                    'points_spent_total': wallet.points_spent_total,
                },
            },
            status=status.HTTP_201_CREATED,
        )
