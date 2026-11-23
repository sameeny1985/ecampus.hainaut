"""
Serializers for communities application (E3) + majors + enrollment status.
"""
from rest_framework import serializers
from django.utils import timezone
from .models import Major, Community, Membership, CommunityResource
from apps.accounts.serializers import UserPublicSerializer


class MajorSerializer(serializers.ModelSerializer):
    courses_count = serializers.SerializerMethodField()

    class Meta:
        model = Major
        fields = ['id', 'name', 'code', 'description', 'is_active', 'order', 'courses_count']

    def get_courses_count(self, obj):
        return obj.courses.filter(is_active=True).count()


class CommunityResourceSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)

    class Meta:
        model = CommunityResource
        fields = ['id', 'title', 'file', 'link', 'uploaded_by', 'uploaded_by_name', 'created_at']
        read_only_fields = ['id', 'uploaded_by', 'created_at']


class MembershipSerializer(serializers.ModelSerializer):
    user_detail = UserPublicSerializer(source='user', read_only=True)
    community_name = serializers.CharField(source='community.name', read_only=True)
    major_name = serializers.CharField(source='community.major.name', read_only=True, default=None)
    year = serializers.IntegerField(source='community.year', read_only=True, default=None)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    graded_by_name = serializers.CharField(source='graded_by.full_name', read_only=True, default=None)

    class Meta:
        model = Membership
        fields = [
            'id', 'user', 'user_detail', 'community', 'community_name',
            'major_name', 'year', 'role', 'status', 'status_display',
            'grade', 'grade_comment', 'graded_by', 'graded_by_name',
            'graded_at', 'joined_at', 'is_active'
        ]
        read_only_fields = ['id', 'joined_at', 'graded_by', 'graded_at']


class CommunityListSerializer(serializers.ModelSerializer):
    members_count = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()
    my_status = serializers.SerializerMethodField()
    major_name = serializers.CharField(source='major.name', read_only=True, default=None)
    major_code = serializers.CharField(source='major.code', read_only=True, default=None)
    year_display = serializers.SerializerMethodField()

    class Meta:
        model = Community
        fields = [
            'id', 'name', 'course_code', 'description',
            'major', 'major_name', 'major_code', 'year', 'year_display',
            'members_count', 'is_member', 'my_role', 'my_status', 'created_at'
        ]

    def get_members_count(self, obj):
        return obj.memberships.filter(is_active=True, role=Membership.Role.MEMBER).count()

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

    def get_my_status(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            membership = obj.memberships.filter(user=request.user, is_active=True).first()
            return membership.status if membership else None
        return None

    def get_year_display(self, obj):
        if obj.year:
            return dict(Community.YearLevel.choices).get(obj.year, f'{obj.year}e année')
        return None


class CommunityDetailSerializer(serializers.ModelSerializer):
    members_count = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()
    my_status = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    resources = CommunityResourceSerializer(many=True, read_only=True)
    major_detail = MajorSerializer(source='major', read_only=True)
    year_display = serializers.SerializerMethodField()

    class Meta:
        model = Community
        fields = [
            'id', 'name', 'course_code', 'description',
            'major', 'major_detail', 'year', 'year_display',
            'created_by', 'created_by_name', 'is_active',
            'members_count', 'is_member', 'my_role', 'my_status',
            'resources', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_members_count(self, obj):
        return obj.memberships.filter(is_active=True, role=Membership.Role.MEMBER).count()

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

    def get_my_status(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            membership = obj.memberships.filter(user=request.user, is_active=True).first()
            return membership.status if membership else None
        return None

    def get_year_display(self, obj):
        if obj.year:
            return dict(Community.YearLevel.choices).get(obj.year, f'{obj.year}e année')
        return None


class CommunityCreateSerializer(serializers.ModelSerializer):
    """
    ایجاد درس توسط کارمند / استاد
    باید major + year + name را بفرستد
    """
    class Meta:
        model = Community
        fields = ['name', 'course_code', 'description', 'major', 'year']

    def validate(self, data):
        major = data.get('major')
        year = data.get('year')
        name = data.get('name')
        course_code = data.get('course_code', '')

        if not major:
            raise serializers.ValidationError({'major': 'La filière est obligatoire.'})
        if not year:
            raise serializers.ValidationError({'year': 'L\'année est obligatoire (1, 2 ou 3).'})
        if year not in [1, 2, 3]:
            raise serializers.ValidationError({'year': 'L\'année doit être 1, 2 ou 3.'})

        qs = Community.objects.filter(major=major, year=year, name=name)
        if course_code:
            qs = qs.filter(course_code=course_code)
        if qs.exists():
            raise serializers.ValidationError(
                "Un cours avec ce nom existe déjà pour cette filière et cette année."
            )
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        community = Community.objects.create(created_by=user, **validated_data)
        # Creator becomes teacher or animator
        role = Membership.Role.TEACHER if getattr(user, 'role', None) == 'teacher' else Membership.Role.ANIMATOR
        Membership.objects.create(
            community=community,
            user=user,
            role=role,
            status=Membership.EnrollmentStatus.IN_PROGRESS
        )
        return community


class GradeUpdateSerializer(serializers.ModelSerializer):
    """استاد / کارمند نمره و وضعیت را به‌روز می‌کند"""
    class Meta:
        model = Membership
        fields = ['status', 'grade', 'grade_comment']

    def validate_status(self, value):
        allowed = [c[0] for c in Membership.EnrollmentStatus.choices]
        if value not in allowed:
            raise serializers.ValidationError('Statut invalide.')
        return value

    def update(self, instance, validated_data):
        instance.status = validated_data.get('status', instance.status)
        instance.grade = validated_data.get('grade', instance.grade)
        instance.grade_comment = validated_data.get('grade_comment', instance.grade_comment)
        instance.graded_by = self.context['request'].user
        instance.graded_at = timezone.now()
        instance.save()
        return instance
