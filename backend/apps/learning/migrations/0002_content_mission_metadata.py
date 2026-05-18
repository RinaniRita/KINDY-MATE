from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='contentitem',
            name='content_body',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='contentitem',
            name='demo_only',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='contentitem',
            name='description',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='contentitem',
            name='media_url',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='contentitem',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name='missionattempt',
            name='metadata',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AlterField(
            model_name='contentitem',
            name='content_type',
            field=models.CharField(choices=[('learning', 'Learning'), ('reading', 'Reading'), ('movement', 'Movement'), ('creative', 'Creative'), ('reflection', 'Reflection'), ('entertainment', 'Entertainment'), ('documentary', 'Documentary'), ('customization', 'Customization'), ('mascot_item', 'Mascot item')], max_length=24),
        ),
    ]
