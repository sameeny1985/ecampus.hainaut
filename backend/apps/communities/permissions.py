from rest_framework import permissions
from .models import Membership


class IsCommunityMember(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        community = obj if hasattr(obj, 'memberships') else getattr(obj, 'community', None)
        if community is None:
            return False
        return Membership.objects.filter(
            community=community, user=request.user, is_active=True
        ).exists()


class IsCommunityAnimatorOrTeacher(permissions.BasePermission):
    def has_permission(self, request, view):
        community_id = view.kwargs.get('community_id')
        if not community_id:
            return False
        return Membership.objects.filter(
            community_id=community_id,
            user=request.user,
            is_active=True,
            role__in=[Membership.Role.ANIMATOR, Membership.Role.TEACHER]
        ).exists() or request.user.role == 'admin'
