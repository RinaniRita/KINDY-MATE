from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0003_user_avatar'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='parent_pin_hash',
            field=models.CharField(blank=True, max_length=128),
        ),
    ]
