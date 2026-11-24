from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Create notifications table if missing'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS notifications_notification (
                    id UUID PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL DEFAULT '',
                    link VARCHAR(255) NOT NULL DEFAULT '/messages',
                    is_read BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    recipient_id UUID NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
                    sender_id UUID REFERENCES accounts_user(id) ON DELETE SET NULL
                );
            """)
        self.stdout.write(self.style.SUCCESS('Notifications table ready.'))
