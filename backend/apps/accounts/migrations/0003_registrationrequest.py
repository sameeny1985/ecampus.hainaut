from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='RegistrationRequest',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('first_name', models.CharField(max_length=150, verbose_name='Prénom')),
                ('last_name', models.CharField(max_length=150, verbose_name='Nom')),
                ('personal_email', models.EmailField(max_length=254, verbose_name='Adresse e-mail personnelle / Google')),
                ('academic_year', models.CharField(default='1ere', max_length=20, verbose_name='Année académique')),
                ('bachelor', models.CharField(max_length=120, verbose_name='Filière / Bachelier')),
                ('status', models.CharField(choices=[('pending', 'En attente'), ('approved', 'Approuvée'), ('rejected', 'Refusée')], default='pending', max_length=20)),
                ('assigned_institutional_email', models.EmailField(blank=True, max_length=254, verbose_name='E-mail institutionnel attribué')),
                ('assigned_temporary_password', models.CharField(blank=True, max_length=128, verbose_name='Mot de passe temporaire attribué')),
                ('moderator_note', models.TextField(blank=True, verbose_name='Note / Statut envoyé au candidat')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_registration_requests', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': "Demande d'inscription (1re année)",
                'verbose_name_plural': "Demandes d'inscription (1re année)",
                'ordering': ['-created_at'],
            },
        ),
    ]
