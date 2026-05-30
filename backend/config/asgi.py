import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

from django.core.asgi import get_asgi_application

_django_app = get_asgi_application()


async def application(scope, receive, send):
    """
    SSE stream endpoint bypasses Django middleware stack entirely.
    Everything else routes through normal Django ASGI.
    """
    if (
        scope["type"] == "http"
        and scope.get("path", "").rstrip("/").endswith("/milo/chat/stream")
    ):
        from apps.ai_agent.asgi_stream import milo_stream_app
        await milo_stream_app(scope, receive, send)
    else:
        await _django_app(scope, receive, send)