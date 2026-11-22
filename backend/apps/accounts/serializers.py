"""
Serializers for accounts application.
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.conf import settings
from .models import User, Profile, BlockedUser, CookieConsent


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['photo', 'bio', 'bachelor', 'courses', 'visibility', 'updated_at']
        read_only_fields = ['updated_at']


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'status', 'date_joined', 'last_login',
            'privacy_accepted', 'terms_accepted', 'profile'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'status']


class UserPublicSerializer(serializers.ModelSerializer):
    """Limited public view respecting privacy settings."""
    full_name = serializers.CharField(read_only=True)
    bachelor = serializers.CharField(source='profile.bachelor', read_only=True)
    photo = serializers.ImageField(source='profile.photo', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'full_name', 'bachelor', 'photo', 'role']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, style={'input_type': 'password'})
    accept_terms = serializers.BooleanField(write_only=True)
    accept_privacy = serializers.BooleanField(write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'password', 'password_confirm',
            'accept_terms', 'accept_privacy'
        ]

    def validate_email(self, value):
        domain = value.split('@')[-1].lower()
        allowed = [d.strip().lower() for d in settings.INSTITUTIONAL_EMAIL_DOMAINS]
        if domain not in allowed:
            raise serializers.ValidationError(
                f'Seules les adresses institutionnelles sont autorisées '
                f'({", ".join(allowed)}).'
            )
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Un compte existe déjà avec cette adresse.')
        return value.lower()

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Les mots de passe ne correspondent pas.'})
        if not data.get('accept_terms'):
            raise serializers.ValidationError({'accept_terms': 'Vous devez accepter les conditions générales.'})
        if not data.get('accept_privacy'):
            raise serializers.ValidationError({'accept_privacy': 'Vous devez accepter la politique de confidentialité.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        validated_data.pop('accept_terms')
        validated_data.pop('accept_privacy')
        password = validated_data.pop('password')
        user = User.objects.create_user(
            **validated_data,
            privacy_accepted=True,
            terms_accepted=True,
            privacy_accepted_at=timezone.now()
        )
        user.set_password(password)
        user.save()
        Profile.objects.create(user=user)
        return user


from django.utils import timezone


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(style={'input_type': 'password'})

    def validate(self, data):
        from django.contrib.auth import authenticate
        email = data.get('email', '').strip()
        password = data.get('password', '')
        if not email or not password:
            raise serializers.ValidationError('Email et mot de passe requis.')

        user = authenticate(username=email, password=password)
        if user is None:
            raise serializers.ValidationError('Identifiants incorrects.')
        if not user.is_active or getattr(user, 'status', None) == 'disabled':
            raise serializers.ValidationError('Ce compte est désactivé.')
        data['user'] = user
        return data


class ProfileUpdateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False)

    class Meta:
        model = Profile
        fields = ['photo', 'bio', 'bachelor', 'courses', 'visibility', 'first_name', 'last_name']

    def update(self, instance, validated_data):
        user = instance.user
        if 'first_name' in validated_data:
            user.first_name = validated_data.pop('first_name')
        if 'last_name' in validated_data:
            user.last_name = validated_data.pop('last_name')
        user.save()
        return super().update(instance, validated_data)


class CookieConsentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CookieConsent
        fields = ['necessary', 'analytics', 'functional', 'updated_at']
        read_only_fields = ['necessary', 'updated_at']


class BlockedUserSerializer(serializers.ModelSerializer):
    blocked_user = UserPublicSerializer(source='blocked', read_only=True)

    class Meta:
        model = BlockedUser
        fields = ['id', 'blocked', 'blocked_user', 'created_at', 'reason']
        read_only_fields = ['id', 'created_at']
