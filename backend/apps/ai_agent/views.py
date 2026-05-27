import json
import os
import queue
import random
import threading
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from google import genai
from google.genai import types

from apps.profiles.models import ChildProfile
from .ai_prompts import get_milo_system_prompt

GEMINI_MODEL = "gemini-2.5-flash"
OLLAMA_MODEL = "gemma4:E2B"
GEMINI_HARD_TIMEOUT = 10  # seconds — hard cutoff for entire Gemini call

_gemini_client = None
_gemini_client_key = None


def _get_client():
    global _gemini_client, _gemini_client_key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    # Recreate client if key changed (e.g. after .env update + server restart)
    if _gemini_client is None or _gemini_client_key != api_key:
        try:
            _gemini_client = genai.Client(
                api_key=api_key,
                http_options={"timeout": 10_000},  # 10s per-request timeout in ms (Google minimum)
            )
            _gemini_client_key = api_key
        except Exception as e:
            print(f"[Milo] Error initializing Gemini client: {e}")
            _gemini_client = None
            _gemini_client_key = None
            return None
    return _gemini_client


def _build_contents(system_prompt: str, chat_history: list, message: str):
    """Convert messages to Gemini `contents` format, keeping system prompt separate."""
    contents = []
    for hist in chat_history[-6:]:
        role = "user" if hist.get("role") == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=hist.get("content", ""))]))
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))
    return system_prompt, contents


def _resolve_ollama_urls():
    env_url = os.getenv("OLLAMA_API_URL")
    if env_url:
        return [env_url]
    
    # Check if running inside Docker container
    is_docker = os.path.exists('/.dockerenv') or os.environ.get('POSTGRES_HOST') == 'db'
    if is_docker:
        return ["http://host.docker.internal:11434/api/chat"]
    else:
        return ["http://localhost:11434/api/chat"]


def _build_ollama_messages(system_prompt: str, chat_history: list, message: str) -> list:
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


def _get_child_and_prompt(request, screen_context=""):
    """Shared helper: validate request, fetch child, build system prompt."""
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


def _gemini_generate(system_prompt_text, contents):
    """Blocking Gemini call — run inside a thread with hard timeout."""
    client = _get_client()
    if client is None:
        raise ValueError("Gemini client not configured.")
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
    return response.text.strip()


def _gemini_stream_worker(system_prompt_text, contents, q):
    """Background worker to fetch Gemini streaming content and put it in a queue."""
    client = _get_client()
    if client is None:
        q.put(ValueError("Gemini client not configured."))
        return
    try:
        stream = client.models.generate_content_stream(
            model=GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt_text,
                temperature=0.7,
                max_output_tokens=150,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
        for chunk in stream:
            if chunk.text:
                q.put(chunk.text)
        q.put(None)  # Sentinel for completion
    except Exception as e:
        q.put(e)


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

        system_prompt_text, contents = _build_contents(system_prompt, chat_history, message)

        # 1. Try Gemini with hard timeout
        try:
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_gemini_generate, system_prompt_text, contents)
                reply = future.result(timeout=GEMINI_HARD_TIMEOUT)
            print(f"[Milo] Gemini success")
            return Response({"reply": reply, "status": "success"})
        except FuturesTimeoutError:
            print(f"[Milo] Gemini timed out after {GEMINI_HARD_TIMEOUT}s. Falling back...")
        except Exception as gemini_err:
            print(f"[Milo] Gemini error: {gemini_err}. Falling back...")

        # 2. Fallback to Ollama Local
        ollama_messages = _build_ollama_messages(system_prompt, chat_history, message)
        for url in _resolve_ollama_urls():
            try:
                payload = {
                    "model": OLLAMA_MODEL,
                    "messages": ollama_messages,
                    "stream": False,
                    "options": {"temperature": 0.7, "num_predict": 150},
                }
                data = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(
                    url, data=data,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=2) as resp:
                    ollama_response = json.loads(resp.read().decode("utf-8"))
                    reply = ollama_response.get("message", {}).get("content", "").strip()
                    print(f"[Milo] Ollama fallback success at {url}")
                    return Response({"reply": reply, "status": "success_ollama_fallback"})
            except Exception as ollama_err:
                print(f"[Milo] Ollama fallback error at {url}: {ollama_err}")
                continue

        # 3. Ultimate Fallback (Template sentences)
        print("[Milo] All AI providers failed. Using template fallback.")
        return Response({
            "reply": _fallback_reply(child.nickname),
            "status": "fallback_offline",
            "detail": "Both Gemini and Ollama offline/failed.",
        })


