"""
Views for accounts - authentication, profile, privacy, blocking.
"""
from rest_framework import generics, status, permissions, views
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import authenticate, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.db.models import Q
from .models import User, Profile, BlockedUser, CookieConsent, RegistrationRequest
from .serializers import (
    UserSerializer, UserPublicSerializer, RegisterSerializer, LoginSerializer,
    ProfileUpdateSerializer, CookieConsentSerializer, BlockedUserSerializer
)
from .permissions import IsOwnerOrAdmin


def _notify_moderators_and_admins(title, message, link='/dashboard'):
    staff_users = User.objects.filter(is_active=True, role__in=['moderator', 'admin'])
    try:
        from apps.notifications.models import Notification
        for staff in staff_users:
            Notification.objects.create(
                recipient=staff,
                title=title,
                message=message,
                link=link,
            )
    except Exception:
        pass


class RegisterView(generics.CreateAPIView):
    """US-01: Création de compte avec adresse institutionnelle"""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        if not user.is_active or user.status == User.AccountStatus.PENDING:
            return Response({
                'user': UserSerializer(user).data,
                'pending_approval': True,
                'message': 'Votre demande de compte a bien été enregistrée et est en attente de validation.'
            }, status=status.HTTP_201_CREATED)

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


class ChangePasswordView(views.APIView):
    """Changer le mot de passe de l'utilisateur connecté"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current_password = (
            request.data.get('current_password')
            or request.data.get('old_password')
            or ''
        )
        new_password = request.data.get('new_password') or ''

        if not current_password:
            return Response(
                {'detail': 'Veuillez saisir votre mot de passe actuel.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not request.user.check_password(current_password):
            return Response(
                {'detail': 'Le mot de passe actuel est incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not new_password:
            return Response(
                {'detail': 'Veuillez saisir un nouveau mot de passe.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password(new_password, user=request.user)
        except ValidationError as exc:
            return Response(
                {'detail': exc.messages[0]},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        return Response(
            {'detail': 'Mot de passe mis à jour avec succès.'},
            status=status.HTTP_200_OK
        )


class UpperYearRegistrationView(views.APIView):
    """ثبت درخواست ثبت‌نام سال دوم یا سوم برای بررسی و تایید توسط مدریتور"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        academic_year = (request.data.get('academic_year') or '2eme').strip()
        bachelor = (request.data.get('bachelor') or '').strip()
        first_name = (request.data.get('first_name') or '').strip()
        last_name = (request.data.get('last_name') or '').strip()

        if academic_year not in ('2eme', '3eme'):
            return Response(
                {'error': 'Année invalide (2eme ou 3eme uniquement).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not bachelor:
            return Response(
                {'error': 'Veuillez sélectionner une filière.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = None
        if request.user and request.user.is_authenticated:
            user = request.user
        else:
            email = (request.data.get('email') or '').strip().lower()
            password = request.data.get('password') or ''
            if not email or not password:
                return Response(
                    {'error': 'Veuillez vous connecter avec votre e-mail et mot de passe existants.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user = authenticate(request, email=email, password=password)
            if not user:
                return Response(
                    {'error': 'E-mail ou mot de passe existant incorrect.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        effective_first_name = first_name or user.first_name or user.email.split('@')[0]
        effective_last_name = last_name or user.last_name or 'Étudiant'

        if first_name:
            user.first_name = first_name
        if last_name:
            user.last_name = last_name
        user.privacy_accepted = True
        user.terms_accepted = True
        if not user.privacy_accepted_at:
            user.privacy_accepted_at = timezone.now()
        user.save()

        # ثبت درخواست در انتظار تایید مدریتور
        req_obj = RegistrationRequest.objects.create(
            first_name=effective_first_name,
            last_name=effective_last_name,
            personal_email=user.email.lower(),
            academic_year=academic_year,
            bachelor=bachelor,
            assigned_institutional_email=user.email.lower(),
            status=RegistrationRequest.Status.PENDING,
        )

        _notify_moderators_and_admins(
            title=f"Demande d'inscription ({'2e année' if academic_year == '2eme' else '3e année'})",
            message=f"{effective_first_name} {effective_last_name} ({user.email}) — {bachelor}",
            link='/registration-requests',
        )

        return Response({
            'id': str(req_obj.id),
            'pending_approval': True,
            'status': req_obj.status,
            'message': (
                f"Votre demande d'inscription en {'2e année' if academic_year == '2eme' else '3e année'} "
                f"a été envoyée au modérateur. Vous pourrez vous inscrire aux cours après validation."
            )
        }, status=status.HTTP_201_CREATED)
class FirstYearRegistrationRequestView(views.APIView):
    """ثبت درخواست ثبت‌نام دانشجوی سال اول با ایمیل شخصی/گوگل"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        first_name = (request.data.get('first_name') or '').strip()
        last_name = (request.data.get('last_name') or '').strip()
        personal_email = (request.data.get('personal_email') or '').strip().lower()
        bachelor = (request.data.get('bachelor') or '').strip()

        if not first_name or not last_name or not personal_email or not bachelor:
            return Response(
                {'detail': 'Veuillez remplir le prénom, le nom, votre e-mail et la filière.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        req_obj = RegistrationRequest.objects.create(
            first_name=first_name,
            last_name=last_name,
            personal_email=personal_email,
            academic_year='1ere',
            bachelor=bachelor,
            status=RegistrationRequest.Status.PENDING,
        )

        _notify_moderators_and_admins(
            title='Nouvelle demande d\'inscription (1re année)',
            message=f'{first_name} {last_name} ({personal_email}) - Filière : {bachelor}',
            link='/registration-requests',
        )

        return Response(
            {
                'id': str(req_obj.id),
                'message': 'Votre demande a bien été transmise au modérateur. Vous recevrez vos identifiants institutionnels et le statut de votre inscription.'
            },
            status=status.HTTP_201_CREATED
        )


class ModeratorRegistrationRequestListView(views.APIView):
    """لیست درخواست‌های ثبت‌نام سال اولی‌ها برای مدریتور / ادمین"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if getattr(request.user, 'role', None) not in ('moderator', 'admin'):
            return Response({'error': 'Accès réservé au modérateur / administrateur.'}, status=status.HTTP_403_FORBIDDEN)

        qs = RegistrationRequest.objects.all()
        items = [
            {
                'id': str(r.id),
                'first_name': r.first_name,
                'last_name': r.last_name,
                'personal_email': r.personal_email,
                'academic_year': r.academic_year,
                'bachelor': r.bachelor,
                'status': r.status,
                'assigned_institutional_email': r.assigned_institutional_email,
                'assigned_temporary_password': r.assigned_temporary_password,
                'moderator_note': r.moderator_note,
                'created_at': r.created_at,
                'reviewed_at': r.reviewed_at,
            }
            for r in qs
        ]
        return Response(items)


class ModeratorRegistrationRequestDecisionView(views.APIView):
    """تایید یا رد درخواست ثبت‌نام و ارسال ایمیل و پسورد دانشگاهی توسط مدریتور"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, req_id):
        if getattr(request.user, 'role', None) not in ('moderator', 'admin'):
            return Response({'error': 'Accès réservé au modérateur / administrateur.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            req_obj = RegistrationRequest.objects.get(id=req_id)
        except RegistrationRequest.DoesNotExist:
            return Response({'error': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        action = (request.data.get('action') or '').strip().lower()
        assigned_email = (request.data.get('assigned_institutional_email') or '').strip().lower()
        assigned_password = (request.data.get('assigned_temporary_password') or '').strip()
        note = (request.data.get('moderator_note') or '').strip()

        if action not in ('approve', 'reject'):
            return Response({'error': 'Action invalide (approve ou reject).'}, status=status.HTTP_400_BAD_REQUEST)
        if action == 'approve':
            is_upper_year = req_obj.academic_year in ('2eme', '3eme')

            if is_upper_year:
                target_email = (assigned_email or req_obj.assigned_institutional_email or req_obj.personal_email).strip().lower()
                if not target_email:
                    return Response(
                        {'error': 'Adresse e-mail étudiant introuvable.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                user, _ = User.objects.get_or_create(
                    email=target_email,
                    defaults={
                        'first_name': req_obj.first_name,
                        'last_name': req_obj.last_name,
                        'role': User.Role.STUDENT,
                        'status': User.AccountStatus.ACTIVE,
                        'is_active': True,
                        'privacy_accepted': True,
                        'terms_accepted': True,
                        'privacy_accepted_at': timezone.now(),
                    }
                )
                user.first_name = req_obj.first_name
                user.last_name = req_obj.last_name
                user.role = User.Role.STUDENT
                user.status = User.AccountStatus.ACTIVE
                user.is_active = True
                if assigned_password:
                    user.set_password(assigned_password)
                user.save()

                profile, _ = Profile.objects.get_or_create(user=user)
                profile.bachelor = req_obj.bachelor
                existing_courses = profile.courses if isinstance(profile.courses, list) else []
                filtered_courses = [c for c in existing_courses if not str(c).startswith('Année:')]
                profile.courses = [f"Année: {req_obj.academic_year}", *filtered_courses]
                profile.save()

                req_obj.status = RegistrationRequest.Status.APPROVED
                req_obj.assigned_institutional_email = target_email
                if assigned_password:
                    req_obj.assigned_temporary_password = assigned_password
                req_obj.moderator_note = note or 'Inscription approuvée.'
                req_obj.reviewed_by = request.user
                req_obj.reviewed_at = timezone.now()
                req_obj.save()

                email_body = (
                    f"Bonjour {req_obj.first_name} {req_obj.last_name},\n\n"
                    f"Votre inscription en {'2e année' if req_obj.academic_year == '2eme' else '3e année'} "
                    f"({req_obj.bachelor}) sur CampusConnect a été APPROUVÉE.\n"
                    f"Vous pouvez désormais vous inscrire à vos cours.\n"
                    f"Remarque : {req_obj.moderator_note}\n"
                )
            else:
                if not assigned_email or not assigned_password:
                    return Response(
                        {'error': 'Veuillez saisir l\'adresse e-mail institutionnelle et le mot de passe temporaire.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if not assigned_email.endswith('@hainaut-ea.be'):
                    return Response(
                        {'error': 'L\'adresse institutionnelle doit se terminer par @hainaut-ea.be.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                user, _ = User.objects.get_or_create(
                    email=assigned_email,
                    defaults={
                        'first_name': req_obj.first_name,
                        'last_name': req_obj.last_name,
                        'role': User.Role.STUDENT,
                        'status': User.AccountStatus.ACTIVE,
                        'is_active': True,
                        'privacy_accepted': True,
                        'terms_accepted': True,
                        'privacy_accepted_at': timezone.now(),
                    }
                )
                user.first_name = req_obj.first_name
                user.last_name = req_obj.last_name
                user.role = User.Role.STUDENT
                user.status = User.AccountStatus.ACTIVE
                user.is_active = True
                user.set_password(assigned_password)
                user.save()

                profile, _ = Profile.objects.get_or_create(user=user)
                profile.bachelor = req_obj.bachelor
                profile.save()

                req_obj.status = RegistrationRequest.Status.APPROVED
                req_obj.assigned_institutional_email = assigned_email
                req_obj.assigned_temporary_password = assigned_password
                req_obj.moderator_note = note or 'Inscription approuvée.'
                req_obj.reviewed_by = request.user
                req_obj.reviewed_at = timezone.now()
                req_obj.save()

                email_body = (
                    f"Bonjour {req_obj.first_name} {req_obj.last_name},\n\n"
                    f"Votre inscription sur CampusConnect (IETC Charleroi) a été APPROUVÉE.\n"
                    f"Filière : {req_obj.bachelor} (1re année)\n"
                    f"E-mail institutionnel : {assigned_email}\n"
                    f"Mot de passe temporaire : {assigned_password}\n"
                    f"Remarque : {req_obj.moderator_note}\n"
                )

            sent_count = 0
            email_error = ''
            try:
                sent_count = send_mail(
                    subject='CampusConnect — Inscription approuvée',
                    message=email_body,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@hainaut-ea.be'),
                    recipient_list=[req_obj.personal_email],
                    fail_silently=False,
                )
            except Exception as exc:
                email_error = str(exc)

            if sent_count > 0:
                msg = f'Inscription approuvée et e-mail envoyé à {req_obj.personal_email}.'
            else:
                msg = (
                    f"Inscription approuvée, mais l'e-mail n'a pas pu être envoyé à {req_obj.personal_email} "
                    f"(vérifiez EMAIL_HOST / EMAIL_HOST_USER / EMAIL_HOST_PASSWORD sur Render : {email_error or 'SMTP non configuré'})."
                )

            return Response({
                'message': msg,
                'email_sent': sent_count > 0,
                'status': req_obj.status,
            })
        req_obj.status = RegistrationRequest.Status.REJECTED
        req_obj.moderator_note = note or 'Demande refusée.'
        req_obj.reviewed_by = request.user
        req_obj.reviewed_at = timezone.now()
        req_obj.save()

        sent_count = 0
        email_error = ''
        try:
            sent_count = send_mail(
                subject='CampusConnect — Statut de votre demande d\'inscription',
                message=(
                    f"Bonjour {req_obj.first_name} {req_obj.last_name},\n\n"
                    f"Statut de votre inscription : REFUSÉE.\n"
                    f"Motif / Note : {req_obj.moderator_note}\n"
                ),
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@hainaut-ea.be'),
                recipient_list=[req_obj.personal_email],
                fail_silently=False,
            )
        except Exception as exc:
            email_error = str(exc)

        if sent_count > 0:
            msg = f'Demande refusée et notification envoyée à {req_obj.personal_email}.'
        else:
            msg = (
                f"Demande refusée, mais l'e-mail n'a pas pu être envoyé à {req_obj.personal_email} "
                f"(vérifiez EMAIL_HOST / EMAIL_HOST_USER / EMAIL_HOST_PASSWORD sur Render : {email_error or 'SMTP non configuré'})."
            )

        return Response({
            'message': msg,
            'email_sent': sent_count > 0,
            'status': req_obj.status,
        })


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
