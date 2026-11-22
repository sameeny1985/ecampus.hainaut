from rest_framework import generics, views, permissions, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer, UserMiniSerializer

User = get_user_model()


class UserListView(generics.ListAPIView):
    """List all users for selecting message recipients"""
    serializer_class = UserMiniSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return User.objects.filter(is_active=True).exclude(id=self.request.user.id).order_by('last_name', 'first_name')


class ConversationListCreateView(generics.ListCreateAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user)

    def create(self, request, *args, **kwargs):
        recipient_id = request.data.get('recipient_id')
        if not recipient_id:
            return Response({'error': 'recipient_id required'}, status=400)
        try:
            recipient = User.objects.get(id=recipient_id, is_active=True)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        # Check if conversation already exists
        existing = Conversation.objects.filter(participants=request.user).filter(participants=recipient)
        if existing.exists():
            conv = existing.first()
        else:
            conv = Conversation.objects.create()
            conv.participants.add(request.user, recipient)

        return Response(ConversationSerializer(conv, context={'request': request}).data, status=201)


class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conv_id = self.kwargs['conversation_id']
        return Message.objects.filter(conversation_id=conv_id, conversation__participants=self.request.user)

    def perform_create(self, serializer):
        conv_id = self.kwargs['conversation_id']
        conv = Conversation.objects.get(id=conv_id, participants=self.request.user)
        serializer.save(sender=self.request.user, conversation=conv)
        conv.save()  # update updated_at
