from django.db import models

class RewardWallet(models.Model):
    child = models.OneToOneField(
        'profiles.ChildProfile',
        on_delete=models.CASCADE,
        related_name='wallet',
    )
    points_balance = models.IntegerField(default=0)
    points_earned_total = models.PositiveIntegerField(default=0)
    points_spent_total = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.child.nickname}: {self.points_balance} pts'


class RewardTransaction(models.Model):
    class TransactionType(models.TextChoices):
        EARN = 'earn', 'Earn'
        SPEND = 'spend', 'Spend'
        ADJUST = 'adjust', 'Adjust'
        BLOCKED = 'blocked', 'Blocked'

    child = models.ForeignKey(
        'profiles.ChildProfile',
        on_delete=models.CASCADE,
        related_name='reward_transactions',
    )
    transaction_type = models.CharField(max_length=12, choices=TransactionType.choices)
    points_amount = models.IntegerField()
    reason = models.CharField(max_length=255)
    source_type = models.CharField(max_length=40, default='system')
    content = models.ForeignKey(
        'learning.ContentItem',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reward_transactions',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.transaction_type} {self.points_amount} for {self.child.nickname}'


class RewardItem(models.Model):
    class RewardType(models.TextChoices):
        ENTERTAINMENT = 'entertainment', 'Entertainment'
        DOCUMENTARY = 'documentary', 'Documentary'
        MASCOT_ITEM = 'mascot_item', 'Mascot item'

    class ApprovalStatus(models.TextChoices):
        APPROVED = 'approved', 'Approved'
        PENDING = 'pending', 'Pending'
        BLOCKED = 'blocked', 'Blocked'

    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    reward_type = models.CharField(max_length=24, choices=RewardType.choices)
    points_cost = models.PositiveSmallIntegerField(default=5)
    duration_minutes = models.PositiveSmallIntegerField(default=0)
    content_item = models.ForeignKey(
        'learning.ContentItem',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reward_items',
    )
    approval_status = models.CharField(
        max_length=12,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.APPROVED,
    )
    active = models.BooleanField(default=True)
    demo_only = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['reward_type', 'title']

    def __str__(self):
        return self.title


class MascotItem(models.Model):
    class ItemType(models.TextChoices):
        OUTFIT = 'outfit', 'Outfit'
        ACCESSORY = 'accessory', 'Accessory'
        BACKGROUND = 'background', 'Background'
        ROOM = 'room', 'Room'
        BADGE = 'badge', 'Badge'

    name = models.CharField(max_length=120)
    item_type = models.CharField(max_length=24, choices=ItemType.choices)
    age_min = models.PositiveSmallIntegerField(default=5)
    age_max = models.PositiveSmallIntegerField(default=9)
    points_cost = models.PositiveSmallIntegerField(default=6)
    image_url = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    is_random_reward = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['item_type', 'name']

    def __str__(self):
        return self.name


class ChildMascotInventory(models.Model):
    child = models.ForeignKey(
        'profiles.ChildProfile',
        on_delete=models.CASCADE,
        related_name='mascot_inventory',
    )
    item = models.ForeignKey(MascotItem, on_delete=models.CASCADE, related_name='child_inventory')
    source_transaction = models.ForeignKey(
        RewardTransaction,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='mascot_unlocks',
    )
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['child', 'item']
        ordering = ['-unlocked_at']

    def __str__(self):
        return f'{self.child.nickname} unlocked {self.item.name}'
