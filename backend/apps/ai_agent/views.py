import json
import os
import random
import threading
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError

from django.http import HttpResponse
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

try:
    from groq import Groq
except ImportError:
    Groq = None

from apps.profiles.models import ChildProfile
from .ai_prompts import get_milo_system_prompt

# ── Model constants ────────────────────────────────────────────────────────────
GEMINI_MODEL = "gemini-2.5-flash"
GROQ_MODEL = "llama-3.1-8b-instant"   # fast, low-latency Groq model

# Hard timeout applied to EACH provider (seconds).
# If neither responds within this limit → hardcoded fallback.
AI_HARD_TIMEOUT = 5
AI_TOTAL_TIMEOUT = 8
GEMINI_QUOTA_COOLDOWN_SECONDS = 60 * 60
GROQ_RATE_LIMIT_COOLDOWN_SECONDS = 60

# ── Lazy Gemini client ─────────────────────────────────────────────────────────
_gemini_client = None
_gemini_client_key = None

_groq_client = None
_provider_blocked_until = {}
_provider_block_lock = threading.Lock()


def _env_value(name: str) -> str:
    return (os.getenv(name) or "").strip()


def _is_provider_blocked(provider: str) -> bool:
    with _provider_block_lock:
        return time.time() < _provider_blocked_until.get(provider, 0)


def _block_provider(provider: str, seconds: int, reason: str):
    until = time.time() + seconds
    with _provider_block_lock:
        _provider_blocked_until[provider] = max(_provider_blocked_until.get(provider, 0), until)
    print(f"[Milo] {provider} disabled for {seconds}s: {reason}")


def _maybe_block_gemini_after_error(error: Exception):
    message = str(error)
    if "RESOURCE_EXHAUSTED" in message or "429" in message or "Quota exceeded" in message:
        _block_provider("gemini", GEMINI_QUOTA_COOLDOWN_SECONDS, "quota exhausted")


def _maybe_block_groq_after_error(error: Exception):
    message = str(error)
    if "429" in message or "rate_limit" in message.lower() or "rate limit" in message.lower():
        _block_provider("groq", GROQ_RATE_LIMIT_COOLDOWN_SECONDS, "rate limited")


def _get_gemini_client():
    global _gemini_client, _gemini_client_key
    if genai is None:
        return None
    api_key = _env_value("GEMINI_API_KEY")
    if not api_key:
        return None
    if _gemini_client is None or _gemini_client_key != api_key:
        try:
            # Gemini SDK enforces a minimum of 10 000 ms (10 s) for the HTTP
            # deadline.  The thread-level AI_HARD_TIMEOUT (5 s) is a separate,
            # outer cutoff — it interrupts the blocking call regardless.
            _gemini_client = genai.Client(
                api_key=api_key,
                http_options={"timeout": 10_000},  # 10 s — Gemini minimum
            )
            _gemini_client_key = api_key
        except Exception as e:
            print(f"[Milo] Error initialising Gemini client: {e}")
            _gemini_client = None
            _gemini_client_key = None
    return _gemini_client


# ── Groq client (stateless — cheap to construct) ──────────────────────────────

def _get_groq_client():
    global _groq_client          # required — without this Python treats it as
                                 # an unbound local variable and raises UnboundLocalError
    if Groq is None:
        return None
    if _groq_client is None:
        api_key = _env_value("GROQ_API_KEY")
        if not api_key:
            return None
        _groq_client = Groq(api_key=api_key, timeout=AI_HARD_TIMEOUT)
    return _groq_client

# ── Message builders ───────────────────────────────────────────────────────────

def _build_gemini_contents(system_prompt: str, chat_history: list, message: str):
    """Convert messages to Gemini `contents` format."""
    if types is None:
        return system_prompt, []
    contents = []
    for hist in chat_history[-6:]:
        role = "user" if hist.get("role") == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=hist.get("content", ""))]))
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))
    return system_prompt, contents


def _build_openai_style_messages(system_prompt: str, chat_history: list, message: str) -> list:
    """Build an OpenAI-compatible messages list (works for Groq)."""
    messages = [{"role": "system", "content": system_prompt}]
    for hist in chat_history[-6:]:
        messages.append({
            "role": "user" if hist.get("role") == "user" else "assistant",
            "content": hist.get("content", ""),
        })
    messages.append({"role": "user", "content": message})
    return messages


