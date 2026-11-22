"""
Serializers for posts application (E2).
"""
from rest_framework import serializers
from .models import Post, PostAttachment, Comment, Reaction
from apps.accounts.serializers import UserPublicSerializer


class PostAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostAttachment
        fields = ['id', 'file', 'filename', 'size', 'content_type', 'uploaded_at']
        read_only_fields = ['id', 'filename', 'size', 'content_type', 'uploaded_at']


class CommentSerializer(serializers.ModelSerializer):
    author_detail = UserPublicSerializer(source='author', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'author', 'author_detail', 'content', 'created_at', 'updated_at', 'is_hidden']
        read_only_fields = ['id', 'author', 'created_at', 'updated_at', 'is_hidden']

    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le commentaire ne peut pas être vide.")
        return value.strip()


class ReactionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = Reaction
        fields = ['id', 'user', 'user_name', 'emoji', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class PostSerializer(serializers.ModelSerializer):
    author_detail = UserPublicSerializer(source='author', read_only=True)
    community_name = serializers.CharField(source='community.name', read_only=True, default=None)
    attachments = PostAttachmentSerializer(many=True, read_only=True)
    comments_count = serializers.SerializerMethodField()
    reactions_summary = serializers.SerializerMethodField()
    my_reactions = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = [
            'id', 'author', 'author_detail', 'community', 'community_name',
            'content', 'is_official', 'is_pinned', 'is_hidden',
            'attachments', 'comments_count', 'reactions_summary', 'my_reactions',
            'comments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'author', 'is_official', 'is_pinned', 'is_hidden', 'created_at', 'updated_at']

    def get_comments_count(self, obj):
        return obj.comments.filter(is_hidden=False).count()

    def get_reactions_summary(self, obj):
        from django.db.models import Count
        summary = obj.reactions.values('emoji').annotate(count=Count('id'))
        return {item['emoji']: item['count'] for item in summary}

    def get_my_reactions(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return list(obj.reactions.filter(user=request.user).values_list('emoji', flat=True))
        return []


class PostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ['community', 'content']

    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le message ne peut pas être vide.")
        return value.strip()

    def create(self, validated_data):
        user = self.context['request'].user
        is_official = user.role in ('teacher', 'admin')
        post = Post.objects.create(
            author=user,
            is_official=is_official,
            **validated_data
        )
        return post


class PostUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ['content']

    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le message ne peut pas être vide.")
        return value.strip()
