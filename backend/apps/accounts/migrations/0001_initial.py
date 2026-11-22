# Generated manually for CampusConnect

import apps.accounts.models
import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('email', models.EmailField(db_index=True, max_length=254, unique=True, verbose_name='Adresse e-mail institutionnelle')),
                ('first_name', models.CharField(max_length=150, verbose_name='Prénom')),
                ('last_name', models.CharField(max_length=150, verbose_name='Nom')),
                ('role', models.CharField(choices=[('student', 'Étudiant'), ('teacher', 'Enseignant'), ('moderator', 'Modérateur'), ('admin', 'Administrateur')], default='student', max_length=20)),
                ('status', models.CharField(choices=[('active', 'Actif'), ('disabled', 'Désactivé'), ('pending', 'En attente')], default='active', max_length=20)),
                ('is_staff', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(default=True)),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now)),
                ('last_activity', models.DateTimeField(blank=True, null=True)),
                ('privacy_accepted', models.BooleanField(default=False)),
                ('terms_accepted', models.BooleanField(default=False)),
                ('privacy_accepted_at', models.DateTimeField(blank=True, null=True)),
                ('cookie_preferences', models.JSONField(blank=True, default=dict)),
                ('groups', models.ManyToManyField(blank=True, help_text='The groups this user belongs to.', related_name='user_set', related_query_name='user', to='auth.group', verbose_name='groups')),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.permission', verbose_name='user permissions')),
            ],
            options={
                'verbose_name': 'Utilisateur',
                'verbose_name_plural': 'Utilisateurs',
                'ordering': ['last_name', 'first_name'],
            },
            managers=[
                ('objects', apps.accounts.models.UserManager()),
            ],
        ),
        migrations.CreateModel(
            name='CookieConsent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session_key', models.CharField(blank=True, db_index=True, max_length=40)),
                ('necessary', models.BooleanField(default=True)),
                ('analytics', models.BooleanField(default=False)),
                ('functional', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='cookie_consent', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Consentement cookies',
                'verbose_name_plural': 'Consentements cookies',
            },
        ),
        migrations.CreateModel(
            name='Profile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('photo', models.ImageField(blank=True, null=True, upload_to='profiles/%Y/%m/')),
                ('bio', models.TextField(blank=True, max_length=500, verbose_name='Biographie')),
                ('bachelor', models.CharField(blank=True, max_length=100, verbose_name='Bachelier / Filière')),
                ('courses', models.JSONField(blank=True, default=list, verbose_name='Cours suivis')),
                ('visibility', models.CharField(choices=[('communities', 'Communautés uniquement'), ('institution', "Tout l'établissement"), ('private', 'Privé')], default='communities', max_length=20)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Profil',
                'verbose_name_plural': 'Profils',
            },
        ),
        migrations.CreateModel(
            name='BlockedUser',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('reason', models.CharField(blank=True, max_length=255)),
                ('blocked', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='blocked_by', to=settings.AUTH_USER_MODEL)),
                ('blocker', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='blocking', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Utilisateur bloqué',
                'verbose_name_plural': 'Utilisateurs bloqués',
                'ordering': ['-created_at'],
                'unique_together': {('blocker', 'blocked')},
            },
        ),
    ]
