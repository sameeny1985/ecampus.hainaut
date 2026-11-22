from django.contrib import admin
from .models import Post, PostAttachment, Comment, Reaction


class PostAttachmentInline(admin.TabularInline):
    model = PostAttachment
    extra = 0


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0
    readonly_fields = ['author', 'created_at']


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'community', 'is_official', 'is_pinned', 'is_hidden', 'created_at')
    list_filter = ('is_official', 'is_pinned', 'is_hidden', 'created_at')
    search_fields = ('content', 'author__email', 'author__first_name')
    inlines = [PostAttachmentInline, CommentInline]
    autocomplete_fields = ['author', 'community']


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'post', 'is_hidden', 'created_at')
    list_filter = ('is_hidden', 'created_at')
    search_fields = ('content', 'author__email')


@admin.register(Reaction)
class ReactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'post', 'emoji', 'created_at')
    list_filter = ('emoji',)
