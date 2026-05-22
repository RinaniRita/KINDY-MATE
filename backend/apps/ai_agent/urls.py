from django.urls import path

from .views import MiloChatView, ParentInsightsView

urlpatterns = [
    path('milo/chat/', MiloChatView.as_view(), name='milo-chat'),
    path('parent-insights/', ParentInsightsView.as_view(), name='parent-insights'),
]
