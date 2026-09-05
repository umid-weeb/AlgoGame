from rest_framework.permissions import BasePermission
from content.models import Level


class CanAccessLevel(BasePermission):
    """
    Permission to check if user can access a level.
    Rules:
    - If course is free (price == 0), authenticated users can access
    - If course requires payment, user must have an enrollment
    """

    def has_object_permission(self, request, view, obj):
        """Check if user can access the level."""
        if not request.user.is_authenticated:
            return False

        # obj is a Level instance
        course = obj.lesson.module.course

        # Free course - all authenticated users can access
        if course.price == 0:
            return True

        # Paid course - check for enrollment
        return course.enrollments.filter(user=request.user).exists()


class IsOwnerOrReadOnly(BasePermission):
    """
    Permission allowing owner of an object to edit it, others get read-only access.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions for any request
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        # Write permissions only for the owner
        return obj.user == request.user
