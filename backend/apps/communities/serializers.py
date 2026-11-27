"""
Serializers for communities application (E3) + majors + enrollment status.
"""
from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Major, Community, Membership, CommunityResource
from apps.accounts.serializers import UserPublicSerializer

User = get_user_model()


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
            'graded_at', 'completed_at', 'joined_at', 'is_active'
        ]
        read_only_fields = ['id', 'joined_at', 'graded_by', 'graded_at', 'completed_at']


class CommunityListSerializer(serializers.ModelSerializer):
    members_count = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()
    my_status = serializers.SerializerMethodField()
    teacher_name = serializers.SerializerMethodField()
    major_name = serializers.CharField(source='major.name', read_only=True, default=None)
    major_code = serializers.CharField(source='major.code', read_only=True, default=None)
    year_display = serializers.SerializerMethodField()

    class Meta:
        model = Community
        fields = [
            'id', 'name', 'course_code', 'description',
            'major', 'major_name', 'major_code', 'year', 'year_display',
            'members_count', 'is_member', 'my_role', 'my_status', 'teacher_name', 'created_at'
        ]

    def get_teacher_name(self, obj):
        teacher_membership = obj.memberships.filter(
            is_active=True,
            role=Membership.Role.TEACHER
        ).select_related('user').first()
        if teacher_membership and teacher_membership.user:
            u = teacher_membership.user
            return f"{u.first_name} {u.last_name}".strip() or u.email
        return None

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
    teacher_name = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    resources = CommunityResourceSerializer(many=True, read_only=True)
    major_detail = MajorSerializer(source='major', read_only=True)
    year_display = serializers.SerializerMethodField()

    class Meta:
        model = Community
        fields = [
            'id', 'name', 'course_code', 'description',
            'major', 'major_detail', 'year', 'year_display',
            'created_by', 'created_by_name', 'teacher_name', 'is_active',
            'members_count', 'is_member', 'my_role', 'my_status',
            'resources', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_teacher_name(self, obj):
        teacher_membership = obj.memberships.filter(
            is_active=True,
            role=Membership.Role.TEACHER
        ).select_related('user').first()
        if teacher_membership and teacher_membership.user:
            u = teacher_membership.user
            return f"{u.first_name} {u.last_name}".strip() or u.email
        return None

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
    ایجاد درس منحصراً توسط کارمند آموزشی / ادمین و تخصیص استاد مسئول
    """
    teacher = serializers.UUIDField(required=True, write_only=True)

    class Meta:
        model = Community
        fields = ['name', 'course_code', 'description', 'major', 'year', 'teacher']

    def validate(self, data):
        major = data.get('major')
        year = data.get('year')
        name = data.get('name')
        course_code = data.get('course_code', '')
        teacher_id = data.get('teacher')

        if not major:
            raise serializers.ValidationError({'major': 'La filière est obligatoire.'})
        if not year:
            raise serializers.ValidationError({'year': 'L\'année est obligatoire (1, 2 ou 3).'})
        if year not in [1, 2, 3]:
            raise serializers.ValidationError({'year': 'L\'année doit être 1, 2 ou 3.'})
        if not teacher_id or not User.objects.filter(id=teacher_id, role='teacher', is_active=True).exists():
            raise serializers.ValidationError({'teacher': 'Veuillez sélectionner un enseignant valide.'})

        qs = Community.objects.filter(major=major, year=year, name=name, is_active=True)
        if course_code:
            qs = qs.filter(course_code=course_code)
        if qs.exists():
            raise serializers.ValidationError(
                "Un cours avec ce nom existe déjà pour cette filière et cette année."
            )
        return data

    def create(self, validated_data):
        teacher_id = validated_data.pop('teacher')
        user = self.context['request'].user
        community = Community.objects.create(created_by=user, **validated_data)

        selected_teacher = User.objects.get(id=teacher_id, role='teacher', is_active=True)
        Membership.objects.create(
            community=community,
            user=selected_teacher,
            role=Membership.Role.TEACHER,
            status=Membership.EnrollmentStatus.IN_PROGRESS
        )

        if selected_teacher != user:
            Membership.objects.create(
                community=community,
                user=user,
                role=Membership.Role.ANIMATOR,
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
        now = timezone.now()
        new_status = validated_data.get('status', instance.status)
        instance.status = new_status
        instance.grade = validated_data.get('grade', instance.grade)
        instance.grade_comment = validated_data.get('grade_comment', instance.grade_comment)
        if new_status in (Membership.EnrollmentStatus.COMPLETED, Membership.EnrollmentStatus.PASSED):
            instance.completed_at = instance.completed_at or now
        elif new_status == Membership.EnrollmentStatus.FAILED:
            instance.completed_at = now
        instance.graded_by = self.context['request'].user
        instance.graded_at = now
        instance.save()
        return instance
