from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ChildProfileViewSet

router = DefaultRouter()
router.register('children', ChildProfileViewSet, basename='children')

urlpatterns = [
    path('', include(router.urls)),
]