# ── Hardcoded fallback ─────────────────────────────────────────────────────────

def _fallback_reply(nickname: str) -> str:
    options = [
        f"Ôi, Milo đang hơi buồn ngủ một tí rồi {nickname} ơi! Cậu đi học bài rồi quay lại trò chuyện với tớ nhé! 🐱🌟",
        f"Tớ rất vui được trò chuyện với cậu! Nhưng hình như tớ đang bận một tí, hẹn bé {nickname} một lát nữa nha! ❤️",
        f"Bé {nickname} ơi, cậu hôm nay thật tuyệt vời! Milo chúc cậu một ngày học tập thật nhiều niềm vui nhé! 🎉⭐",
    ]
    return random.choice(options)


# ── Shared request validator ───────────────────────────────────────────────────

def _get_child_and_prompt(request, screen_context=""):
    """Validate request, fetch child profile, build Milo system prompt."""
    child_id = request.data.get("child_id")
    message = request.data.get("message")
    chat_history = request.data.get("history", [])

    if not child_id or not message:
        return None, None, None, None, "child_id và message là bắt buộc."

    try:
        child = ChildProfile.objects.select_related("wallet").get(
            id=child_id, parent=request.user
        )
    except ChildProfile.DoesNotExist:
        return None, None, None, None, "Không tìm thấy hồ sơ trẻ."

    system_prompt = get_milo_system_prompt(
        nickname=child.nickname,
        age=child.age,
        points=child.wallet.points_balance if hasattr(child, "wallet") else child.wallet_balance,
        interests=child.interests or "chưa rõ",
        subjects=child.favorite_subjects or "chưa rõ",
        screen_context=screen_context,
    )
    return child, message, chat_history, system_prompt, None


# ── Gemini blocking call (run in thread) ──────────────────────────────────────

def _gemini_generate(system_prompt_text, contents):
    if types is None:
        raise ValueError("google-genai package is not installed.")
    if _is_provider_blocked("gemini"):
        raise ValueError("Gemini is temporarily disabled after quota/rate-limit errors.")
    client = _get_gemini_client()
    if client is None:
        raise ValueError("Gemini client is not configured.")
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt_text,
                temperature=0.7,
                max_output_tokens=150,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
    except Exception as e:
        _maybe_block_gemini_after_error(e)
        raise
    reply = (response.text or "").strip()
    if not reply:
        raise ValueError("Gemini returned an empty response.")
    return reply


# ── Groq blocking call (run in thread) ────────────────────────────────────────

def _groq_generate(messages: list) -> str:
    if _is_provider_blocked("groq"):
        raise ValueError("Groq is temporarily disabled after rate-limit errors.")
    client = _get_groq_client()
    if client is None:
        raise ValueError("Groq client is not configured.")
    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=150,
        )
    except Exception as e:
        _maybe_block_groq_after_error(e)
        raise
    reply = (completion.choices[0].message.content or "").strip()
    if not reply:
        raise ValueError("Groq returned an empty response.")
    return reply


# ── Helper: call provider with hard timeout ────────────────────────────────────

def _call_with_timeout(fn, *args, timeout=AI_HARD_TIMEOUT):
    """Run *fn(*args)* in a thread pool; raise on timeout or exception."""
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(fn, *args)
    try:
        return future.result(timeout=timeout)
    except FuturesTimeoutError:
        future.cancel()
        raise
    finally:
        executor.shutdown(wait=True, cancel_futures=True)


def _remaining_timeout(started_at: float) -> float:
    return max(0.0, AI_TOTAL_TIMEOUT - (time.time() - started_at))


def _provider_timeout(started_at: float) -> float:
    return min(AI_HARD_TIMEOUT, _remaining_timeout(started_at))


