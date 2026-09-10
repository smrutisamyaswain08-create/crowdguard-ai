from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    MyTokenObtainPairView, RegisterView, UserMeView, UserListView, 
    UserDeleteView, log_logout_view, AuditLogListView,
    PasswordResetRequestView, PasswordResetConfirmView
)

urlpatterns = [
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('me/', UserMeView.as_view(), name='auth_me'),
    path('logout/', log_logout_view, name='auth_logout'),
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('audit-logs/', AuditLogListView.as_view(), name='audit_logs'),
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/<int:pk>/', UserDeleteView.as_view(), name='user_delete'),
]

