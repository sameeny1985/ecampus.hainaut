"""
Models for feed and publications (E2).
"""
import uuid
from django.db import models
from django.conf import settings


class Post(models.Model):
    """Publication - US-10, US-13, US-15, US-17"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='posts')
    community = models.ForeignKey(
        'communities.Community',
        on_delete=models.CASCADE,
        related_name='posts',
        null=True,
        blank=True
    )
    content = models.TextField('Contenu')
    is_official = models.BooleanField('Annonce officielle', default=False)
    is_pinned = models.BooleanField('Épinglé', default=False)
    is_hidden = models.BooleanField('Masqué par modération', default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Publication'
        verbose_name_plural = 'Publications'
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return f'{self.author} - {self.content[:50]}'


class PostAttachment(models.Model):
    """Fichiers joints aux publications - US-14"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='posts/%Y/%m/')
    filename = models.CharField(max_length=255)
    size = models.PositiveIntegerField()  # bytes
    content_type = models.CharField(max_length=100, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Pièce jointe'
        verbose_name_plural = 'Pièces jointes'


class Comment(models.Model):
    """Commentaires - US-11"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_hidden = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Commentaire'
        verbose_name_plural = 'Commentaires'
        ordering = ['created_at']

    def __str__(self):
        return f'{self.author} sur {self.post_id}'


class Reaction(models.Model):
    """Réactions (émoticônes) - US-12"""
    class Emoji(models.TextChoices):
        LIKE = 'like', '👍'
        LOVE = 'love', '❤️'
        USEFUL = 'useful', '💡'
        FUNNY = 'funny', '😄'
        THINK = 'think', '🤔'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reactions')
    emoji = models.CharField(max_length=20, choices=Emoji.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Réaction'
        verbose_name_plural = 'Réactions'
        unique_together = ('post', 'user', 'emoji')
