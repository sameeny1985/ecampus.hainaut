"""
Temporary endpoint to set password for a user (for debugging only).
DELETE THIS AFTER FIXING LOGIN.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import get_user_model

User = get_user_model()


class SetPasswordDebugView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        secret = request.data.get('secret')
        if secret != 'campusconnect-debug-2026':
            return Response({'error': 'Forbidden'}, status=403)

        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        if not email or not password:
            return Response({'error': 'email and password required'}, status=400)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        user.set_password(password)
        user.is_active = True
        user.status = 'active'
        user.save()
        return Response({
            'ok': True,
            'email': user.email,
            'message': 'Password set successfully'
        })
