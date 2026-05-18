from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import ChildProfile
from .serializers import ChildProfileSerializer, ParentRuleSerializer


class ChildProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ChildProfileSerializer

    def get_queryset(self):
        return (
            ChildProfile.objects.filter(parent=self.request.user)
            .select_related('rules', 'wallet')
            .order_by('nickname')
        )

    @action(detail=True, methods=['patch'])
    def rules(self, request, pk=None):
        child = self.get_object()
        serializer = ParentRuleSerializer(child.rules, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
