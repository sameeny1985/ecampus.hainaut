from rest_framework import generics, views, permissions, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer, UserMiniSerializer
from .cloudinary_utils import upload_file
from apps.notifications.models import Notification

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
            conv.trashed_by.remove(request.user)
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
        queryset = Message.objects.filter(conversation_id=conv_id, conversation__participants=self.request.user)
        queryset.exclude(sender=self.request.user).filter(is_read=False).update(is_read=True)
        return queryset

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

        # اگر گفتگو در سطل زباله بود، با ارسال پیام جدید به صندوق اصلی برگردد
        conv.trashed_by.clear()
        conv.save()

        sender_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email
        preview = content[:80] if content else "Pièce jointe envoyée"
        for participant in conv.participants.exclude(id=request.user.id):
            Notification.objects.create(
                recipient=participant,
                sender=request.user,
                title=f"Nouveau message de {sender_name}",
                message=preview,
                link="/messages"
            )

        return Response(MessageSerializer(msg, context={'request': request}).data, status=201)


class ConversationTrashToggleView(views.APIView):
    """انتقال گفتگو به سطل زباله یا بازگرداندن آن"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conversation_id):
        conv = get_object_or_404(Conversation, id=conversation_id, participants=request.user)
        action = request.data.get('action', 'trash')
        if action == 'restore':
            conv.trashed_by.remove(request.user)
            return Response({'message': 'Conversation restaurée.', 'is_trashed': False})
        else:
            conv.trashed_by.add(request.user)
            return Response({'message': 'Conversation déplacée dans la corbeille.', 'is_trashed': True})


class ConversationPermanentDeleteView(views.APIView):
    """حذف دائمی گفتگو از سطل زباله برای کاربر جاری"""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, conversation_id):
        conv = get_object_or_404(Conversation, id=conversation_id, participants=request.user)
        conv.trashed_by.remove(request.user)
        conv.participants.remove(request.user)
        if conv.participants.count() == 0:
            conv.delete()
        return Response({'message': 'Conversation supprimée définitivement.'}, status=status.HTTP_200_OK)
