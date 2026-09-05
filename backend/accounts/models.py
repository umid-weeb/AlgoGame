from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom User model with additional fields for the DroneCode platform."""
    phone = models.CharField(max_length=20, unique=True, blank=True, null=True)
    telegram_username = models.CharField(max_length=64, blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    bio = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return self.telegram_username or self.username
