from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MascotItemViewSet, RewardItemViewSet, mascot_inventory, spend_reward, wallet_detail

router = DefaultRouter()
router.register('reward-items', RewardItemViewSet, basename='reward-items')
router.register('mascot-items', MascotItemViewSet, basename='mascot-items')

urlpatterns = [
    path('', include(router.urls)),
    path('wallet/', wallet_detail, name='wallet-detail'),
    path('spend/', spend_reward, name='spend-reward'),
    path('mascot-inventory/', mascot_inventory, name='mascot-inventory'),
]
