from django.urls import path
from .views import MiloChatView

urlpatterns = [
    path('milo/chat/', MiloChatView.as_view(), name='milo-chat'),
]
