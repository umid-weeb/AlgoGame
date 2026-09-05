from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.shortcuts import get_object_or_404
from django.db import transaction

from accounts.models import User
from content.models import Course, Module, Lesson, Level
from billing.models import Enrollment, Transaction
from progress.models import UserLevelProgress, UserLevelSubmission

from .serializers import (
    UserSerializer, UserRegistrationSerializer,
    CourseListSerializer, CourseDetailSerializer, ModuleSerializer, LessonSerializer, LevelDetailSerializer,
    EnrollmentSerializer, TransactionSerializer,
    UserLevelProgressSerializer, UserLevelSubmissionSerializer
)
from .permissions import CanAccessLevel, IsOwnerOrReadOnly


# ==================== Auth Views ====================

class RegisterView(APIView):
    """User registration endpoint."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==================== User ViewSets ====================

class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for user management."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return User.objects.all()
        return User.objects.filter(pk=self.request.user.pk)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user profile."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


# ==================== Course ViewSets ====================

class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for courses."""
    queryset = Course.objects.filter(is_published=True)
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseListSerializer

    @action(detail=True, methods=['get'])
    def hierarchy(self, request, pk=None):
        """Get course hierarchy with module/lesson/level structure."""
        course = self.get_object()
        serializer = CourseDetailSerializer(course)
        return Response(serializer.data)


# ==================== Level ViewSets ====================

class LevelViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for game levels."""
    queryset = Level.objects.filter(is_published=True)
    serializer_class = LevelDetailSerializer
    permission_classes = [CanAccessLevel]

    @action(detail=True, methods=['post'])
    def attempt(self, request, pk=None):
        """Submit a level attempt with user code."""
        level = self.get_object()

        # Check access
        self.check_object_permissions(request, level)

        # Validate request data
        source_code = request.data.get('code', '')
        if not source_code:
            return Response(
                {'error': 'Code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # TODO: Execute code in isolated sandbox
        # For now, we'll create a placeholder submission
        try:
            submission = UserLevelSubmission.objects.create(
                user=request.user,
                level=level,
                level_version=level.version,
                source_code=source_code,
                result='pending',
                steps_used=0,
                lives_remaining=level.max_lives,
                error_log=[]
            )

            serializer = UserLevelSubmissionSerializer(submission)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# ==================== Enrollment ViewSets ====================

class EnrollmentViewSet(viewsets.ModelViewSet):
    """ViewSet for course enrollments."""
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Enrollment.objects.all()
        return Enrollment.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ==================== Progress ViewSets ====================

class UserLevelProgressViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for user level progress."""
    serializer_class = UserLevelProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserLevelProgress.objects.filter(user=self.request.user)


class UserLevelSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for user level submissions."""
    serializer_class = UserLevelSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserLevelSubmission.objects.filter(user=self.request.user)
