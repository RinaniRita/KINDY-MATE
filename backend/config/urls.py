from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.authentication.urls')),
    path('api/v1/', include('apps.profiles.urls')),
    path('api/v1/', include('apps.learning.urls')),
    path('api/v1/gamification/', include('apps.gamification.urls')),
    path('api/v1/activity/', include('apps.activity_logger.urls')),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/', include('apps.profiles.urls')),
    path('api/', include('apps.learning.urls')),
    path('api/gamification/', include('apps.gamification.urls')),
    path('api/activity/', include('apps.activity_logger.urls')),
]
