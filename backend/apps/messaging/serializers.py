from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Conversation, Message

User = get_user_model()


class UserMiniSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'role']


class MessageSerializer(serializers.ModelSerializer):
    sender_detail = UserMiniSerializer(source='sender', read_only=True)
    file_url = serializers.SerializerMethodField()
    display_content = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'content', 'display_content', 'file', 'file_url', 'sender', 'sender_detail', 'created_at', 'is_read']
        read_only_fields = ['sender', 'created_at', 'is_read']

    def get_file_url(self, obj):
        if '[FILE]' in (obj.content or ''):
            return obj.content.split('[FILE]')[-1].strip()
        return None

    def get_display_content(self, obj):
        if '[FILE]' in (obj.content or ''):
            return obj.content.split('[FILE]')[0].strip()
        return obj.content


class ConversationSerializer(serializers.ModelSerializer):
    participants_detail = UserMiniSerializer(source='participants', many=True, read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'participants_detail', 'last_message', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return MessageSerializer(msg, context=self.context).data
        return None
