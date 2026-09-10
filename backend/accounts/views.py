from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import random
import threading
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import (
    RegisterSerializer, UserSerializer, MyTokenObtainPairSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer
)
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

def ensure_demo_role_accounts():
    """Seeds default demo accounts for all 4 user roles if they don't exist."""
    demo_accounts = [
        ('admin', 'admin@crowdguard.org', 'admin123', 'admin', 'National Tourism Command'),
        ('sitemanager', 'manager@crowdguard.org', 'manager123', 'site_manager', 'Central Shrine Plaza'),
        ('emergency', 'emergency@crowdguard.org', 'emergency123', 'emergency_service', 'Pilgrimage Medical & Rescue Post'),
        ('visitor', 'visitor@crowdguard.org', 'visitor123', 'visitor', 'Shrine Pilgrim Corridor'),
    ]
    for username, email, password, role, loc in demo_accounts:
        if not User.objects.filter(username=username).exists():
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role=role,
                assigned_location=loc
            )
            if role == 'admin':
                user.is_staff = True
                user.is_superuser = True
                user.save()

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        ensure_demo_role_accounts()
        return super().post(request, *args, **kwargs)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user_data = UserSerializer(user).data

        # Thread-safe helper to send email
        def send_welcome_email_task(subject, message, recipient_list):
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=recipient_list,
                    fail_silently=False,
                )
            except Exception as e:
                logger.error(f"Failed to send email to {recipient_list}: {str(e)}")

        # 1. Send credentials to newly created user
        subject = 'Welcome to CrowdGuard - Your Account Credentials'
        message = (
            f"Hello {user.username},\n\n"
            f"An account has been created for you on the Crowd Management System.\n\n"
            f"Here are your login credentials:\n"
            f"Username: {user.username}\n"
            f"Password: {request.data.get('password')}\n"
            f"Role: {user.get_role_display()}\n\n"
            f"Please log in and change your password as soon as possible.\n\n"
            f"Best regards,\n"
            f"CrowdGuard Admin Team"
        )
        recipient_list = [user.email]

        # Spawn background thread for new user
        import threading
        if user.email:
            thread = threading.Thread(
                target=send_welcome_email_task,
                args=(subject, message, recipient_list)
            )
            thread.daemon = True
            thread.start()

        # 2. Send notice alert email to system administrators
        admin_emails = list(User.objects.filter(role='admin').values_list('email', flat=True))
        admin_emails = [email for email in admin_emails if email]

        if admin_emails:
            admin_subject = f"[ADMIN INFO] New System User Registered: {user.username}"
            admin_message = (
                f"CrowdGuard Security Access Notification\n"
                f"=========================================\n\n"
                f"A new user account has been registered on the platform:\n"
                f"Username: {user.username}\n"
                f"Email: {user.email or 'N/A'}\n"
                f"Access Role: {user.get_role_display()}\n\n"
                f"This log was generated automatically on user creation.\n"
            )
            admin_thread = threading.Thread(
                target=send_welcome_email_task,
                args=(admin_subject, admin_message, admin_emails)
            )
            admin_thread.daemon = True
            admin_thread.start()

        return Response({
            "message": "User registered successfully, credentials dispatched asynchronously.",
            "user": user_data
        }, status=status.HTTP_201_CREATED)

class UserMeView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        # Allow listing only if requesting user is admin
        if self.request.user.role == 'admin':
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

class UserDeleteView(generics.DestroyAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.IsAuthenticated,)

    def destroy(self, request, *args, **kwargs):
        # Allow deletion only if requesting user is admin
        if request.user.role != 'admin':
            return Response({"error": "Only administrators can delete accounts"}, status=status.HTTP_403_FORBIDDEN)
            
        instance = self.get_object()
        # Prevent self-deletion
        if instance.id == request.user.id:
            return Response({"error": "You cannot delete your own account"}, status=status.HTTP_400_BAD_REQUEST)
            
        self.perform_destroy(instance)
        return Response({"message": "User deleted successfully"}, status=status.HTTP_200_OK)


from .models import AuditLog
from .serializers import AuditLogSerializer

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def log_logout_view(request):
    """
    API view to log when a user logs out of their session.
    """
    ip = None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    user_agent = request.META.get('HTTP_USER_AGENT', '')[:255]
    
    AuditLog.objects.create(user=request.user, action='logout', ip_address=ip, user_agent=user_agent)
    return Response({"message": "Logout logged successfully"}, status=status.HTTP_200_OK)

class AuditLogListView(generics.ListAPIView):
    """
    API endpoint that returns the audit log trail.
    Admins see all logs, regular users see only their own.
    """
    serializer_class = AuditLogSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return AuditLog.objects.all()
        return AuditLog.objects.filter(user=self.request.user)


class PasswordResetRequestView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email)
            otp = f"{random.randint(100000, 999999)}"
            user.reset_otp = otp
            user.reset_otp_created_at = timezone.now()
            user.save()

            def send_reset_email_task(user_email, user_name, reset_code):
                try:
                    subject = 'CrowdGuard AI - Password Reset Code'
                    message = (
                        f"Hello {user_name},\n\n"
                        f"You have requested to reset your password on CrowdGuard AI.\n\n"
                        f"Your 6-digit password reset code is:\n\n"
                        f"   {reset_code}\n\n"
                        f"This code will expire in 15 minutes.\n"
                        f"If you did not request a password reset, please ignore this email.\n\n"
                        f"Best regards,\n"
                        f"CrowdGuard AI Security Team"
                    )
                    send_mail(
                        subject=subject,
                        message=message,
                        from_email=settings.EMAIL_HOST_USER,
                        recipient_list=[user_email],
                        fail_silently=False,
                    )
                except Exception as e:
                    logger.error(f"Failed to send password reset email to {user_email}: {str(e)}")

            thread = threading.Thread(
                target=send_reset_email_task,
                args=(user.email, user.username, otp)
            )
            thread.daemon = True
            thread.start()

        except User.DoesNotExist:
            pass

        return Response({
            "message": "If an account with that email exists, a password reset code has been sent."
        }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        otp = serializer.validated_data['otp']
        new_password = serializer.validated_data['new_password']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "Invalid email or reset code."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.reset_otp or user.reset_otp != otp:
            return Response({"error": "Invalid reset code."}, status=status.HTTP_400_BAD_REQUEST)

        if user.reset_otp_created_at:
            if timezone.now() - user.reset_otp_created_at > timedelta(minutes=15):
                return Response({"error": "Reset code has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.reset_otp = None
        user.reset_otp_created_at = None
        user.save()

        ip = None
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:255]

        AuditLog.objects.create(user=user, action='password_reset', ip_address=ip, user_agent=user_agent)

        return Response({"message": "Password reset successfully. You can now log in with your new password."}, status=status.HTTP_200_OK)


