import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gamification', '0001_initial'),
        ('learning', '0002_content_mission_metadata'),
        ('profiles', '0002_professional_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='rewardtransaction',
            name='source_type',
            field=models.CharField(default='system', max_length=40),
        ),
        migrations.CreateModel(
            name='MascotItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120)),
                ('item_type', models.CharField(choices=[('outfit', 'Outfit'), ('accessory', 'Accessory'), ('background', 'Background'), ('room', 'Room'), ('badge', 'Badge')], max_length=24)),
                ('age_min', models.PositiveSmallIntegerField(default=5)),
                ('age_max', models.PositiveSmallIntegerField(default=9)),
                ('points_cost', models.PositiveSmallIntegerField(default=6)),
                ('image_url', models.CharField(blank=True, max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('is_random_reward', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['item_type', 'name']},
        ),
        migrations.CreateModel(
            name='RewardItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=160)),
                ('description', models.TextField(blank=True)),
                ('reward_type', models.CharField(choices=[('entertainment', 'Entertainment'), ('documentary', 'Documentary'), ('mascot_item', 'Mascot item')], max_length=24)),
                ('points_cost', models.PositiveSmallIntegerField(default=5)),
                ('duration_minutes', models.PositiveSmallIntegerField(default=0)),
                ('approval_status', models.CharField(choices=[('approved', 'Approved'), ('pending', 'Pending'), ('blocked', 'Blocked')], default='approved', max_length=12)),
                ('active', models.BooleanField(default=True)),
                ('demo_only', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('content_item', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reward_items', to='learning.contentitem')),
            ],
            options={'ordering': ['reward_type', 'title']},
        ),
        migrations.CreateModel(
            name='ChildMascotInventory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('unlocked_at', models.DateTimeField(auto_now_add=True)),
                ('child', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='mascot_inventory', to='profiles.childprofile')),
                ('item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='child_inventory', to='gamification.mascotitem')),
                ('source_transaction', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='mascot_unlocks', to='gamification.rewardtransaction')),
            ],
            options={'ordering': ['-unlocked_at'], 'unique_together': {('child', 'item')}},
        ),
    ]
