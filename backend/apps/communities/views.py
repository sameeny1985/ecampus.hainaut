"""
Views for communities (E3) - US-18 to US-27.
"""
from rest_framework import generics, views, status, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Community, Membership, CommunityResource
from .serializers import (
    CommunityListSerializer, CommunityDetailSerializer,
    CommunityCreateSerializer, MembershipSerializer, CommunityResourceSerializer
)
from .permissions import IsCommunityMember, IsCommunityAnimatorOrTeacher


class CommunityListCreateView(generics.ListCreateAPIView):
    """US-18: Liste des communautés + US-21: Créer une communauté"""
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CommunityCreateSerializer
        return CommunityListSerializer

    def get_queryset(self):
        qs = Community.objects.filter(is_active=True)
        search = self.request.query_params.get('q', '').strip()
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(course_code__icontains=search)
        return qs.distinct()

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        # Only teachers or students with animator request can create
        if request.user.role not in ('teacher', 'admin') and request.user.role != 'student':
            return Response(
                {'error': 'Seuls les enseignants et animateurs peuvent créer une communauté.'},
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
    """Détail d'une communauté"""
    serializer_class = CommunityDetailSerializer
    queryset = Community.objects.filter(is_active=True)
    lookup_field = 'id'


class JoinCommunityView(views.APIView):
    """US-19: Rejoindre une communauté"""
    def post(self, request, community_id):
        community = get_object_or_404(Community, id=community_id, is_active=True)
        membership, created = Membership.objects.get_or_create(
            community=community,
            user=request.user,
            defaults={'role': Membership.Role.MEMBER}
        )
        if not created and membership.is_active:
            return Response({'message': 'Vous êtes déjà membre de cette communauté.'})
        membership.is_active = True
        membership.save()
        return Response({
            'message': f'Vous avez rejoint la communauté « {community.name} ».',
            'role': membership.role
        }, status=status.HTTP_200_OK)


class LeaveCommunityView(views.APIView):
    """US-25: Quitter une communauté"""
    def post(self, request, community_id):
        community = get_object_or_404(Community, id=community_id)
        try:
            membership = Membership.objects.get(community=community, user=request.user, is_active=True)
        except Membership.DoesNotExist:
            return Response({'error': 'Vous n\'êtes pas membre de cette communauté.'}, status=status.HTTP_400_BAD_REQUEST)

        if membership.role in (Membership.Role.ANIMATOR, Membership.Role.TEACHER):
            # Check if there is another animator/teacher
            other_admins = Membership.objects.filter(
                community=community,
                role__in=[Membership.Role.ANIMATOR, Membership.Role.TEACHER],
                is_active=True
            ).exclude(user=request.user).exists()
            if not other_admins:
                return Response({
                    'error': 'Vous êtes le dernier animateur/enseignant. Désignez un remplaçant avant de quitter.'
                }, status=status.HTTP_400_BAD_REQUEST)

        membership.is_active = False
        membership.save()
        return Response({'message': f'Vous avez quitté la communauté « {community.name} ».'})


class CommunityMembersView(generics.ListAPIView):
    """US-27: Liste des membres"""
    serializer_class = MembershipSerializer

    def get_queryset(self):
        community = get_object_or_404(Community, id=self.kwargs['community_id'], is_active=True)
        return Membership.objects.filter(
            community=community, is_active=True
        ).select_related('user', 'user__profile').order_by('role', 'joined_at')


class PromoteMemberView(views.APIView):
    """US-26: Nommer un animateur"""
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
    """US-26: Retirer un membre"""
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
        membership.save()
        return Response({'message': f'{membership.user.full_name} a été retiré de la communauté.'})


class CommunityResourcesView(generics.ListCreateAPIView):
    """US-24: Partager un fichier ou un lien"""
    serializer_class = CommunityResourceSerializer

    def get_queryset(self):
        return CommunityResource.objects.filter(
            community_id=self.kwargs['community_id']
        ).select_related('uploaded_by')

    def perform_create(self, serializer):
        community = get_object_or_404(Community, id=self.kwargs['community_id'])
        # Check membership
        if not Membership.objects.filter(community=community, user=self.request.user, is_active=True).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous devez être membre pour ajouter une ressource.")
        serializer.save(community=community, uploaded_by=self.request.user)