class MiloChatStreamView(APIView):
    """
    Streaming chat endpoint using Server-Sent Events (SSE).
    Sends text chunks for real-time typing effect.
    SSE format: data: {"chunk": "...", "done": false}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        print("[Milo] MiloChatStreamView: request received")
        screen_context = request.data.get("screen_context", "")
        child, message, chat_history, system_prompt, err = _get_child_and_prompt(request, screen_context)

        if err:
            def _err():
                yield f"data: {json.dumps({'chunk': err, 'done': True})}\n\n"
            return StreamingHttpResponse(_err(), content_type="text/event-stream")

        system_prompt_text, contents = _build_contents(system_prompt, chat_history, message)

        def generate():
            # 1. Try Gemini streaming with queue & timeouts
            q = queue.Queue()
            t = threading.Thread(
                target=_gemini_stream_worker,
                args=(system_prompt_text, contents, q),
                daemon=True
            )
            t.start()

            gemini_success = True
            is_first_chunk = True
            
            while True:
                timeout = 6.0 if is_first_chunk else 2.0
                try:
                    item = q.get(timeout=timeout)
                except queue.Empty:
                    print(f"[Milo] Gemini stream timed out (first chunk: {is_first_chunk})")
                    gemini_success = False
                    break

                if isinstance(item, Exception):
                    print(f"[Milo] Gemini stream exception: {item}")
                    gemini_success = False
                    break
                
                if item is None:
                    # Completed successfully, but if we never got any text chunks,
                    # treat it as a failure (possibly a Safety Block or empty model response)
                    if is_first_chunk:
                        print("[Milo] Gemini stream ended but NO content was sent (Safety block?).")
                        gemini_success = False
                    break

                # We got a text chunk
                is_first_chunk = False
                yield f"data: {json.dumps({'chunk': item, 'done': False})}\n\n"

            if gemini_success:
                print("[Milo] Gemini stream success")
                yield f"data: {json.dumps({'chunk': '', 'done': True})}\n\n"
                return

            # If Gemini failed but we ALREADY yielded some chunks to the client,
            # we just gracefully terminate the connection instead of sending duplicate fallback responses.
            if not is_first_chunk:
                print("[Milo] Gemini stream interrupted mid-stream. Closing stream.")
                yield f"data: {json.dumps({'chunk': '', 'done': True})}\n\n"
                return

            print("[Milo] Gemini stream failed/timed out on first chunk. Switching to Ollama...")

            # 2. Fallback to Ollama Local Stream
            ollama_messages = _build_ollama_messages(system_prompt, chat_history, message)
            streamed_ollama = False
            for url in _resolve_ollama_urls():
                try:
                    payload = {
                        "model": OLLAMA_MODEL,
                        "messages": ollama_messages,
                        "stream": True,
                        "options": {"temperature": 0.7, "num_predict": 150},
                    }
                    data = json.dumps(payload).encode("utf-8")
                    req = urllib.request.Request(
                        url, data=data,
                        headers={"Content-Type": "application/json"},
                        method="POST",
                    )
                    with urllib.request.urlopen(req, timeout=2) as resp:
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
                                streamed_ollama = True
                                yield f"data: {json.dumps({'chunk': content, 'done': False})}\n\n"

                            if done:
                                # Block Ollama from returning empty content
                                if streamed_ollama:
                                    yield f"data: {json.dumps({'chunk': '', 'done': True})}\n\n"
                                    return
                                else:
                                    print(f"[Milo] Ollama returned done without text at {url}.")
                                    break  # Break out of loop over resp lines to switch to Ultimate Fallback
                    if streamed_ollama:
                        return
                except Exception as ollama_err:
                    print(f"[Milo] Ollama stream fallback error at {url}: {ollama_err}")
                    continue

                # Skip next URL if this URL already streamed successfully
                if streamed_ollama:
                    return

            # 3. Ultimate Fallback (Template sentences)
            print("[Milo] All AI providers failed. Using template fallback.")
            fallback = _fallback_reply(child.nickname)
            yield f"data: {json.dumps({'chunk': fallback, 'done': False})}\n\n"
            yield f"data: {json.dumps({'chunk': '', 'done': True})}\n\n"

        streaming_response = StreamingHttpResponse(
            generate(), content_type="text/event-stream"
        )
        streaming_response["Cache-Control"] = "no-cache"
        streaming_response["X-Accel-Buffering"] = "no"
        streaming_response["Access-Control-Allow-Origin"] = "*"
        return streaming_response
