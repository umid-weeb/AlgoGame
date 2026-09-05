from django.contrib import admin
from django.db import models
from django_json_widget.widgets import JSONEditorWidget

from .models import AIProviderConfig, GeneratedChallenge


@admin.register(AIProviderConfig)
class AIProviderConfigAdmin(admin.ModelAdmin):
    list_display = ('name', 'provider', 'model', 'enabled', 'api_key_env', 'updated_at')
    list_filter = ('provider', 'enabled')
    search_fields = ('name', 'model', 'api_key_env')
    fieldsets = (
        ('Provider', {'fields': ('name', 'provider', 'enabled', 'model', 'base_url')}),
        ('Secret reference', {'fields': ('api_key_env',), 'description': 'The secret stays in backend/.env or a deployment secret manager.'}),
        ('Generation policy', {'fields': ('system_prompt', 'max_output_tokens', 'temperature')}),
    )
    readonly_fields = ('updated_at',)


@admin.register(GeneratedChallenge)
class GeneratedChallengeAdmin(admin.ModelAdmin):
    list_display = ('title', 'topic', 'difficulty', 'status', 'provider', 'created_by', 'created_at')
    list_filter = ('status', 'topic', 'difficulty', 'provider')
    search_fields = ('title', 'prompt', 'topic')
    readonly_fields = ('created_at', 'reviewed_at', 'created_by', 'provider', 'model')
    fieldsets = (
        ('Review', {'fields': ('title', 'topic', 'difficulty', 'status', 'prompt')}),
        ('Generated level', {'fields': ('payload', 'validation_errors'), 'classes': ('wide',)}),
        ('Metadata', {'fields': ('provider', 'model', 'created_by', 'created_at', 'reviewed_at')}),
    )
    formfield_overrides = {models.JSONField: {'widget': JSONEditorWidget}}
