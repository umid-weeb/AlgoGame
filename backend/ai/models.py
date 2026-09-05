from django.db import models


class AIProviderConfig(models.Model):
    PROVIDERS = (
        ('anthropic', 'Anthropic / Claude'),
        ('openai_compatible', 'OpenAI-compatible / Groq'),
        ('gemini', 'Google Gemini'),
    )

    name = models.CharField(max_length=120, unique=True)
    provider = models.CharField(max_length=30, choices=PROVIDERS, default='anthropic')
    enabled = models.BooleanField(default=False)
    model = models.CharField(max_length=160, default='claude-opus-4-8')
    base_url = models.URLField(blank=True, help_text='Optional provider endpoint override.')
    api_key_env = models.CharField(
        max_length=120,
        default='ANTHROPIC_API_KEY',
        help_text='Environment variable name. Never paste the secret here.',
    )
    system_prompt = models.TextField(blank=True)
    max_output_tokens = models.PositiveIntegerField(default=3000)
    temperature = models.FloatField(default=0.3)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'AI provider configuration'
        verbose_name_plural = 'AI provider configurations'

    def __str__(self):
        return f'{self.name} ({self.provider}, {self.model})'


class GeneratedChallenge(models.Model):
    STATUSES = (
        ('draft', 'Draft'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    title = models.CharField(max_length=255)
    topic = models.CharField(max_length=120, default='loops')
    difficulty = models.CharField(max_length=40, default='beginner')
    prompt = models.TextField()
    payload = models.JSONField(default=dict)
    validation_errors = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUSES, default='draft')
    provider = models.CharField(max_length=40, blank=True)
    model = models.CharField(max_length=160, blank=True)
    created_by = models.ForeignKey('accounts.User', null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return f'{self.title} [{self.status}]'
