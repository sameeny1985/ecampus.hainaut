"""
Views for communities (E3) + majors + structured course registration & grading.
"""
from rest_framework import generics, views, status, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from .models import Major, Community, Membership, CommunityResource
from .serializers import (
    MajorSerializer,
    CommunityListSerializer, CommunityDetailSerializer,
    CommunityCreateSerializer, MembershipSerializer,
    CommunityResourceSerializer, GradeUpdateSerializer
)
from .permissions import IsCommunityMember, IsCommunityAnimatorOrTeacher
from apps.notifications.models import Notification


class MajorListView(generics.ListAPIView):
    """لیست تمام رشته‌های فعال دانشگاه"""
    serializer_class = MajorSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Major.objects.filter(is_active=True).annotate(
        courses_count=Count('courses', filter=Q(courses__is_active=True))
    )


class CommunityListCreateView(generics.ListCreateAPIView):
    """
    لیست دروس + ایجاد درس توسط کارمند/استاد
    فیلتر: ?major=<uuid>&year=1|2|3&q=search
    """
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CommunityCreateSerializer
        return CommunityListSerializer

    def get_queryset(self):
        qs = Community.objects.filter(is_active=True).select_related('major')
        major_id = self.request.query_params.get('major')
        year = self.request.query_params.get('year')
        search = self.request.query_params.get('q', '').strip()

        if major_id:
            qs = qs.filter(major_id=major_id)
        if year:
            try:
                qs = qs.filter(year=int(year))
            except (ValueError, TypeError):
                pass
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(course_code__icontains=search) |
                Q(description__icontains=search)
            )
        return qs.distinct()

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        if request.user.role not in ('teacher', 'admin', 'moderator'):
            return Response(
                {'error': 'Seuls les enseignants et le personnel peuvent créer un cours.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        community = serializer.save()
        return Response(
            CommunityDetailSerializer(community, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class CommunityDetailView(generics.RetrieveAPIView):
    serializer_class = CommunityDetailSerializer
    queryset = Community.objects.filter(is_active=True).select_related('major', 'created_by')
    lookup_field = 'id'
    permission_classes = [permissions.IsAuthenticated]


class JoinCommunityView(views.APIView):
    """ثبت‌نام دانشجو در درس"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, community_id):
        community = get_object_or_404(Community, id=community_id, is_active=True)
        membership, created = Membership.objects.get_or_create(
            community=community,
            user=request.user,
            defaults={
                'role': Membership.Role.MEMBER,
                'status': Membership.EnrollmentStatus.ENROLLED
            }
        )
        if not created and membership.is_active:
            return Response({
                'message': 'Vous êtes déjà inscrit à ce cours.',
                'status': membership.status
            })
        membership.is_active = True
        membership.status = Membership.EnrollmentStatus.ENROLLED
        membership.role = Membership.Role.MEMBER
        membership.save()
        return Response({
            'message': f'Inscription réussie au cours « {community.name} ».',
            'role': membership.role,
            'status': membership.status
        }, status=status.HTTP_200_OK)


class LeaveCommunityView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, community_id):
        community = get_object_or_404(Community, id=community_id)
        try:
            membership = Membership.objects.get(community=community, user=request.user, is_active=True)
        except Membership.DoesNotExist:
            return Response(
                {'error': 'Vous n\'êtes pas inscrit à ce cours.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if membership.role in (Membership.Role.ANIMATOR, Membership.Role.TEACHER):
            other_admins = Membership.objects.filter(
                community=community,
                role__in=[Membership.Role.ANIMATOR, Membership.Role.TEACHER],
                is_active=True
            ).exclude(user=request.user).exists()
            if not other_admins:
                return Response({
                    'error': 'Vous êtes le dernier enseignant. Désignez un remplaçant avant de quitter.'
                }, status=status.HTTP_400_BAD_REQUEST)

        membership.is_active = False
        membership.status = Membership.EnrollmentStatus.DROPPED
        membership.save()

        student_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email
        staff_members = Membership.objects.filter(
            community=community,
            role__in=[Membership.Role.TEACHER, Membership.Role.ANIMATOR],
            is_active=True
        ).exclude(user=request.user)

        notified_ids = set()
        for staff in staff_members:
            notified_ids.add(staff.user_id)
            Notification.objects.create(
                recipient=staff.user,
                sender=request.user,
                title=f"Désinscription : {community.name}",
                message=f"L'étudiant {student_name} s'est désinscrit du cours.",
                link=f"/courses/{community.id}"
            )

        if community.created_by and community.created_by_id not in notified_ids and community.created_by != request.user:
            Notification.objects.create(
                recipient=community.created_by,
                sender=request.user,
                title=f"Désinscription : {community.name}",
                message=f"L'étudiant {student_name} s'est désinscrit du cours.",
                link=f"/courses/{community.id}"
            )

        return Response({
            'message': f'Vous avez quitté le cours « {community.name} ».',
            'status': membership.status
        })


class CommunityMembersView(generics.ListAPIView):
    """لیست دانشجویان ثبت‌نام‌شده در یک درس (برای استاد/کارمند)"""
    serializer_class = MembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        community = get_object_or_404(Community, id=self.kwargs['community_id'], is_active=True)
        qs = Membership.objects.filter(community=community)
        if getattr(self.request.user, 'role', None) not in ('teacher', 'admin', 'moderator'):
            qs = qs.filter(is_active=True)
        else:
            qs = qs.filter(Q(is_active=True) | Q(status=Membership.EnrollmentStatus.DROPPED))

        return qs.select_related('user', 'user__profile', 'community', 'community__major', 'graded_by').order_by('role', '-is_active', 'joined_at')


class PromoteMemberView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsCommunityAnimatorOrTeacher]

    def post(self, request, community_id, user_id):
        community = get_object_or_404(Community, id=community_id)
        try:
            membership = Membership.objects.get(community=community, user_id=user_id, is_active=True)
        except Membership.DoesNotExist:
            return Response({'error': 'Membre introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        new_role = request.data.get('role', Membership.Role.ANIMATOR)
        if new_role not in dict(Membership.Role.choices):
            return Response({'error': 'Rôle invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        membership.role = new_role
        membership.save()
        return Response({
            'message': f'{membership.user.full_name} est maintenant {membership.get_role_display()}.',
            'role': membership.role
        })


class BanMemberView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsCommunityAnimatorOrTeacher]

    def post(self, request, community_id, user_id):
        community = get_object_or_404(Community, id=community_id)
        try:
            membership = Membership.objects.get(community=community, user_id=user_id, is_active=True)
        except Membership.DoesNotExist:
            return Response({'error': 'Membre introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if membership.user == request.user:
            return Response({'error': 'Vous ne pouvez pas vous retirer vous-même de cette façon.'}, status=status.HTTP_400_BAD_REQUEST)

        membership.is_active = False
        membership.status = Membership.EnrollmentStatus.DROPPED
        membership.save()
        return Response({'message': f'{membership.user.full_name} a été retiré du cours.'})


class GradeMemberView(views.APIView):
    """
    استاد یا کارمند وضعیت و نمره دانشجو را تنظیم می‌کند
    POST /api/communities/<id>/members/<user_id>/grade/
    body: { "status": "passed"|"failed"|"in_progress"|"enrolled", "grade": 14.5, "grade_comment": "..." }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, community_id, user_id):
        if request.user.role not in ('teacher', 'admin', 'moderator'):
            return Response(
                {'error': 'Seuls les enseignants et le personnel peuvent noter.'},
                status=status.HTTP_403_FORBIDDEN
            )
        community = get_object_or_404(Community, id=community_id)
        try:
            membership = Membership.objects.get(community=community, user_id=user_id, is_active=True)
        except Membership.DoesNotExist:
            return Response({'error': 'Inscription introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = GradeUpdateSerializer(
            membership,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MembershipSerializer(membership, context={'request': request}).data)


class StudentEnrollmentsView(generics.ListAPIView):
    """
    لیست تمام دروس یک دانشجو (برای خودش یا برای کارمند)
    GET /api/communities/enrollments/?user=<uuid>
    """
    serializer_class = MembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        target_user_id = self.request.query_params.get('user')

        if target_user_id:
            if user.role not in ('teacher', 'admin', 'moderator'):
                return Membership.objects.none()
            return Membership.objects.filter(
                user_id=target_user_id,
                is_active=True,
                role=Membership.Role.MEMBER
            ).select_related('community', 'community__major', 'user', 'graded_by').order_by(
                'community__major__order', 'community__year', 'community__name'
            )

        return Membership.objects.filter(
            user=user,
            is_active=True
        ).select_related('community', 'community__major', 'graded_by').order_by(
            'community__major__order', 'community__year', 'community__name'
        )


class CommunityResourcesView(generics.ListCreateAPIView):
    serializer_class = CommunityResourceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        community = get_object_or_404(Community, id=self.kwargs['community_id'], is_active=True)
        return CommunityResource.objects.filter(community=community)

    def perform_create(self, serializer):
        community = get_object_or_404(Community, id=self.kwargs['community_id'])
        serializer.save(community=community, uploaded_by=self.request.user)
