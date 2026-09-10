from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager

class CustomUserManager(UserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('role', 'admin')
        return super().create_superuser(username, email, password, **extra_fields)

class User(AbstractUser):
    ROLE_CHOICES = (
        ('visitor', 'Visitor / Tourist / Pilgrim'),
        ('site_manager', 'Site Manager / Tourism Authority'),
        ('emergency_service', 'Emergency Services / First Responder'),
        ('admin', 'Government / Event Admin'),
        ('security_officer', 'Security Officer'), # preserved for backward compatibility
    )
    
    role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES,
        default='visitor'
    )
    email = models.EmailField(unique=True)
    assigned_location = models.CharField(
        max_length=100,
        blank=True,
        default='Central Plaza'
    )
    reset_otp = models.CharField(max_length=6, blank=True, null=True)
    reset_otp_created_at = models.DateTimeField(blank=True, null=True)

    objects = CustomUserManager()

    # Use email for extra uniqueness or standard username is fine.
    # AbstractUser already provides id, username, first_name, last_name, password, is_staff, is_active, date_joined.

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


from django.conf import settings

class AuditLog(models.Model):
    ACTION_CHOICES = (
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('threshold_update', 'Threshold Update'),
        ('password_reset', 'Password Reset'),
    )
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.action} at {self.timestamp}"


