"""
Serializers for communities application (E3).
"""
from rest_framework import serializers
from .models import Community, Membership, CommunityResource
from apps.accounts.serializers import UserPublicSerializer


class CommunityResourceSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)

    class Meta:
        model = CommunityResource
        fields = ['id', 'title', 'file', 'link', 'uploaded_by', 'uploaded_by_name', 'created_at']
        read_only_fields = ['id', 'uploaded_by', 'created_at']


class MembershipSerializer(serializers.ModelSerializer):
    user_detail = UserPublicSerializer(source='user', read_only=True)

    class Meta:
        model = Membership
        fields = ['id', 'user', 'user_detail', 'role', 'joined_at', 'is_active']
        read_only_fields = ['id', 'joined_at']


class CommunityListSerializer(serializers.ModelSerializer):
    members_count = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Community
        fields = [
            'id', 'name', 'course_code', 'description',
            'members_count', 'is_member', 'my_role', 'created_at'
        ]

    def get_members_count(self, obj):
        return obj.memberships.filter(is_active=True).count()

    def get_is_member(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.memberships.filter(user=request.user, is_active=True).exists()
        return False

    def get_my_role(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            membership = obj.memberships.filter(user=request.user, is_active=True).first()
            return membership.role if membership else None
        return None


class CommunityDetailSerializer(serializers.ModelSerializer):
    members_count = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    resources = CommunityResourceSerializer(many=True, read_only=True)

    class Meta:
        model = Community
        fields = [
            'id', 'name', 'course_code', 'description',
            'created_by', 'created_by_name', 'is_active',
            'members_count', 'is_member', 'my_role',
            'resources', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_members_count(self, obj):
        return obj.memberships.filter(is_active=True).count()

    def get_is_member(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.memberships.filter(user=request.user, is_active=True).exists()
        return False

    def get_my_role(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            membership = obj.memberships.filter(user=request.user, is_active=True).first()
            return membership.role if membership else None
        return None


class CommunityCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Community
        fields = ['name', 'course_code', 'description']

    def validate(self, data):
        name = data.get('name')
        course_code = data.get('course_code', '')
        if Community.objects.filter(name=name, course_code=course_code).exists():
            raise serializers.ValidationError(
                "Une communauté avec ce nom et ce code de cours existe déjà. "
                "Vous pouvez la rejoindre plutôt que d'en créer une nouvelle."
            )
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        community = Community.objects.create(created_by=user, **validated_data)
        # Creator becomes teacher or animator
        role = Membership.Role.TEACHER if user.role == 'teacher' else Membership.Role.ANIMATOR
        Membership.objects.create(
            community=community,
            user=user,
            role=role
        )
        return community
