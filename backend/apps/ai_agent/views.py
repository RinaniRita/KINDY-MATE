import json
import random
import urllib.request
import urllib.error
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from apps.profiles.models import ChildProfile
from .ai_prompts import get_milo_system_prompt


class MiloChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        child_id = request.data.get('child_id')
        message = request.data.get('message')
        chat_history = request.data.get('history', [])  # list of {"role": "user"|"assistant", "content": "..."}

        if not child_id or not message:
            return Response(
                {'detail': 'child_id và message là bắt buộc.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            child = ChildProfile.objects.select_related('wallet').get(id=child_id, parent=request.user)
        except ChildProfile.DoesNotExist:
            return Response({'detail': 'Không tìm thấy hồ sơ trẻ.'}, status=status.HTTP_404_NOT_FOUND)

        # Retrieve child context to personalize Milo's brain
        nickname = child.nickname
        age = child.age
        points = child.wallet.points_balance if hasattr(child, 'wallet') else child.wallet_balance
        interests = child.interests or "chưa rõ"
        subjects = child.favorite_subjects or "chưa rõ"

        system_prompt = get_milo_system_prompt(
            nickname=nickname,
            age=age,
            points=points,
            interests=interests,
            subjects=subjects
        )

        messages = [{"role": "system", "content": system_prompt}]
        for hist in chat_history[-6:]:
            messages.append({
                "role": "user" if hist.get("role") == "user" else "assistant",
                "content": hist.get("content", "")
            })
        messages.append({"role": "user", "content": message})

        # Try custom OLLAMA_API_URL first, then host.docker.internal, then fallback to localhost
        import os
        env_url = os.getenv("OLLAMA_API_URL")
        ollama_urls = []
        if env_url:
            ollama_urls.append(env_url)
        
        ollama_urls.extend([
            "http://host.docker.internal:11434/api/chat",
            "http://localhost:11434/api/chat",
        ])

        ollama_response = None
        last_err = None

        for url in ollama_urls:
            try:
                payload = {
                    "model": "qwen2.5:7b-instruct",
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "num_predict": 120,
                    }
                }
                data = json.dumps(payload).encode('utf-8')
                req = urllib.request.Request(
                    url,
                    data=data,
                    headers={'Content-Type': 'application/json'},
                    method='POST'
                )
                with urllib.request.urlopen(req, timeout=4) as response:
                    ollama_response = json.loads(response.read().decode('utf-8'))
                    break
            except Exception as e:
                last_err = str(e)
                continue

        if not ollama_response:
            fallback_replies = [
                f"Ôi, Milo đang hơi buồn ngủ một tí rồi {nickname} ơi! Cậu đi học bài hoặc tập thể dục một tí rồi quay lại trò chuyện với tớ nhé! 🦖🌟",
                f"Tớ rất vui được trò chuyện với cậu! Nhưng hình như tớ đang bận đi dọn phòng ngủ rồi, hẹn bé {nickname} một lát nữa nha! ❤️🎒",
                f"Bé {nickname} ơi, cậu hôm nay thật tuyệt vời! Milo chúc cậu một ngày học tập thật nhiều niềm vui nhé! 🎉⭐"
            ]
            reply = random.choice(fallback_replies)
            return Response({
                'reply': reply,
                'status': 'fallback_offline',
                'detail': f'Ollama offline: {last_err}'
            })

        reply = ollama_response.get('message', {}).get('content', '').strip()
        return Response({
            'reply': reply,
            'status': 'success'
        })
