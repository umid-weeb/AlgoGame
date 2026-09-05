from django.conf import settings
from django.db import models


class Transaction(models.Model):
    """Payment transaction record."""
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]
    PROVIDER_CHOICES = [("click", "Click"), ("payme", "Payme")]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    provider_transaction_id = models.CharField(max_length=128, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions"

    def __str__(self):
        return f"{self.user} — {self.amount} — {self.status}"


class Enrollment(models.Model):
    """Course enrollment record linking users to courses."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="enrollments", on_delete=models.CASCADE)
    course = models.ForeignKey("content.Course", related_name="enrollments", on_delete=models.CASCADE)
    transaction = models.ForeignKey(Transaction, null=True, blank=True, on_delete=models.SET_NULL)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "course")
        verbose_name = "Enrollment"
        verbose_name_plural = "Enrollments"
        ordering = ["-enrolled_at"]

    def __str__(self):
        return f"{self.user} → {self.course}"
