from django.conf import settings
from django.db import models


class UserLevelProgress(models.Model):
    """Tracks user progress through levels."""
    STATUS_CHOICES = [
        ("locked", "Locked"),
        ("unlocked", "Unlocked"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="level_progress", on_delete=models.CASCADE)
    level = models.ForeignKey("content.Level", related_name="user_progress", on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="locked")
    last_code = models.TextField(blank=True)
    attempts = models.PositiveIntegerField(default=0)
    stars = models.PositiveSmallIntegerField(default=0)
    best_steps = models.PositiveIntegerField(null=True, blank=True)
    best_lives_remaining = models.PositiveSmallIntegerField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "level")
        verbose_name = "User Level Progress"
        verbose_name_plural = "User Level Progress"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user} — {self.level} — {self.status}"


class UserLevelSubmission(models.Model):
    """Records each attempt at a level."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="submissions", on_delete=models.CASCADE)
    level = models.ForeignKey("content.Level", related_name="submissions", on_delete=models.CASCADE)
    level_version = models.PositiveIntegerField()
    source_code = models.TextField()
    result = models.CharField(
        max_length=20,
        choices=[("success", "Success"), ("failed", "Failed"), ("timeout", "Timeout")],
    )
    steps_used = models.PositiveIntegerField()
    lives_remaining = models.PositiveSmallIntegerField()
    stars_earned = models.PositiveSmallIntegerField(default=0)
    error_log = models.JSONField(default=list)
    execution_time_ms = models.PositiveIntegerField(default=0)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-submitted_at"]
        verbose_name = "User Level Submission"
        verbose_name_plural = "User Level Submissions"
        indexes = [
            models.Index(fields=["user", "-submitted_at"]),
            models.Index(fields=["level", "-submitted_at"]),
        ]

    def __str__(self):
        return f"{self.user} → {self.level} ({self.result})"
