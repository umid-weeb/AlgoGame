from rest_framework import serializers
from accounts.models import User
from content.models import Course, Module, Lesson, Level
from billing.models import Transaction, Enrollment
from progress.models import UserLevelProgress, UserLevelSubmission


# ==================== Account Serializers ====================

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'telegram_username', 'avatar', 'bio')
        read_only_fields = ('id',)


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm', 'first_name', 'last_name')

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


# ==================== Content Serializers ====================

class LevelDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = (
            'id', 'title', 'description', 'version', 'grid_cells', 'drone_start_x', 'drone_start_y',
            'drone_start_facing', 'available_functions', 'starter_code', 'win_condition',
            'max_lives', 'max_steps', 'stars_thresholds'
        )
        read_only_fields = ('id', 'version')


class LevelListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = ('id', 'title', 'order', 'is_published')
        read_only_fields = ('id',)


class LessonSerializer(serializers.ModelSerializer):
    levels = LevelListSerializer(many=True, read_only=True)

    class Meta:
        model = Lesson
        fields = ('id', 'title', 'description', 'order', 'levels')
        read_only_fields = ('id',)


class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ('id', 'title', 'description', 'order', 'lessons')
        read_only_fields = ('id',)


class CourseDetailSerializer(serializers.ModelSerializer):
    modules = ModuleSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = (
            'id', 'title', 'slug', 'description', 'price', 'cover_image',
            'is_published', 'order', 'created_at', 'modules'
        )
        read_only_fields = ('id', 'created_at')


class CourseListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ('id', 'title', 'slug', 'price', 'cover_image', 'is_published', 'order')
        read_only_fields = ('id',)


# ==================== Billing Serializers ====================

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ('id', 'user', 'amount', 'provider', 'status', 'created_at')
        read_only_fields = ('id', 'created_at')


class EnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = ('id', 'user', 'course', 'transaction', 'enrolled_at')
        read_only_fields = ('id', 'enrolled_at')


# ==================== Progress Serializers ====================

class UserLevelProgressSerializer(serializers.ModelSerializer):
    level_title = serializers.CharField(source='level.title', read_only=True)

    class Meta:
        model = UserLevelProgress
        fields = ('id', 'level', 'level_title', 'status', 'attempts', 'stars', 'best_steps', 'updated_at')
        read_only_fields = ('id', 'updated_at')


class UserLevelSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserLevelSubmission
        fields = (
            'id', 'user', 'level', 'level_version', 'result', 'steps_used',
            'lives_remaining', 'stars_earned', 'execution_time_ms', 'submitted_at'
        )
        read_only_fields = ('id', 'user', 'submitted_at')
