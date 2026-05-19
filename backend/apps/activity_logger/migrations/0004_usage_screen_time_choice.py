from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('activity_logger', '0003_parentoverridelog'),
    ]

    operations = [
        migrations.AlterField(
            model_name='usagesession',
            name='session_type',
            field=models.CharField(
                choices=[
                    ('learning', 'Learning'),
                    ('reading', 'Reading'),
                    ('movement', 'Movement'),
                    ('creative', 'Creative'),
                    ('reflection', 'Reflection'),
                    ('entertainment', 'Entertainment'),
                    ('documentary', 'Documentary'),
                    ('customization', 'Customization'),
                    ('screen_time', 'Screen time'),
                    ('blocked', 'Blocked'),
                ],
                max_length=20,
            ),
        ),
    ]
