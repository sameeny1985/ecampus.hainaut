"""
Views for communities (E3) + majors + structured course registration & grading.
"""
from rest_framework import generics, views, status, permissions
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.contrib.auth import get_user_model
from .models import Major, Community, Membership, CommunityResource
from .serializers import (
    MajorSerializer,
    CommunityListSerializer, CommunityDetailSerializer,
    CommunityCreateSerializer, MembershipSerializer,
    CommunityResourceSerializer, GradeUpdateSerializer
)
from .permissions import IsCommunityMember, IsCommunityAnimatorOrTeacher
from apps.notifications.models import Notification
from apps.messaging.cloudinary_utils import upload_file

User = get_user_model()


def _can_manage_community(user, community):
    """بررسی اینکه آیا کاربر کارمند/ادمین است یا استادِ اختصاص‌داده‌شده به همین درس"""
    role = getattr(user, 'role', None)
    if role in ('admin', 'moderator'):
        return True
    if role == 'teacher':
        return Membership.objects.filter(
            community=community,
            user=user,
            role__in=[Membership.Role.TEACHER, Membership.Role.ANIMATOR],
            is_active=True
        ).exists()
    return False


def _notify_course_staff(community, sender, title, message):
    """ارسال نوتیفیکیشن به استاد درس + تمام کارمندان آموزشی و ادمین‌ها"""
    recipients = {}

    # ۱. استادان و انیماتورهای فعال این درس
    course_staff = Membership.objects.filter(
        community=community,
        role__in=[Membership.Role.TEACHER, Membership.Role.ANIMATOR],
        is_active=True
    ).select_related('user')
    for m in course_staff:
        if m.user and m.user != sender:
            recipients[m.user.id] = m.user

    # ۲. تمام کارمندان آموزشی و ادمین‌های فعال سیستم
    admin_staff = User.objects.filter(
        role__in=['admin', 'moderator'],
        is_active=True
    ).exclude(id=sender.id)
    for u in admin_staff:
        recipients[u.id] = u

    for recipient in recipients.values():
        Notification.objects.create(
            recipient=recipient,
            sender=sender,
            title=title,
            message=message,
            link=f"/courses/{community.id}"
        )


class MajorListView(generics.ListAPIView):
    """لیست تمام رشته‌های فعال دانشگاه"""
    serializer_class = MajorSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Major.objects.filter(is_active=True).annotate(
        courses_count=Count('courses', filter=Q(courses__is_active=True))
    )


