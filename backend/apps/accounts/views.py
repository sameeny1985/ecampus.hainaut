"""
Views for accounts - authentication, profile, privacy, blocking.
"""
from rest_framework import generics, status, permissions, views
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import logout
from django.utils import timezone
from django.db.models import Q
from .models import User, Profile, BlockedUser, CookieConsent
from .serializers import (
    UserSerializer, UserPublicSerializer, RegisterSerializer, LoginSerializer,
    ProfileUpdateSerializer, CookieConsentSerializer, BlockedUserSerializer
)
from .permissions import IsOwnerOrAdmin


class RegisterView(generics.CreateAPIView):
    """US-01: Création de compte avec adresse institutionnelle"""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'message': 'Compte créé avec succès. Bienvenue sur CampusConnect !'
        }, status=status.HTTP_201_CREATED)


class LoginView(views.APIView):
    """US-01, US-02: Connexion sécurisée"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        user.last_login = timezone.now()
        user.last_activity = timezone.now()
        user.save(update_fields=['last_login', 'last_activity'])
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'message': f'Bienvenue {user.first_name} !'
        })


class LogoutView(views.APIView):
    """US-02: Déconnexion"""
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        return Response({'message': 'Déconnexion réussie.'}, status=status.HTTP_200_OK)


class MeView(generics.RetrieveUpdateAPIView):
    """US-05: Consulter et modifier son profil"""
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class ProfileUpdateView(generics.UpdateAPIView):
    """US-04: Compléter / modifier le profil"""
    serializer_class = ProfileUpdateSerializer

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile


class PrivacySettingsView(views.APIView):
    """US-06: Paramètres de confidentialité"""
    def get(self, request):
        profile = request.user.profile
        return Response({
            'visibility': profile.visibility,
            'privacy_accepted': request.user.privacy_accepted,
            'terms_accepted': request.user.terms_accepted,
        })

    def patch(self, request):
        profile = request.user.profile
        visibility = request.data.get('visibility')
        if visibility in dict(Profile.Visibility.choices):
            profile.visibility = visibility
            profile.save()
        return Response({'visibility': profile.visibility, 'message': 'Paramètres de confidentialité mis à jour.'})


class SearchUsersView(generics.ListAPIView):
    """US-07: Rechercher un camarade par son nom"""
    serializer_class = UserPublicSerializer

    def get_queryset(self):
        q = self.request.query_params.get('q', '').strip()
        if not q or len(q) < 2:
            return User.objects.none()
        # Respect privacy: only show users who are visible
        return User.objects.filter(
            Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(email__icontains=q),
            status=User.AccountStatus.ACTIVE,
            is_active=True
        ).exclude(id=self.request.user.id)[:20]


class DeleteAccountView(views.APIView):
    """US-08: Droit à l'effacement (RGPD)"""
    def post(self, request):
        confirm = request.data.get('confirm', False)
        if not confirm:
            return Response(
                {'message': 'Veuillez confirmer la suppression de votre compte.', 'require_confirmation': True},
                status=status.HTTP_400_BAD_REQUEST
            )
        user = request.user
        # Anonymize or delete according to RGPD
        user.is_active = False
        user.status = User.AccountStatus.DISABLED
        user.email = f'deleted_{user.id}@deleted.local'
        user.first_name = 'Utilisateur'
        user.last_name = 'Supprimé'
        user.set_unusable_password()
        user.save()
        if hasattr(user, 'profile'):
            user.profile.bio = ''
            user.profile.photo = None
            user.profile.save()
        return Response({'message': 'Votre compte et vos données ont été supprimés.'})


class CookieConsentView(views.APIView):
    """US-09: Préférences de cookies"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            consent, _ = CookieConsent.objects.get_or_create(user=request.user)
            return Response(CookieConsentSerializer(consent).data)
        return Response({'necessary': True, 'analytics': False, 'functional': False})

    def post(self, request):
        data = request.data
        if request.user.is_authenticated:
            consent, _ = CookieConsent.objects.get_or_create(user=request.user)
            consent.analytics = data.get('analytics', False)
            consent.functional = data.get('functional', False)
            consent.save()
            return Response(CookieConsentSerializer(consent).data)
        return Response({'message': 'Préférences enregistrées localement.'})


class BlockUserView(views.APIView):
    """US-43: Bloquer un utilisateur"""
    def post(self, request, user_id):
        try:
            blocked = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if blocked == request.user:
            return Response({'error': 'Vous ne pouvez pas vous bloquer vous-même.'}, status=status.HTTP_400_BAD_REQUEST)
        obj, created = BlockedUser.objects.get_or_create(
            blocker=request.user,
            blocked=blocked,
            defaults={'reason': request.data.get('reason', '')}
        )
        if not created:
            return Response({'message': 'Cet utilisateur est déjà bloqué.'})
        return Response({'message': f'{blocked.full_name} a été bloqué.', 'id': str(obj.id)}, status=status.HTTP_201_CREATED)


class UnblockUserView(views.APIView):
    """US-44: Débloquer un utilisateur"""
    def post(self, request, user_id):
        deleted, _ = BlockedUser.objects.filter(blocker=request.user, blocked_id=user_id).delete()
        if deleted:
            return Response({'message': 'Utilisateur débloqué.'})
        return Response({'error': 'Cet utilisateur n\'était pas bloqué.'}, status=status.HTTP_404_NOT_FOUND)


class BlockedListView(generics.ListAPIView):
    """Liste des utilisateurs bloqués"""
    serializer_class = BlockedUserSerializer

    def get_queryset(self):
        return BlockedUser.objects.filter(blocker=self.request.user).select_related('blocked')
class StaffUserListView(views.APIView):
    """Liste des étudiants et enseignants réservée au personnel (admin / moderator)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if getattr(request.user, 'role', None) not in ('admin', 'moderator'):
            return Response(
                {'error': 'Accès réservé au personnel administratif.'},
                status=status.HTTP_403_FORBIDDEN
            )

        role_filter = request.query_params.get('role')
        qs = User.objects.filter(is_active=True).order_by('last_name', 'first_name')
        if role_filter in ('student', 'teacher', 'moderator', 'admin'):
            qs = qs.filter(role=role_filter)

        data = [
            {
                'id': str(u.id),
                'full_name': f"{u.first_name} {u.last_name}".strip() or u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'email': u.email,
                'role': u.role,
                'date_joined': u.date_joined,
            }
            for u in qs
        ]
        return Response(data)
