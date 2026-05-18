from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='childprofile',
            name='default_language',
            field=models.CharField(default='vi', max_length=8),
        ),
        migrations.AddField(
            model_name='childprofile',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='childprofile',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name='parentrule',
            name='allow_external_video',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='parentrule',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AddField(
            model_name='parentrule',
            name='max_sessions_per_day',
            field=models.PositiveSmallIntegerField(default=3),
        ),
        migrations.AddField(
            model_name='parentrule',
            name='require_balanced_missions',
            field=models.BooleanField(default=True),
        ),
    ]
