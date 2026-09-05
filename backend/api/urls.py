from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    RegisterView, UserViewSet, CourseViewSet, LevelViewSet,
    EnrollmentViewSet, UserLevelProgressViewSet, UserLevelSubmissionViewSet
)

app_name = 'api'

# Create router and register viewsets
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'levels', LevelViewSet, basename='level')
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')
router.register(r'progress', UserLevelProgressViewSet, basename='progress')
router.register(r'submissions', UserLevelSubmissionViewSet, basename='submission')

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('ai/', include('ai.urls', namespace='ai')),

    # Router endpoints
    path('', include(router.urls)),
]
