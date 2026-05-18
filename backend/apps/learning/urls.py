from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ContentItemViewSet, MissionViewSet

router = DefaultRouter()
router.register('content', ContentItemViewSet, basename='content')
router.register('missions', MissionViewSet, basename='missions')

urlpatterns = [
    path('', include(router.urls)),
]
