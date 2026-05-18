from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='consent_status',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='consent_timestamp',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
