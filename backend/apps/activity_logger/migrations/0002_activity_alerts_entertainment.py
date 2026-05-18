import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('activity_logger', '0001_initial'),
        ('authentication', '0002_user_consent'),
        ('gamification', '0002_rewarditem_mascot'),
        ('learning', '0002_content_mission_metadata'),
        ('profiles', '0002_professional_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='ActivityLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(max_length=80)),
                ('event_category', models.CharField(max_length=40)),
                ('duration_seconds', models.PositiveIntegerField(default=0)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('child', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='activity_logs', to='profiles.childprofile')),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='EntertainmentSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('points_spent', models.PositiveSmallIntegerField(default=0)),
                ('duration_minutes_allowed', models.PositiveSmallIntegerField(default=0)),
                ('duration_minutes_actual', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('status', models.CharField(choices=[('scheduled', 'Scheduled'), ('active', 'Active'), ('completed', 'Completed'), ('stopped', 'Stopped'), ('blocked', 'Blocked')], default='scheduled', max_length=16)),
                ('blocked_reason', models.CharField(blank=True, max_length=255)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('ended_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('child', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='entertainment_sessions', to='profiles.childprofile')),
                ('content', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='entertainment_sessions', to='learning.contentitem')),
                ('reward_item', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='entertainment_sessions', to='gamification.rewarditem')),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='ParentAlert',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('alert_type', models.CharField(max_length=80)),
                ('severity', models.CharField(choices=[('info', 'Info'), ('warning', 'Warning'), ('urgent', 'Urgent')], default='info', max_length=12)),
                ('message', models.TextField()),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('child', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='alerts', to='profiles.childprofile')),
                ('parent', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='parent_alerts', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
