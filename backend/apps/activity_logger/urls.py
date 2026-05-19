from django.urls import path

from .views import audit_log, dashboard, delete_child_data, export_child_data, hourly_usage, start_session, stop_session

urlpatterns = [
    path('dashboard/', dashboard, name='activity-dashboard'),
    path('hourly-usage/', hourly_usage, name='activity-hourly-usage'),
    path('audit-log/', audit_log, name='activity-audit-log'),
    path('children/<uuid:child_id>/export/', export_child_data, name='child-data-export'),
    path('children/<uuid:child_id>/delete/', delete_child_data, name='child-data-delete'),
    path('start-session/', start_session, name='child-start-session'),
    path('stop-session/', stop_session, name='child-stop-session'),
]
