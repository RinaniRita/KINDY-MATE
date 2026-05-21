import json
import os
import random
import urllib.error
import urllib.request

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.profiles.models import ChildProfile

from .ai_prompts import get_milo_system_prompt


def _build_ollama_urls():
    env_url = os.getenv("OLLAMA_API_URL")
    urls = []
    if env_url:
        urls.append(env_url)
    urls.extend(
        [
            "http://host.docker.internal:11434/api/chat",
            "http://localhost:11434/api/chat",
        ]
    )
    return urls


def _post_to_ollama(model: str, messages: list[dict], *, temperature: float, num_predict: int, timeout: int = 6):
    last_err = None
    for url in _build_ollama_urls():
        try:
            payload = {
                "model": model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": num_predict,
                },
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8")), None
        except Exception as exc:  # noqa: BLE001
            last_err = str(exc)
            continue
    return None, last_err


def _fallback_parent_insight(message: str, child: ChildProfile, context: dict) -> tuple[str, str]:
    metrics = context.get("metrics") or {}
    weekly_metrics = context.get("weekly_metrics") or {}
    latest_activity = context.get("latest_activity") or {}
    alerts = context.get("alerts") or []
    weekly_summary = context.get("weekly_summary") or ""
    report_date = context.get("report_date") or ""
    highlights = context.get("eda_highlights") or []

    normalized = (message or "").lower()

    if any(keyword in normalized for keyword in ["nghiện", "tâm lý", "trầm cảm", "adhd", "bệnh", "rối loạn", "chẩn đoán"]):
        return (
            "Tôi không thể chẩn đoán hay gắn nhãn tâm lý hoặc y tế cho trẻ. Tôi chỉ có thể tóm tắt dữ liệu hoạt động trong app hiện có.",
            "/parent/reports",
        )

    if not weekly_metrics.get("total_app_minutes") and not metrics.get("total_app_minutes"):
        return (
            "Hiện chưa có đủ dữ liệu trong tuần này để kết luận xu hướng. Bạn có thể xem lại sau khi bé dùng app thêm vài phiên.",
            "/parent/reports",
        )

    if any(token in normalized for token in ["bao lâu", "bao nhiêu", "thời gian"]):
        return (
            f"Dựa trên dữ liệu ngày {report_date}, {child.nickname} đã dùng app {metrics.get('total_app_minutes', 0)} phút, trong đó {metrics.get('screen_time_minutes', 0)} phút trên màn hình và {metrics.get('offscreen_time_minutes', 0)} phút ngoài màn hình.",
            "/parent/dashboard",
        )

    if any(token in normalized for token in ["phiên gần nhất", "vừa rồi", "vừa dùng"]):
        if latest_activity:
            title = latest_activity.get("content_title") or latest_activity.get("notes") or "một hoạt động trong app"
            return (
                f'Phiên gần nhất tôi ghi nhận là "{title}", kéo dài {latest_activity.get("duration_minutes", 0)} phút.',
                "/parent/dashboard",
            )
        return (f"Hiện tôi chưa có phiên hoàn chỉnh nào gần đây của {child.nickname}.", "/parent/dashboard")

    if any(token in normalized for token in ["chủ động", "thụ động"]):
        summary = highlights[0] if highlights else weekly_summary
        return (
            f"Trong 7 ngày gần đây, {child.nickname} có {weekly_metrics.get('active_minutes', 0)} phút hoạt động chủ động và {weekly_metrics.get('passive_minutes', 0)} phút nội dung thụ động. {summary}",
            "/parent/reports",
        )

    if any(token in normalized for token in ["an toàn", "chú ý", "cảnh báo"]):
        if alerts:
            return (f"Hiện có {len(alerts)} ghi chú dành cho phụ huynh. Mục nổi bật nhất là: {alerts[0]}", "/parent/dashboard")
        return ("Hiện chưa có ghi chú an toàn mới trong dashboard.", "/parent/dashboard")

    return (
        weekly_summary
        or f"Tôi có thể tóm tắt thời gian dùng app, phiên gần nhất, xu hướng 7 ngày và các ghi chú dành cho phụ huynh của {child.nickname}.",
        "/parent/reports",
    )


def _compact_parent_context(raw_context: dict) -> dict:
    if not isinstance(raw_context, dict):
        return {}

    recent_sessions = raw_context.get("recent_sessions") or []
    compact_sessions = []
    for session in recent_sessions[:4]:
        compact_sessions.append(
            {
                "activity_category": session.get("activity_category"),
                "display_category": session.get("display_category"),
                "content_title": session.get("content_title"),
                "notes": session.get("notes"),
                "duration_minutes": session.get("duration_minutes"),
                "started_at": session.get("started_at"),
            }
        )

    return {
        "report_date": raw_context.get("report_date"),
        "metrics": raw_context.get("metrics") or {},
        "weekly_metrics": raw_context.get("weekly_metrics") or {},
        "alerts": (raw_context.get("alerts") or [])[:5],
        "weekly_summary": raw_context.get("weekly_summary") or "",
        "eda_highlights": (raw_context.get("eda_highlights") or [])[:4],
        "latest_activity": raw_context.get("latest_activity") or {},
        "recent_sessions": compact_sessions,
    }


class MiloChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        child_id = request.data.get("child_id")
        message = request.data.get("message")
        chat_history = request.data.get("history", [])

        if not child_id or not message:
            return Response({"detail": "child_id và message là bắt buộc."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            child = ChildProfile.objects.select_related("wallet").get(id=child_id, parent=request.user)
        except ChildProfile.DoesNotExist:
            return Response({"detail": "Không tìm thấy hồ sơ trẻ."}, status=status.HTTP_404_NOT_FOUND)

        nickname = child.nickname
        age = child.age
        points = child.wallet.points_balance if hasattr(child, "wallet") else child.wallet_balance
        interests = child.interests or "chưa rõ"
        subjects = child.favorite_subjects or "chưa rõ"

        system_prompt = get_milo_system_prompt(
            nickname=nickname,
            age=age,
            points=points,
            interests=interests,
            subjects=subjects,
        )

        messages = [{"role": "system", "content": system_prompt}]
        for hist in chat_history[-6:]:
            messages.append(
                {
                    "role": "user" if hist.get("role") == "user" else "assistant",
                    "content": hist.get("content", ""),
                }
            )
        messages.append({"role": "user", "content": message})

        ollama_response, last_err = _post_to_ollama(
            "gemma4:e2b",
            messages,
            temperature=0.7,
            num_predict=120,
            timeout=8,
        )

        if not ollama_response:
            fallback_replies = [
                f"Ôi, Milo đang hơi buồn ngủ một tí rồi {nickname} ơi. Cậu đi học bài hoặc tập thể dục một tí rồi quay lại trò chuyện với tớ nhé.",
                f"Tớ rất vui được trò chuyện với cậu. Nhưng hình như tớ đang bận đi dọn phòng ngủ rồi, hẹn bé {nickname} một lát nữa nhé.",
                f"Bé {nickname} ơi, cậu hôm nay thật tuyệt vời. Milo chúc cậu một ngày học tập thật nhiều niềm vui nhé.",
            ]
            return Response(
                {
                    "reply": random.choice(fallback_replies),
                    "status": "fallback_offline",
                    "detail": f"Ollama offline: {last_err}",
                }
            )

        reply = ollama_response.get("message", {}).get("content", "").strip()
        return Response({"reply": reply, "status": "success"})


class ParentInsightsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        child_id = request.data.get("child_id")
        message = (request.data.get("message") or "").strip()
        chat_history = request.data.get("history", [])
        context = _compact_parent_context(request.data.get("context") or {})

        if not child_id or not message:
            return Response({"detail": "child_id và message là bắt buộc."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            child = ChildProfile.objects.get(id=child_id, parent=request.user)
        except ChildProfile.DoesNotExist:
            return Response({"detail": "Không tìm thấy hồ sơ trẻ."}, status=status.HTTP_404_NOT_FOUND)

        system_prompt = f"""
Bạn là trợ lý dữ liệu dành cho phụ huynh của Kindy-Mate.

Phạm vi bắt buộc:
- Chỉ trả lời dựa trên dữ liệu dashboard, báo cáo, recent sessions và alerts được cung cấp.
- Không chẩn đoán y tế, tâm lý, hành vi bệnh lý hay nói trẻ "nghiện".
- Nếu dữ liệu chưa đủ, phải nói rõ là chưa đủ dữ liệu.
- Không bịa thêm số liệu.
- Trả lời ngắn, rõ, bằng tiếng Việt.
- Khi phù hợp, mở đầu bằng kiểu: "Dựa trên dữ liệu ngày..." hoặc "Trong 7 ngày gần đây...".
- Không nhắc tới chat history của trẻ, vì hệ thống này không dùng free-chat của trẻ cho phân tích phụ huynh.
""".strip()

        context_text = json.dumps(
            {
                "child": {
                    "nickname": child.nickname,
                    "age": child.age,
                },
                "context": context,
            },
            ensure_ascii=False,
        )

        messages = [{"role": "system", "content": system_prompt}]
        messages.append({"role": "system", "content": f"Dữ liệu được phép dùng:\n{context_text}"})
        for hist in chat_history[-6:]:
            messages.append(
                {
                    "role": "user" if hist.get("role") == "user" else "assistant",
                    "content": hist.get("content", ""),
                }
            )
        messages.append({"role": "user", "content": message})

        ollama_response, last_err = _post_to_ollama(
            "gemma4:e2b",
            messages,
            temperature=0.2,
            num_predict=220,
            timeout=8,
        )

        if not ollama_response:
            reply, link_target = _fallback_parent_insight(message, child, context)
            return Response(
                {
                    "reply": reply,
                    "status": "fallback",
                    "source_scope": "dashboard_reports_only",
                    "link_target": link_target,
                    "detail": f"Ollama offline: {last_err}",
                }
            )

        reply = ollama_response.get("message", {}).get("content", "").strip()
        if not reply:
            reply, link_target = _fallback_parent_insight(message, child, context)
            return Response(
                {
                    "reply": reply,
                    "status": "fallback",
                    "source_scope": "dashboard_reports_only",
                    "link_target": link_target,
                    "detail": "Ollama returned an empty response.",
                }
            )

        link_target = "/parent/reports" if any(token in message.lower() for token in ["tuần", "xu hướng", "chủ động", "thụ động"]) else "/parent/dashboard"
        return Response(
            {
                "reply": reply,
                "status": "success",
                "source_scope": "dashboard_reports_only",
                "link_target": link_target,
            }
        )
