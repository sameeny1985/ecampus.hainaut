import re
from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django.core.exceptions import ValidationError
from django.utils.safestring import mark_safe
from .models import User, Profile, BlockedUser, CookieConsent

INSTITUTIONAL_DOMAIN = "@hainaut-ea.be"
EMAIL_LOCAL_PART_RE = re.compile(r"^[a-zA-Z0-9._-]+$")


class LockedDomainEmailWidget(forms.TextInput):
    """نمایش فیلد ایمیل با برچسب قفل‌شده @hainaut-ea.be در کنار آن"""
    def __init__(self, domain=INSTITUTIONAL_DOMAIN, attrs=None):
        self.domain = domain
        default_attrs = {
            "placeholder": "prenom.nom",
            "style": "border-top-right-radius: 0; border-bottom-right-radius: 0;",
        }
        if attrs:
            default_attrs.update(attrs)
        super().__init__(attrs=default_attrs)

    def render(self, name, value, attrs=None, renderer=None):
        input_html = super().render(name, value, attrs=attrs, renderer=renderer)
        badge_html = (
            f'<span style="'
            f"display:inline-flex;align-items:center;padding:6px 10px;"
            f"background:#f3f4f6;border:1px solid #ccc;border-left:0;"
            f"font-family:monospace;font-size:13px;color:#374151;user-select:none;"
            f'">{self.domain}</span>'
        )
        return mark_safe(
            f'<div style="display:inline-flex;align-items:center;">{input_html}{badge_html}</div>'
        )


class InstitutionalEmailMixin:
    """قفل کردن دامنه @hainaut-ea.be برای فرم‌های ایجاد و ویرایش کاربر در ادمین"""
    email_local_part = forms.CharField(
        label="Adresse e-mail institutionnelle",
        required=True,
        widget=LockedDomainEmailWidget(),
        help_text=f"Saisissez uniquement la partie avant {INSTITUTIONAL_DOMAIN} (ex. : prenom.nom).",
    )

    def _init_email_local_part(self):
        existing_email = (getattr(self.instance, "email", "") or "").strip().lower()
        if existing_email:
            if existing_email.endswith(INSTITUTIONAL_DOMAIN):
                self.fields["email_local_part"].initial = existing_email[
                    : -len(INSTITUTIONAL_DOMAIN)
                ]
            elif "@" in existing_email:
                self.fields["email_local_part"].initial = existing_email.split("@", 1)[0]
            else:
                self.fields["email_local_part"].initial = existing_email

        if "email" in self.fields:
            self.fields["email"].widget = forms.HiddenInput()
            self.fields["email"].required = False

    def clean_email_local_part(self):
        raw_value = (self.cleaned_data.get("email_local_part") or "").strip().lower()

        if "@" in raw_value:
            local_part, domain_part = raw_value.split("@", 1)
            if domain_part and f"@{domain_part}" != INSTITUTIONAL_DOMAIN:
                raise ValidationError(
                    f"Le domaine doit obligatoirement être {INSTITUTIONAL_DOMAIN}."
                )
            raw_value = local_part.strip()

        if not raw_value:
            raise ValidationError(f"Veuillez saisir la partie avant {INSTITUTIONAL_DOMAIN}.")

        if not EMAIL_LOCAL_PART_RE.match(raw_value):
            raise ValidationError(
                "Utilisez uniquement des lettres, chiffres, points (.), tirets (-) ou underscores (_)."
            )

        full_email = f"{raw_value}{INSTITUTIONAL_DOMAIN}"
        qs = User.objects.filter(email__iexact=full_email)
        if self.instance and self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise ValidationError("Un utilisateur avec cette adresse e-mail existe déjà.")

        return raw_value

    def clean(self):
        cleaned_data = super().clean()
        local_part = cleaned_data.get("email_local_part")
        if local_part:
            full_email = f"{local_part}{INSTITUTIONAL_DOMAIN}"
            cleaned_data["email"] = full_email
            self.instance.email = full_email
        return cleaned_data

    def save(self, commit=True):
        instance = super().save(commit=False)
        local_part = self.cleaned_data.get("email_local_part")
        if local_part:
            instance.email = f"{local_part}{INSTITUTIONAL_DOMAIN}"
        if commit:
            instance.save()
            self.save_m2m()
        return instance


class CustomUserCreationForm(InstitutionalEmailMixin, UserCreationForm):
    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'role')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._init_email_local_part()


class CustomUserChangeForm(InstitutionalEmailMixin, UserChangeForm):
    class Meta:
        model = User
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._init_email_local_part()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm

    list_display = ('email', 'first_name', 'last_name', 'role', 'status', 'is_active', 'date_joined')
    list_filter = ('role', 'status', 'is_active', 'date_joined')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('last_name', 'first_name')

    fieldsets = (
        (None, {'fields': ('email_local_part', 'email', 'password')}),
        ('Informations personnelles', {'fields': ('first_name', 'last_name', 'role', 'status')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('RGPD', {'fields': ('privacy_accepted', 'terms_accepted', 'privacy_accepted_at', 'cookie_preferences')}),
        ('Dates', {'fields': ('last_login', 'last_activity', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email_local_part', 'email', 'first_name', 'last_name', 'role', 'password1', 'password2'),
        }),
    )


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'bachelor', 'visibility', 'updated_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name')


@admin.register(BlockedUser)
class BlockedUserAdmin(admin.ModelAdmin):
    list_display = ('blocker', 'blocked', 'created_at')
    search_fields = ('blocker__email', 'blocked__email')


@admin.register(CookieConsent)
class CookieConsentAdmin(admin.ModelAdmin):
    list_display = ('user', 'analytics', 'functional', 'updated_at')