class CommunityListCreateView(generics.ListCreateAPIView):
    """
    لیست دروس + ایجاد درس منحصراً توسط کارمند آموزشی / ادمین
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
        if getattr(request.user, 'role', None) not in ('admin', 'moderator'):
            return Response(
                {'error': 'Seul le personnel administratif peut créer un cours.'},
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
    """ثبت‌نام دانشجو در درس + اطلاع‌رسانی به استاد و کارمندان"""
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

        student_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email
        _notify_course_staff(
            community=community,
            sender=request.user,
            title=f"Nouvelle inscription : {community.name}",
            message=f"L'étudiant {student_name} s'est inscrit au cours."
        )

        return Response({
            'message': f'Inscription réussie au cours « {community.name} ».',
            'role': membership.role,
            'status': membership.status
        }, status=status.HTTP_200_OK)


class LeaveCommunityView(views.APIView):
    """انصراف دانشجو از درس + اطلاع‌رسانی به استاد و کارمندان"""
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
        _notify_course_staff(
            community=community,
            sender=request.user,
            title=f"Désinscription : {community.name}",
            message=f"L'étudiant {student_name} s'est désinscrit du cours."
        )

        return Response({
            'message': f'Vous avez quitté le cours « {community.name} ».',
            'status': membership.status
        })


class CommunityMembersView(generics.ListAPIView):
    """لیست دانشجویان ثبت‌نام‌شده در یک درس (فقط برای استاد همان درس و کارمند/ادمین)"""
    serializer_class = MembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        community = get_object_or_404(Community, id=self.kwargs['community_id'], is_active=True)

        if _can_manage_community(self.request.user, community):
            qs = Membership.objects.filter(community=community).filter(
                Q(is_active=True) | Q(status=Membership.EnrollmentStatus.DROPPED)
            )
            return qs.select_related('user', 'user__profile', 'community', 'community__major', 'graded_by').order_by('role', '-is_active', 'joined_at')

        return Membership.objects.filter(
            community=community,
            is_active=True,
            role__in=[Membership.Role.TEACHER, Membership.Role.ANIMATOR]
        ).select_related('user', 'user__profile', 'community', 'community__major').order_by('role', 'joined_at')


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
    استاد همان درس یا کارمند وضعیت و نمره دانشجو را تنظیم می‌کند
    POST /api/communities/<id>/members/<user_id>/grade/
    body: { "status": "completed"|"failed"|"passed"|"in_progress"|"enrolled", "grade": 14.5, "grade_comment": "..." }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, community_id, user_id):
        community = get_object_or_404(Community, id=community_id)
        if not _can_manage_community(request.user, community):
            return Response(
                {'error': 'Seuls l\'enseignant de ce cours et le personnel administratif peuvent noter.'},
                status=status.HTTP_403_FORBIDDEN
            )

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

        status_labels = {
            'completed': 'Terminé',
            'failed': 'Refusé',
            'passed': 'Validé / Réussi',
            'in_progress': 'En cours',
            'enrolled': 'Inscrit',
        }
        status_text = status_labels.get(membership.status, membership.get_status_display())
        grade_part = f" — Note : {membership.grade}/20" if membership.grade is not None else ""
        student_name = f"{membership.user.first_name} {membership.user.last_name}".strip() or membership.user.email

        if membership.user != request.user:
            Notification.objects.create(
                recipient=membership.user,
                sender=request.user,
                title=f"Évaluation mise à jour : {community.name}",
                message=f"Statut : {status_text}{grade_part}",
                link="/dashboard"
            )

        if membership.status in (Membership.EnrollmentStatus.COMPLETED, Membership.EnrollmentStatus.FAILED):
            staff_recipients = User.objects.filter(
                role__in=['moderator', 'admin'],
                is_active=True
            ).exclude(id=request.user.id)
            for staff in staff_recipients:
                Notification.objects.create(
                    recipient=staff,
                    sender=request.user,
                    title=f"Statut {status_text} : {community.name}",
                    message=f"L'étudiant {student_name} a reçu le statut « {status_text} »{grade_part}.",
                    link=f"/courses/{community.id}"
                )

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
            if getattr(user, 'role', None) not in ('admin', 'moderator'):
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
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        community = get_object_or_404(Community, id=self.kwargs['community_id'], is_active=True)
        return CommunityResource.objects.filter(community=community)

    def create(self, request, *args, **kwargs):
        community = get_object_or_404(Community, id=self.kwargs['community_id'], is_active=True)
        if not _can_manage_community(request.user, community):
            return Response(
                {'error': 'Seuls l\'enseignant de ce cours et le personnel peuvent ajouter des ressources.'},
                status=status.HTTP_403_FORBIDDEN
            )

        title = request.data.get('title', '').strip()
        link = request.data.get('link', '').strip()
        uploaded_file = request.FILES.get('file')

        if not title:
            return Response({'error': 'Le titre du document est obligatoire.'}, status=status.HTTP_400_BAD_REQUEST)

        if not uploaded_file and not link:
            return Response({'error': 'Veuillez sélectionner un fichier ou fournir un lien.'}, status=status.HTTP_400_BAD_REQUEST)

        final_link = link
        if uploaded_file:
            cloud_url = upload_file(uploaded_file, folder='course_resources')
            if not cloud_url:
                return Response({'error': 'Échec du téléversement du fichier sur le serveur.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            final_link = cloud_url

        resource = CommunityResource.objects.create(
            community=community,
            uploaded_by=request.user,
            title=title,
            link=final_link
        )

        uploader_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email
        students = Membership.objects.filter(
            community=community,
            role=Membership.Role.MEMBER,
            is_active=True
        ).exclude(user=request.user).select_related('user')

        for member in students:
            Notification.objects.create(
                recipient=member.user,
                sender=request.user,
                title=f"Nouvelle ressource : {community.name}",
                message=f"{uploader_name} a ajouté « {resource.title} ».",
                link=f"/courses/{community.id}"
            )

        return Response(
            CommunityResourceSerializer(resource, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class CommunityResourceDeleteView(views.APIView):
    """حذف جزوه/منبع از درس توسط استاد همان درس یا کارمند"""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, community_id, resource_id):
        community = get_object_or_404(Community, id=community_id, is_active=True)
        if not _can_manage_community(request.user, community):
            return Response(
                {'error': 'Permission refusée.'},
                status=status.HTTP_403_FORBIDDEN
            )
        resource = get_object_or_404(CommunityResource, id=resource_id, community=community)
        resource.delete()
        return Response({'message': 'Ressource supprimée.'}, status=status.HTTP_200_OK)


class TeacherListView(generics.ListAPIView):
    """لیست تمام اساتید فعال برای انتخاب هنگام ایجاد درس"""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        teachers = User.objects.filter(role='teacher', is_active=True).order_by('last_name', 'first_name')
        data = [
            {
                'id': str(t.id),
                'full_name': f"{t.first_name} {t.last_name}".strip() or t.email,
                'email': t.email,
            }
            for t in teachers
        ]
        return Response(data)


class DeleteCommunityView(views.APIView):
    """حذف (غیرفعال‌سازی) درس منحصراً توسط ادمین یا کارمند آموزشی"""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, community_id):
        community = get_object_or_404(Community, id=community_id, is_active=True)

        if getattr(request.user, 'role', None) not in ('admin', 'moderator'):
            return Response(
                {'error': 'Seul le personnel administratif peut supprimer un cours.'},
                status=status.HTTP_403_FORBIDDEN
            )

        community.is_active = False
        community.save(update_fields=['is_active'])
        return Response({'message': f'Le cours « {community.name} » a été supprimé.'}, status=status.HTTP_200_OK)


class StudentListView(generics.ListAPIView):
    """لیست تمام دانشجویان فعال برای پنل کارمند و مدریتور"""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        if getattr(request.user, 'role', None) not in ('admin', 'moderator'):
            return Response(
                {'error': 'Accès réservé au personnel administratif.'},
                status=status.HTTP_403_FORBIDDEN
            )

        students = User.objects.filter(is_active=True).exclude(
            role__in=['teacher', 'admin', 'moderator']
        ).order_by('last_name', 'first_name')

        data = [
            {
                'id': str(s.id),
                'full_name': f"{s.first_name} {s.last_name}".strip() or s.email,
                'email': s.email,
            }
            for s in students
        ]
        return Response(data)
