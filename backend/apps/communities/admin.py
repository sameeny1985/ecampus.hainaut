from django.contrib import admin
from .models import Major, Community, Membership, CommunityResource


@admin.register(Major)
class MajorAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'order', 'is_active', 'created_at')
    list_editable = ('order', 'is_active')
    search_fields = ('name', 'code')
    ordering = ('order', 'name')


class MembershipInline(admin.TabularInline):
    model = Membership
    extra = 0
    autocomplete_fields = ['user', 'graded_by']
    fields = ('user', 'role', 'status', 'grade', 'grade_comment', 'is_active', 'joined_at')
    readonly_fields = ('joined_at',)


class CommunityResourceInline(admin.TabularInline):
    model = CommunityResource
    extra = 0


@admin.register(Community)
class CommunityAdmin(admin.ModelAdmin):
    list_display = ('name', 'major', 'year', 'course_code', 'created_by', 'is_active', 'created_at')
    list_filter = ('major', 'year', 'is_active', 'created_at')
    search_fields = ('name', 'course_code', 'description')
    inlines = [MembershipInline, CommunityResourceInline]
    autocomplete_fields = ['created_by', 'major']
    list_select_related = ('major', 'created_by')


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'community', 'role', 'status', 'grade', 'joined_at', 'is_active')
    list_filter = ('role', 'status', 'is_active', 'joined_at', 'community__major', 'community__year')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'community__name')
    autocomplete_fields = ['user', 'community', 'graded_by']
    list_select_related = ('user', 'community', 'community__major')


@admin.register(CommunityResource)
class CommunityResourceAdmin(admin.ModelAdmin):
    list_display = ('title', 'community', 'uploaded_by', 'created_at')
    search_fields = ('title', 'community__name')
    autocomplete_fields = ['community', 'uploaded_by']
