"""
Models for accounts, profiles, privacy and authentication.
Covers User Stories E1-01 to E1-09 and related admin stories.
"""
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone
from django.conf import settings
import uuid


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('L\'adresse e-mail institutionnelle est obligatoire.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.ADMIN)
        extra_fields.setdefault('is_active', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model linked to institutional identity.
    US-01: connexion avec adresse institutionnelle
    """
    class Role(models.TextChoices):
        STUDENT = 'student', 'Étudiant'
        TEACHER = 'teacher', 'Enseignant'
        MODERATOR = 'moderator', 'Modérateur'
        ADMIN = 'admin', 'Administrateur'

    class AccountStatus(models.TextChoices):
        ACTIVE = 'active', 'Actif'
        DISABLED = 'disabled', 'Désactivé'
        PENDING = 'pending', 'En attente'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField('Adresse e-mail institutionnelle', unique=True, db_index=True)
    first_name = models.CharField('Prénom', max_length=150)
    last_name = models.CharField('Nom', max_length=150)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    status = models.CharField(max_length=20, choices=AccountStatus.choices, default=AccountStatus.ACTIVE)

    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)
    last_activity = models.DateTimeField(null=True, blank=True)

    # Privacy & GDPR
    privacy_accepted = models.BooleanField(default=False)
    terms_accepted = models.BooleanField(default=False)
    privacy_accepted_at = models.DateTimeField(null=True, blank=True)
    cookie_preferences = models.JSONField(default=dict, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f'{self.first_name} {self.last_name} <{self.email}>'

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'

    def is_institutional_email(self):
        domain = self.email.split('@')[-1].lower()
        return domain in [d.strip().lower() for d in settings.INSTITUTIONAL_EMAIL_DOMAINS]

    def update_last_activity(self):
        self.last_activity = timezone.now()
        self.save(update_fields=['last_activity'])


class Profile(models.Model):
    """
    Extended profile information.
    US-04, US-05, US-06
    """
    class Visibility(models.TextChoices):
        COMMUNITIES = 'communities', 'Communautés uniquement'
        INSTITUTION = 'institution', 'Tout l\'établissement'
        PRIVATE = 'private', 'Privé'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    photo = models.ImageField(upload_to='profiles/%Y/%m/', null=True, blank=True)
    bio = models.TextField('Biographie', max_length=500, blank=True)
    bachelor = models.CharField('Bachelier / Filière', max_length=100, blank=True)
    courses = models.JSONField('Cours suivis', default=list, blank=True)
    visibility = models.CharField(
        max_length=20,
        choices=Visibility.choices,
        default=Visibility.COMMUNITIES
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Profil'
        verbose_name_plural = 'Profils'

    def __str__(self):
        return f'Profil de {self.user.full_name}'


class BlockedUser(models.Model):
    """
    US-43, US-44: Blocage d'utilisateurs
    """
    blocker = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocking')
    blocked = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_by')
    created_at = models.DateTimeField(auto_now_add=True)
    reason = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = 'Utilisateur bloqué'
        verbose_name_plural = 'Utilisateurs bloqués'
        unique_together = ('blocker', 'blocked')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.blocker} a bloqué {self.blocked}'


class CookieConsent(models.Model):
    """
    US-09: Préférences de cookies
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cookie_consent', null=True, blank=True)
    session_key = models.CharField(max_length=40, blank=True, db_index=True)
    necessary = models.BooleanField(default=True)  # Always true
    analytics = models.BooleanField(default=False)
    functional = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Consentement cookies'
        verbose_name_plural = 'Consentements cookies'
class RegistrationRequest(models.Model):
    """درخواست ثبت‌نام دانشجویان سال اول (با ایمیل شخصی/گوگل) برای تایید توسط مدریتور"""
    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        APPROVED = 'approved', 'Approuvée'
        REJECTED = 'rejected', 'Refusée'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField('Prénom', max_length=150)
    last_name = models.CharField('Nom', max_length=150)
    personal_email = models.EmailField('Adresse e-mail personnelle / Google')
    academic_year = models.CharField('Année académique', max_length=20, default='1ere')
    bachelor = models.CharField('Filière / Bachelier', max_length=120)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    # اطلاعاتی که مدریتور پس از تایید برای کاربر تعیین و ارسال می‌کند
    assigned_institutional_email = models.EmailField('E-mail institutionnel attribué', blank=True)
    assigned_temporary_password = models.CharField('Mot de passe temporaire attribué', max_length=128, blank=True)
    moderator_note = models.TextField('Note / Statut envoyé au candidat', blank=True)

    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_registration_requests'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Demande d\'inscription (1re année)'
        verbose_name_plural = 'Demandes d\'inscription (1re année)'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.first_name} {self.last_name} ({self.personal_email}) - {self.status}'
