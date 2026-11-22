"""
Management command to create a superuser from environment variables.
Usage: python manage.py create_admin
"""
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Create a superuser from environment variables'

    def handle(self, *args, **options):
        User = get_user_model()
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@univ.fr')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'Admin1234!')
        first_name = os.environ.get('DJANGO_SUPERUSER_FIRST_NAME', 'Admin')
        last_name = os.environ.get('DJANGO_SUPERUSER_LAST_NAME', 'CampusConnect')

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'User {email} already exists. Skipping.'))
            return

        User.objects.create_superuser(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
        self.stdout.write(self.style.SUCCESS(f'Superuser {email} created successfully.'))
