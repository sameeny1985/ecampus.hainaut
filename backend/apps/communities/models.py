"""
Models for course communities (E3) + structured majors, years and enrollment status.
"""
import uuid
from django.db import models
from django.conf import settings


class Major(models.Model):
    """
    Filière / رشته دانشگاهی
    مثال: Informatique, Droit, Marketing, Gestion, Économie, Communication
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField('Nom de la filière', max_length=100, unique=True)
    code = models.CharField('Code', max_length=20, unique=True)
    description = models.TextField('Description', blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveSmallIntegerField(default=0, help_text='Ordre d\'affichage')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Filière'
        verbose_name_plural = 'Filières'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Community(models.Model):
    """
    Communauté de cours (درس)
    حالا با فیلتر رشته + سال تحصیلی
    """
    class YearLevel(models.IntegerChoices):
        YEAR_1 = 1, '1ère année'
        YEAR_2 = 2, '2ème année'
        YEAR_3 = 3, '3ème année'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField('Nom du cours', max_length=200)
    course_code = models.CharField('Code du cours', max_length=50, blank=True)
    description = models.TextField('Description', blank=True)

    # ساختار جدید
    major = models.ForeignKey(
        Major,
        on_delete=models.PROTECT,
        related_name='courses',
        verbose_name='Filière',
        null=True,
        blank=True
    )
    year = models.PositiveSmallIntegerField(
        'Année',
        choices=YearLevel.choices,
        null=True,
        blank=True
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_communities'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Communauté / Cours'
        verbose_name_plural = 'Communautés / Cours'
        ordering = ['major__order', 'year', 'name']
        unique_together = ('major', 'year', 'name', 'course_code')

    def __str__(self):
        parts = []
        if self.major:
            parts.append(self.major.name)
        if self.year:
            parts.append(f'{self.year}e année')
        parts.append(self.name)
        if self.course_code:
            parts.append(f'({self.course_code})')
        return ' – '.join(parts)


class Membership(models.Model):
    """
    ثبت‌نام دانشجو در درس + وضعیت نمره
    """
    class Role(models.TextChoices):
        MEMBER = 'member', 'Membre'
        ANIMATOR = 'animator', 'Animateur'
        TEACHER = 'teacher', 'Enseignant'

    class EnrollmentStatus(models.TextChoices):
        ENROLLED = 'enrolled', 'Inscrit'
        IN_PROGRESS = 'in_progress', 'En cours'
        COMPLETED = 'completed', 'Terminé'
        PASSED = 'passed', 'Validé / Réussi'
        FAILED = 'failed', 'Refusé'
        DROPPED = 'dropped', 'Abandonné'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    community = models.ForeignKey(
        Community,
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)

    # وضعیت ثبت‌نام و نمره
    status = models.CharField(
        max_length=20,
        choices=EnrollmentStatus.choices,
        default=EnrollmentStatus.ENROLLED,
        verbose_name='Statut'
    )
    grade = models.DecimalField(
        'Note',
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Note sur 20 (optionnel)'
    )
    grade_comment = models.CharField(
        'Commentaire de note',
        max_length=255,
        blank=True
    )
    graded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='grades_given'
    )
    graded_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Inscription / Appartenance'
        verbose_name_plural = 'Inscriptions / Appartenances'
        unique_together = ('community', 'user')
        ordering = ['-joined_at']

    def __str__(self):
        return f'{self.user} → {self.community} [{self.get_status_display()}]'


class CommunityResource(models.Model):
    """Ressources partagées dans une communauté - US-24"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='resources')
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='resources/%Y/%m/', null=True, blank=True)
    link = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Ressource'
        verbose_name_plural = 'Ressources'
        ordering = ['-created_at']

    def __str__(self):
        return self.title
