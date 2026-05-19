import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Root Custom User representation separating accounts into system roles.
    """
    class Role(models.TextChoices):
        PARENT = 'PARENT', 'Parent'
        CHILD = 'CHILD', 'Child'
        ADMIN = 'ADMIN', 'Admin'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(
        max_length=10, 
        choices=Role.choices, 
        default=Role.PARENT
    )
    consent_status = models.BooleanField(default=False)
    consent_timestamp = models.DateTimeField(null=True, blank=True)
    avatar_id = models.CharField(max_length=80, default='parent-mint')
    parent_pin_hash = models.CharField(max_length=128, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.username} ({self.role})"
