from django.urls import path

from .views import (
    audit_log,
    child_session_end,
    child_session_start,
    dashboard,
    delete_child_data,
    export_child_data,
    hourly_usage,
    segment_complete,
    segment_heartbeat,
    segment_start,
)

urlpatterns = [
    path('dashboard/', dashboard, name='activity-dashboard'),
    path('hourly-usage/', hourly_usage, name='activity-hourly-usage'),
    path('audit-log/', audit_log, name='activity-audit-log'),
    path('children/<uuid:child_id>/export/', export_child_data, name='child-data-export'),
    path('children/<uuid:child_id>/delete/', delete_child_data, name='child-data-delete'),
    path('child-session/start/', child_session_start, name='child-session-start'),
    path('child-session/end/', child_session_end, name='child-session-end'),
    path('segments/start/', segment_start, name='segment-start'),
    path('segments/heartbeat/', segment_heartbeat, name='segment-heartbeat'),
    path('segments/complete/', segment_complete, name='segment-complete'),
]
