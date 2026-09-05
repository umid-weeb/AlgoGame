from django.db import models


class Course(models.Model):
    """Educational course containing modules and lessons."""
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cover_image = models.ImageField(upload_to="courses/", blank=True, null=True)
    is_published = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]
        verbose_name = "Course"
        verbose_name_plural = "Courses"

    def __str__(self):
        return self.title


class Module(models.Model):
    """Module grouping lessons within a course."""
    course = models.ForeignKey(Course, related_name="modules", on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]
        verbose_name = "Module"
        verbose_name_plural = "Modules"
        unique_together = ("course", "order")

    def __str__(self):
        return f"{self.course.title} / {self.title}"


class Lesson(models.Model):
    """Lesson containing playable levels."""
    module = models.ForeignKey(Module, related_name="lessons", on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]
        verbose_name = "Lesson"
        verbose_name_plural = "Lessons"
        unique_together = ("module", "order")

    def __str__(self):
        return self.title


class Level(models.Model):
    """Playable game level with grid configuration and objectives."""
    lesson = models.ForeignKey(Lesson, related_name="levels", on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    version = models.PositiveIntegerField(default=1)
    schema_version = models.CharField(max_length=10, default="1.0")

    # World/Grid definition
    grid_cells = models.JSONField(
        default=list,
        help_text="Array of cells: [{x, y, type}, ...]"
    )

    # Drone initial state
    drone_start_x = models.IntegerField(default=0)
    drone_start_y = models.IntegerField(default=0)
    drone_start_facing = models.CharField(
        max_length=10,
        choices=[("north", "North"), ("south", "South"), ("east", "East"), ("west", "West")],
        default="east",
    )

    # Available game functions
    available_functions = models.JSONField(
        default=list,
        help_text="List of available game functions: ['move', 'harvest', 'shoot', ...]"
    )

    # Starter/template code
    starter_code = models.TextField(blank=True)

    # Win condition
    win_condition = models.JSONField(
        help_text="{type: 'all_wheat_harvested' | 'all_bombs_destroyed' | 'reach_position' | 'survive_n_steps'}"
    )

    # Game constraints
    max_lives = models.PositiveSmallIntegerField(default=3)
    max_steps = models.PositiveIntegerField(default=200)

    # Scoring
    stars_thresholds = models.JSONField(
        default=dict,
        blank=True,
        help_text="{steps: stars} e.g., {'10': 3, '20': 2, '50': 1}"
    )

    # Publishing
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]
        verbose_name = "Level"
        verbose_name_plural = "Levels"
        unique_together = ("lesson", "order")

    def __str__(self):
        return f"{self.lesson.title} / {self.title}"
