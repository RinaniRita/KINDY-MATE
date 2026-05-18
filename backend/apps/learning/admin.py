from django.contrib import admin
from .models import ContentItem, Mission, MissionAttempt

admin.site.register(ContentItem)
admin.site.register(Mission)
admin.site.register(MissionAttempt)
