"""
Force create messaging tables if they don't exist.
Usage: python manage.py create_messaging_tables
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Create messaging tables if missing'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Conversation table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS messaging_conversation (
                    id UUID PRIMARY KEY,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                );
            """)
            # M2M table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS messaging_conversation_participants (
                    id SERIAL PRIMARY KEY,
                    conversation_id UUID NOT NULL REFERENCES messaging_conversation(id) ON DELETE CASCADE,
                    user_id UUID NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
                    UNIQUE(conversation_id, user_id)
                );
            """)
            # Message table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS messaging_message (
                    id UUID PRIMARY KEY,
                    content TEXT NOT NULL DEFAULT '',
                    file VARCHAR(100),
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    is_read BOOLEAN NOT NULL DEFAULT FALSE,
                    conversation_id UUID NOT NULL REFERENCES messaging_conversation(id) ON DELETE CASCADE,
                    sender_id UUID NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE
                );
            """)
        self.stdout.write(self.style.SUCCESS('Messaging tables created (or already exist).'))
