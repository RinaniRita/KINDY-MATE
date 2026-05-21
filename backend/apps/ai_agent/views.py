import json
import random
import urllib.request
import urllib.error
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from apps.profiles.models import ChildProfile
from .ai_prompts import get_milo_system_prompt

OLLAMA_MODEL = "gemma4:E2B"

OLLAMA_URLS = [
    "http://host.docker.internal:11434/api/chat",
    "http://localhost:11434/api/chat",
]


def _resolve_ollama_urls():
    import os
    env_url = os.getenv("OLLAMA_API_URL")
    urls = []
    if env_url:
        urls.append(env_url)
    urls.extend(OLLAMA_URLS)
    return urls


def _build_messages(system_prompt: str, chat_history: list, message: str) -> list:
    messages = [{"role": "system", "content": system_prompt}]
    for hist in chat_history[-6:]:
        messages.append({
            "role": "user" if hist.get("role") == "user" else "assistant",
            "content": hist.get("content", ""),
        })
    messages.append({"role": "user", "content": message})
    return messages


def _fallback_reply(nickname: str) -> str:
    options = [
        f"Ôi, Milo đang hơi buồn ngủ một tí rồi {nickname} ơi! Cậu đi học bài rồi quay lại trò chuyện với tớ nhé! 🐱🌟",
        f"Tớ rất vui được trò chuyện với cậu! Nhưng hình như tớ đang bận một tí, hẹn bé {nickname} một lát nữa nha! ❤️",
        f"Bé {nickname} ơi, cậu hôm nay thật tuyệt vời! Milo chúc cậu một ngày học tập thật nhiều niềm vui nhé! 🎉⭐",
    ]
    return random.choice(options)


class MiloChatView(APIView):
    """Non-streaming chat endpoint (kept for backwards compatibility)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        child_id = request.data.get("child_id")
        message = request.data.get("message")
        chat_history = request.data.get("history", [])
        screen_context = request.data.get("screen_context", "")

        if not child_id or not message:
            return Response(
                {"detail": "child_id và message là bắt buộc."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            child = ChildProfile.objects.select_related("wallet").get(
                id=child_id, parent=request.user
            )
        except ChildProfile.DoesNotExist:
            return Response(
                {"detail": "Không tìm thấy hồ sơ trẻ."},
                status=status.HTTP_404_NOT_FOUND,
            )

        nickname = child.nickname
        system_prompt = get_milo_system_prompt(
            nickname=nickname,
            age=child.age,
            points=child.wallet.points_balance if hasattr(child, "wallet") else child.wallet_balance,
            interests=child.interests or "chưa rõ",
            subjects=child.favorite_subjects or "chưa rõ",
            screen_context=screen_context,
        )
        messages = _build_messages(system_prompt, chat_history, message)

        ollama_response = None
        last_err = None

        for url in _resolve_ollama_urls():
            try:
                payload = {
                    "model": OLLAMA_MODEL,
                    "messages": messages,
                    "stream": False,
                    "options": {"temperature": 0.7, "num_predict": 150},
                }
                data = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(
                    url, data=data,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=30) as resp:
                    ollama_response = json.loads(resp.read().decode("utf-8"))
                    break
            except Exception as e:
                last_err = str(e)
                continue

        if not ollama_response:
            return Response({
                "reply": _fallback_reply(nickname),
                "status": "fallback_offline",
                "detail": f"Ollama offline: {last_err}",
            })

        reply = ollama_response.get("message", {}).get("content", "").strip()
        return Response({"reply": reply, "status": "success"})


class MiloChatStreamView(APIView):
    """
    Streaming chat endpoint using Server-Sent Events (SSE).
    Sends text chunks for real-time typing.
    When a sentence completes, sends an audio chunk: data: {"chunk": "", "audio": "base64...", "done": false}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        child_id = request.data.get("child_id")
        message = request.data.get("message")
        chat_history = request.data.get("history", [])
        screen_context = request.data.get("screen_context", "")

        if not child_id or not message:
            def _err():
                yield f"data: {json.dumps({'chunk': 'Thiếu thông tin rồi bé ơi!', 'done': True})}\n\n"
            return StreamingHttpResponse(_err(), content_type="text/event-stream")

        try:
            child = ChildProfile.objects.select_related("wallet").get(
                id=child_id, parent=request.user
            )
        except ChildProfile.DoesNotExist:
            def _err():
                yield f"data: {json.dumps({'chunk': 'Không tìm thấy hồ sơ trẻ.', 'done': True})}\n\n"
            return StreamingHttpResponse(_err(), content_type="text/event-stream")

        nickname = child.nickname
        system_prompt = get_milo_system_prompt(
            nickname=nickname,
            age=child.age,
            points=child.wallet.points_balance if hasattr(child, "wallet") else child.wallet_balance,
            interests=child.interests or "chưa rõ",
            subjects=child.favorite_subjects or "chưa rõ",
            screen_context=screen_context,
        )
        messages = _build_messages(system_prompt, chat_history, message)

        def generate():
            streamed = False
            for url in _resolve_ollama_urls():
                try:
                    payload = {
                        "model": OLLAMA_MODEL,
                        "messages": messages,
                        "stream": True,
                        "options": {"temperature": 0.7, "num_predict": 150},
                    }
                    data = json.dumps(payload).encode("utf-8")
                    req = urllib.request.Request(
                        url, data=data,
                        headers={"Content-Type": "application/json"},
                        method="POST",
                    )
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        for raw_line in resp:
                            line = raw_line.decode("utf-8").strip()
                            if not line:
                                continue
                            try:
                                chunk_data = json.loads(line)
                            except json.JSONDecodeError:
                                continue
                            
                            content = chunk_data.get("message", {}).get("content", "")
                            done = chunk_data.get("done", False)
                            
                            if content:
                                streamed = True
                                # Yield text chunk immediately for UI typing effect
                                yield f"data: {json.dumps({'chunk': content, 'done': False})}\n\n"
                            
                            if done:
                                yield f"data: {json.dumps({'chunk': '', 'done': True})}\n\n"
                                return
                    return  # successfully finished with this url
                except Exception as e:
                    print(f"Ollama stream error: {e}")
                    continue

            # Ollama offline fallback
            if not streamed:
                fallback = _fallback_reply(nickname)
                yield f"data: {json.dumps({'chunk': fallback, 'done': False})}\n\n"
                yield f"data: {json.dumps({'chunk': '', 'done': True})}\n\n"

        streaming_response = StreamingHttpResponse(
            generate(), content_type="text/event-stream"
        )
        streaming_response["Cache-Control"] = "no-cache"
        streaming_response["X-Accel-Buffering"] = "no"
        streaming_response["Access-Control-Allow-Origin"] = "*"
        return streaming_response
