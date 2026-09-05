from django.contrib import admin
from .models import UserLevelProgress, UserLevelSubmission


@admin.register(UserLevelProgress)
class UserLevelProgressAdmin(admin.ModelAdmin):
    """Admin interface for UserLevelProgress model."""
    list_display = ('user', 'level', 'status', 'stars', 'attempts', 'best_steps', 'updated_at')
    list_filter = ('status', 'updated_at', 'level__lesson__module__course')
    search_fields = ('user__username', 'user__email', 'level__title')
    readonly_fields = ('updated_at',)
    ordering = ('-updated_at',)


@admin.register(UserLevelSubmission)
class UserLevelSubmissionAdmin(admin.ModelAdmin):
    """Admin interface for UserLevelSubmission model."""
    list_display = ('user', 'level', 'result', 'stars_earned', 'steps_used', 'submitted_at')
    list_filter = ('result', 'submitted_at', 'level__lesson__module__course')
    search_fields = ('user__username', 'user__email', 'level__title')
    readonly_fields = ('submitted_at', 'source_code', 'error_log')
    ordering = ('-submitted_at',)
    fieldsets = (
        ('Submission', {
            'fields': ('user', 'level', 'level_version')
        }),
        ('Code', {
            'fields': ('source_code',),
            'classes': ('wide', 'monospace'),
        }),
        ('Result', {
            'fields': ('result', 'steps_used', 'lives_remaining', 'stars_earned', 'execution_time_ms')
        }),
        ('Errors', {
            'fields': ('error_log',),
            'classes': ('wide',),
        }),
    )
