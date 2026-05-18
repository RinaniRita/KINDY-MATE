from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0002_user_consent'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='avatar_id',
            field=models.CharField(default='parent-mint', max_length=80),
        ),
    ]
