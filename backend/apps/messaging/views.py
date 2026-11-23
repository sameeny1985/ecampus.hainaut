from rest_framework import generics, views, permissions, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import get_user_model
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer, UserMiniSerializer
from .cloudinary_utils import upload_file

User = get_user_model()


class UserListView(generics.ListAPIView):
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
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        conv_id = self.kwargs['conversation_id']
        return Message.objects.filter(conversation_id=conv_id, conversation__participants=self.request.user)

    def create(self, request, *args, **kwargs):
        conv_id = self.kwargs['conversation_id']
        try:
            conv = Conversation.objects.get(id=conv_id, participants=request.user)
        except Conversation.DoesNotExist:
            return Response({'error': 'Conversation not found'}, status=404)

        content = request.data.get('content', '')
        file = request.FILES.get('file')
        file_url = None
        if file:
            file_url = upload_file(file, folder='messages')

        msg = Message.objects.create(
            conversation=conv,
            sender=request.user,
            content=content,
        )
        # Store Cloudinary URL in a simple way (override file field or use content)
        if file_url:
            msg.content = (content + '\n' if content else '') + f'[FILE]{file_url}'
            msg.save()

        conv.save()
        return Response(MessageSerializer(msg, context={'request': request}).data, status=201)