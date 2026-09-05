from django.contrib import admin
from .models import Transaction, Enrollment


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    """Admin interface for Transaction model."""
    list_display = ('id', 'user', 'amount', 'provider', 'status', 'created_at')
    list_filter = ('status', 'provider', 'created_at')
    search_fields = ('user__username', 'user__email', 'provider_transaction_id')
    readonly_fields = ('provider_transaction_id', 'created_at', 'updated_at')
    ordering = ('-created_at',)


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    """Admin interface for Enrollment model."""
    list_display = ('user', 'course', 'transaction', 'enrolled_at')
    list_filter = ('enrolled_at', 'course')
    search_fields = ('user__username', 'user__email', 'course__title')
    readonly_fields = ('enrolled_at',)
    autocomplete_fields = ('user', 'course')
    ordering = ('-enrolled_at',)
