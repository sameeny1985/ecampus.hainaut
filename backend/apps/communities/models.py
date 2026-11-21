"""
Models for course communities (E3).
"""
import uuid
from django.db import models
from django.conf import settings


class Community(models.Model):
    """Communauté de cours - US-18 to US-27"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField('Nom', max_length=200)
    course_code = models.CharField('Code du cours', max_length=50, blank=True)
    description = models.TextField('Description', blank=True)
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
        verbose_name = 'Communauté'
        verbose_name_plural = 'Communautés'
        ordering = ['name']
        unique_together = ('name', 'course_code')

    def __str__(self):
        return f'{self.name} ({self.course_code})' if self.course_code else self.name


class Membership(models.Model):
    """Appartenance à une communauté avec rôles"""
    class Role(models.TextChoices):
        MEMBER = 'member', 'Membre'
        ANIMATOR = 'animator', 'Animateur'
        TEACHER = 'teacher', 'Enseignant'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Appartenance'
        verbose_name_plural = 'Appartenances'
        unique_together = ('community', 'user')
        ordering = ['-joined_at']

    def __str__(self):
        return f'{self.user} dans {self.community} ({self.role})'


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
