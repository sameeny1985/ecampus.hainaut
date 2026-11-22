from django.contrib import admin
from .models import Community, Membership, CommunityResource


class MembershipInline(admin.TabularInline):
    model = Membership
    extra = 0
    autocomplete_fields = ['user']


class CommunityResourceInline(admin.TabularInline):
    model = CommunityResource
    extra = 0


@admin.register(Community)
class CommunityAdmin(admin.ModelAdmin):
    list_display = ('name', 'course_code', 'created_by', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'course_code', 'description')
    inlines = [MembershipInline, CommunityResourceInline]
    autocomplete_fields = ['created_by']


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'community', 'role', 'joined_at', 'is_active')
    list_filter = ('role', 'is_active', 'joined_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'community__name')
    autocomplete_fields = ['user', 'community']


@admin.register(CommunityResource)
class CommunityResourceAdmin(admin.ModelAdmin):
    list_display = ('title', 'community', 'uploaded_by', 'created_at')
    search_fields = ('title', 'community__name')
    autocomplete_fields = ['community', 'uploaded_by']