def _generate_milo_reply(system_prompt: str, chat_history: list, message: str, nickname: str):
    """
    Return a non-empty reply within AI_TOTAL_TIMEOUT whenever the process is alive.
    Providers are never allowed to own the HTTP/SSE lifecycle directly.
    """
    started_at = time.time()

    groq_messages = _build_openai_style_messages(system_prompt, chat_history, message)
    groq_timeout = _provider_timeout(started_at)
    if groq_timeout > 0:
        try:
            reply = _call_with_timeout(_groq_generate, groq_messages, timeout=groq_timeout)
            print("[Milo] Groq success")
            return reply, "success_groq"
        except FuturesTimeoutError:
            print(f"[Milo] Groq timed out after {groq_timeout:.1f}s → falling back to Gemini")
        except Exception as e:
            print(f"[Milo] Groq error: {e} → falling back to Gemini")

    gemini_timeout = _provider_timeout(started_at)
    if gemini_timeout > 0:
        system_prompt_text, contents = _build_gemini_contents(system_prompt, chat_history, message)
        try:
            reply = _call_with_timeout(_gemini_generate, system_prompt_text, contents, timeout=gemini_timeout)
            print("[Milo] Gemini fallback success")
            return reply, "success_gemini_fallback"
        except FuturesTimeoutError:
            print(f"[Milo] Gemini timed out after {gemini_timeout:.1f}s → using hardcoded fallback")
        except Exception as e:
            print(f"[Milo] Gemini error: {e} → using hardcoded fallback")

    print("[Milo] All AI providers failed. Using hardcoded fallback.")
    return _fallback_reply(nickname), "fallback_offline"


def _sse_event(chunk: str, done: bool = False) -> str:
    return f"data: {json.dumps({'chunk': chunk, 'done': done})}\n\n"


def _iter_reply_chunks(reply: str):
    words = reply.split(" ")
    for i, word in enumerate(words):
        yield word + (" " if i < len(words) - 1 else "")


# ══════════════════════════════════════════════════════════════════════════════
# Non-streaming view
# ══════════════════════════════════════════════════════════════════════════════

class MiloChatView(APIView):
    """Non-streaming chat endpoint (kept for backwards compatibility)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        print("[Milo] MiloChatView: request received")
        screen_context = request.data.get("screen_context", "")
        child, message, chat_history, system_prompt, err = _get_child_and_prompt(request, screen_context)

        if err:
            code = status.HTTP_400_BAD_REQUEST if "bắt buộc" in err else status.HTTP_404_NOT_FOUND
            return Response({"detail": err}, status=code)

        reply, reply_status = _generate_milo_reply(
            system_prompt=system_prompt,
            chat_history=chat_history,
            message=message,
            nickname=child.nickname,
        )
        return Response({
            "reply": reply,
            "status": reply_status,
        })


# ══════════════════════════════════════════════════════════════════════════════
# Streaming view (SSE)

async def milo_chat_stream(request):
    """Pure Django async view — bypass DRF để SSE hoạt động đúng với ASGI."""
    if request.method != "POST":
        return HttpResponse(status=405)

    # Manual JWT auth (không dùng DRF permission)
    from rest_framework_simplejwt.tokens import AccessToken
    from django.contrib.auth import get_user_model

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return HttpResponse(status=401)

    try:
        token = AccessToken(auth_header.split(" ")[1])
        User = get_user_model()
        user = await User.objects.aget(id=token["user_id"])
    except Exception:
        return HttpResponse(status=401)

    try:
        data = json.loads(request.body)
    except Exception:
        return HttpResponse(status=400)

    screen_context = data.get("screen_context", "")

    # Dùng lại _get_child_and_prompt nhưng async
    child_id = data.get("child_id")
    message = data.get("message")
    chat_history = data.get("history", [])

    if not child_id or not message:
        return HttpResponse("child_id và message là bắt buộc.", status=400)

    try:
        child = await ChildProfile.objects.select_related("wallet").aget(
            id=child_id, parent=user
        )
    except ChildProfile.DoesNotExist:
        return HttpResponse("Không tìm thấy hồ sơ trẻ.", status=404)

    points = getattr(child, "wallet", None)
    points_balance = points.points_balance if points else 0

    system_prompt = get_milo_system_prompt(
        nickname=child.nickname,
        age=child.age,
        points=points_balance,
        interests=child.interests or "chưa rõ",
        subjects=child.favorite_subjects or "chưa rõ",
        screen_context=screen_context,
    )

    async def generate():
        yield ": keepalive\n\n"
        try:
            reply, reply_status = await asyncio.to_thread(
                _generate_milo_reply,
                system_prompt,
                chat_history,
                message,
                child.nickname,
            )
            print(f"[Milo] Stream reply source: {reply_status}")
        except Exception as e:
            print(f"[Milo] Stream error: {e}")
            reply = _fallback_reply(child.nickname)

        for chunk in _iter_reply_chunks(reply):
            yield _sse_event(chunk, done=False)
        yield _sse_event("", done=True)

    response = StreamingHttpResponse(generate(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response
