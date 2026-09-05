from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for User model."""
    fieldsets = BaseUserAdmin.fieldsets + (
        ('DroneCode Profile', {
            'fields': ('phone', 'telegram_username', 'avatar', 'bio')
        }),
    )
    list_display = ('username', 'email', 'telegram_username', 'is_staff', 'created_at')
    search_fields = ('username', 'email', 'phone', 'telegram_username')
    ordering = ('-created_at',)
