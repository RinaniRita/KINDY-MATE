"""
Pure ASGI handler for the Milo SSE stream — no Django middleware involved.
JWT auth, request parsing, and streaming all happen here directly.
"""
import json
import asyncio

from django.conf import settings

from apps.ai_agent.views import (
    _generate_milo_reply,
    _iter_reply_chunks,
    _sse_event,
    _fallback_reply,
    get_milo_system_prompt,
)


async def milo_stream_app(scope, receive, send):
    if scope.get("method") == "OPTIONS":
        await _send_status(send, 204, scope)
        return

    # ── Read request body ──────────────────────────────────────────────────────
    body = b""
    while True:
        event = await receive()
        body += event.get("body", b"")
        if not event.get("more_body", False):
            break

    # ── Parse headers ──────────────────────────────────────────────────────────
    headers = {k.decode(): v.decode() for k, v in scope.get("headers", [])}
    auth_header = headers.get("authorization", "")

    # ── JWT auth ───────────────────────────────────────────────────────────────
    if not auth_header.startswith("Bearer "):
        await _send_status(send, 401, scope)
        return

    try:
        from rest_framework_simplejwt.tokens import AccessToken
        from django.contrib.auth import get_user_model
        token = AccessToken(auth_header.split(" ")[1])
        User = get_user_model()
        user = await User.objects.aget(id=token["user_id"])
    except Exception:
        await _send_status(send, 401, scope)
        return

    # ── Parse body ─────────────────────────────────────────────────────────────
    try:
        data = json.loads(body)
    except Exception:
        await _send_status(send, 400, scope)
        return

    child_id = data.get("child_id")
    message = data.get("message")
    chat_history = data.get("history", [])
    screen_context = data.get("screen_context", "")

    if not child_id or not message:
        await _send_status(send, 400, scope)
        return

    # ── Fetch child ────────────────────────────────────────────────────────────
    try:
        from apps.profiles.models import ChildProfile
        child = await ChildProfile.objects.select_related("wallet").aget(
            id=child_id, parent=user
        )
    except Exception:
        await _send_status(send, 404, scope)
        return

    points_balance = child.wallet.points_balance if hasattr(child, "wallet") and child.wallet else 0

    from apps.ai_agent.ai_prompts import get_milo_system_prompt
    system_prompt = get_milo_system_prompt(
        nickname=child.nickname,
        age=child.age,
        points=points_balance,
        interests=child.interests or "chưa rõ",
        subjects=child.favorite_subjects or "chưa rõ",
        screen_context=screen_context,
    )

    # ── Send SSE headers ───────────────────────────────────────────────────────
    await send({
        "type": "http.response.start",
        "status": 200,
        "headers": [
            (b"content-type", b"text/event-stream"),
            (b"cache-control", b"no-cache"),
            (b"x-accel-buffering", b"no"),
        ] + _cors_headers(scope),
    })

    # ── Stream ─────────────────────────────────────────────────────────────────
    await send({
        "type": "http.response.body",
        "body": b": keepalive\n\n",
        "more_body": True,
    })

    try:
        reply, reply_status = await asyncio.to_thread(
            _generate_milo_reply,
            system_prompt,
            chat_history,
            message,
            child.nickname,
        )
        print(f"[Milo] ASGI stream reply source: {reply_status}")
    except Exception as e:
        print(f"[Milo] ASGI stream error: {e}")
        reply = _fallback_reply(child.nickname)

    chunk_count = 0
    for chunk in _iter_reply_chunks(reply):
        payload = _sse_event(chunk, done=False).encode()
        await send({
            "type": "http.response.body",
            "body": payload,
            "more_body": True,
        })
        chunk_count += 1

    print(f"[Milo] Streamed {chunk_count} chunks to client")
    await send({
        "type": "http.response.body",
        "body": _sse_event("", done=True).encode(),
        "more_body": False,
    })


def _scope_headers(scope) -> dict[str, str]:
    return {k.decode().lower(): v.decode() for k, v in scope.get("headers", [])}


def _cors_headers(scope) -> list[tuple[bytes, bytes]]:
    headers = _scope_headers(scope)
    origin = headers.get("origin", "")
    allowed_origins = set(getattr(settings, "CORS_ALLOWED_ORIGINS", []) or [])
    allow_origin = origin if origin in allowed_origins else "*"
    requested_headers = headers.get("access-control-request-headers")
    allow_headers = requested_headers or "authorization, content-type"

    return [
        (b"access-control-allow-origin", allow_origin.encode()),
        (b"access-control-allow-methods", b"POST, OPTIONS"),
        (b"access-control-allow-headers", allow_headers.encode()),
        (b"access-control-max-age", b"86400"),
        (b"vary", b"Origin"),
    ]


async def _send_status(send, status: int, scope):
    await send({
        "type": "http.response.start",
        "status": status,
        "headers": _cors_headers(scope),
    })
    await send({"type": "http.response.body", "body": b"", "more_body": False})
