from django.contrib import admin
from .models import ActivityLog, EntertainmentSession, ParentAlert, UsageSession

admin.site.register(UsageSession)
admin.site.register(EntertainmentSession)
admin.site.register(ActivityLog)
admin.site.register(ParentAlert)
