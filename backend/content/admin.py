from django.contrib import admin
from django_json_widget.widgets import JSONEditorWidget
from django.db import models
from .models import Course, Module, Lesson, Level


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    """Admin interface for Course model."""
    list_display = ('title', 'slug', 'price', 'is_published', 'order', 'created_at')
    list_filter = ('is_published', 'created_at')
    search_fields = ('title', 'slug', 'description')
    prepopulated_fields = {'slug': ('title',)}
    ordering = ('order',)
    fields = ('title', 'slug', 'description', 'price', 'cover_image', 'is_published', 'order')


class LessonInline(admin.TabularInline):
    model = Lesson
    fields = ('title', 'order')
    ordering = ('order',)
    extra = 1


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    """Admin interface for Module model."""
    list_display = ('title', 'course', 'order')
    list_filter = ('course',)
    search_fields = ('title',)
    ordering = ('course', 'order')
    inlines = [LessonInline]


class LevelInline(admin.TabularInline):
    model = Level
    fields = ('title', 'version', 'order', 'is_published')
    ordering = ('order',)
    extra = 1


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    """Admin interface for Lesson model."""
    list_display = ('title', 'module', 'order')
    list_filter = ('module__course',)
    search_fields = ('title', 'description')
    ordering = ('module', 'order')
    inlines = [LevelInline]


@admin.register(Level)
class LevelAdmin(admin.ModelAdmin):
    """Admin interface for Level model."""
    list_display = ('title', 'lesson', 'version', 'is_published', 'order')
    list_filter = ('is_published', 'lesson__module__course')
    search_fields = ('title', 'lesson__title')
    ordering = ('lesson', 'order')
    fieldsets = (
        ('Basic Info', {
            'fields': ('lesson', 'title', 'description', 'order', 'version', 'schema_version')
        }),
        ('World Configuration', {
            'fields': ('grid_cells',),
            'classes': ('wide',),
        }),
        ('Drone Setup', {
            'fields': ('drone_start_x', 'drone_start_y', 'drone_start_facing')
        }),
        ('Game Rules', {
            'fields': ('available_functions', 'starter_code', 'win_condition', 'max_lives', 'max_steps', 'stars_thresholds'),
            'classes': ('wide',),
        }),
        ('Publishing', {
            'fields': ('is_published', 'published_at')
        }),
    )
    readonly_fields = ('created_at', 'updated_at')
    formfield_overrides = {
        models.JSONField: {'widget': JSONEditorWidget}
    }
