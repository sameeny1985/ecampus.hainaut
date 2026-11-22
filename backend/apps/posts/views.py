"""
Views for posts and feed (E2) - US-10 to US-17.
"""
from rest_framework import generics, views, status, permissions
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Post, PostAttachment, Comment, Reaction
from .serializers import (
    PostSerializer, PostCreateSerializer, PostUpdateSerializer,
    CommentSerializer, ReactionSerializer
)
from apps.communities.models import Membership
from django.conf import settings
import os


class FeedView(generics.ListAPIView):
    """US-13: Fil d'actualité avec pagination"""
    serializer_class = PostSerializer

    def get_queryset(self):
        user = self.request.user
        # Posts from communities the user is member of
        my_communities = Membership.objects.filter(
            user=user, is_active=True
        ).values_list('community_id', flat=True)

        qs = Post.objects.filter(
            is_hidden=False
        ).filter(
            Q(community_id__in=my_communities) | Q(community__isnull=True)
        ).select_related('author', 'author__profile', 'community').prefetch_related(
            'attachments', 'comments', 'reactions'
        )

        # Filter by community if requested (US-20)
        community_id = self.request.query_params.get('community')
        if community_id:
            qs = qs.filter(community_id=community_id)

        # Search keywords (US-16)
        search = self.request.query_params.get('q', '').strip()
        if search:
            qs = qs.filter(content__icontains=search)

        return qs.order_by('-is_pinned', '-is_official', '-created_at')


class PostCreateView(generics.CreateAPIView):
    """US-10, US-15: Publier un message / annonce officielle"""
    serializer_class = PostCreateSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Check membership if community is specified
        community = serializer.validated_data.get('community')
        if community:
            is_member = Membership.objects.filter(
                community=community, user=request.user, is_active=True
            ).exists()
            if not is_member:
                return Response(
                    {'error': 'Vous devez être membre de la communauté pour y publier.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        post = serializer.save()

        # Handle file attachments (US-14)
        files = request.FILES.getlist('files')
        max_size = 30 * 1024 * 1024  # 30 MB
        for f in files:
            if f.size > max_size:
                post.delete()
                return Response(
                    {'error': f'Le fichier « {f.name} » dépasse la limite de 30 Mo.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            ext = os.path.splitext(f.name)[1].lower()
            if ext not in settings.ALLOWED_UPLOAD_EXTENSIONS:
                post.delete()
                return Response(
                    {'error': f'Format de fichier non autorisé : {ext}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            PostAttachment.objects.create(
                post=post,
                file=f,
                filename=f.name,
                size=f.size,
                content_type=f.content_type or ''
            )

        return Response(
            PostSerializer(post, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    """US-17: Modifier ou supprimer une publication"""
    serializer_class = PostSerializer
    lookup_field = 'id'

    def get_queryset(self):
        return Post.objects.filter(is_hidden=False).select_related(
            'author', 'community'
        ).prefetch_related('attachments', 'comments', 'reactions')

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return PostUpdateSerializer
        return PostSerializer

    def perform_update(self, serializer):
        post = self.get_object()
        if post.author != self.request.user and self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez modifier que vos propres publications.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.author != self.request.user and self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez supprimer que vos propres publications.")
        instance.delete()


class CommentCreateView(generics.CreateAPIView):
    """US-11: Commenter une publication"""
    serializer_class = CommentSerializer

    def perform_create(self, serializer):
        post = get_object_or_404(Post, id=self.kwargs['post_id'], is_hidden=False)
        serializer.save(author=self.request.user, post=post)


class CommentListView(generics.ListAPIView):
    serializer_class = CommentSerializer

    def get_queryset(self):
        return Comment.objects.filter(
            post_id=self.kwargs['post_id'], is_hidden=False
        ).select_related('author', 'author__profile').order_by('created_at')


class ReactionToggleView(views.APIView):
    """US-12: Réagir à une publication (toggle)"""
    def post(self, request, post_id):
        post = get_object_or_404(Post, id=post_id, is_hidden=False)
        emoji = request.data.get('emoji', 'like')
        if emoji not in dict(Reaction.Emoji.choices):
            return Response({'error': 'Émoticône non valide.'}, status=status.HTTP_400_BAD_REQUEST)

        reaction, created = Reaction.objects.get_or_create(
            post=post, user=request.user, emoji=emoji
        )
        if not created:
            reaction.delete()
            return Response({'message': 'Réaction retirée.', 'action': 'removed'})
        return Response({'message': 'Réaction ajoutée.', 'action': 'added', 'emoji': emoji})


class PinPostView(views.APIView):
    """US-23: Épingler un message (animateur/enseignant)"""
    def post(self, request, post_id):
        post = get_object_or_404(Post, id=post_id)
        if not post.community:
            return Response({'error': 'Seuls les messages de communauté peuvent être épinglés.'}, status=status.HTTP_400_BAD_REQUEST)

        is_admin = Membership.objects.filter(
            community=post.community,
            user=request.user,
            is_active=True,
            role__in=['animator', 'teacher']
        ).exists() or request.user.role == 'admin'

        if not is_admin:
            return Response({'error': 'Seuls les animateurs et enseignants peuvent épingler.'}, status=status.HTTP_403_FORBIDDEN)

        post.is_pinned = not post.is_pinned
        post.save(update_fields=['is_pinned'])
        action = 'épinglé' if post.is_pinned else 'désépinglé'
        return Response({'message': f'Message {action}.', 'is_pinned': post.is_pinned})
