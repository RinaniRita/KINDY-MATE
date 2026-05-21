from django.urls import path
from .views import MiloChatView, MiloChatStreamView

urlpatterns = [
    path("milo/chat/",        MiloChatView.as_view(),       name="milo-chat"),
    path("milo/chat/stream/", MiloChatStreamView.as_view(), name="milo-chat-stream"),
]
