from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from .views import MiloChatView, milo_chat_stream  

urlpatterns = [
    path("milo/chat/",        MiloChatView.as_view(), name="milo-chat"),
    path("milo/chat/stream/", csrf_exempt(milo_chat_stream), name="milo-chat-stream"),
]