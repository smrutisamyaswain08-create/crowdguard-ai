from django.test import TestCase
from django.conf import settings
from datetime import timedelta
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()

class SimpleJWTConfigTest(TestCase):
    def test_token_lifetime(self):
        self.assertEqual(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'], timedelta(hours=4))
        self.assertEqual(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'], timedelta(hours=4))

class PasswordResetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testofficer',
            email='officer@example.com',
            password='OldPassword123'
        )

    def test_password_reset_flow(self):
        # 1. Request password reset
        response = self.client.post('/api/auth/password-reset/request/', {
            'email': 'officer@example.com'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Refresh user from DB to obtain generated OTP
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.reset_otp)
        self.assertEqual(len(self.user.reset_otp), 6)

        # 2. Confirm password reset with incorrect OTP
        fail_response = self.client.post('/api/auth/password-reset/confirm/', {
            'email': 'officer@example.com',
            'otp': '000000',
            'new_password': 'NewPassword123'
        }, format='json')
        self.assertEqual(fail_response.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Confirm password reset with valid OTP
        success_response = self.client.post('/api/auth/password-reset/confirm/', {
            'email': 'officer@example.com',
            'otp': self.user.reset_otp,
            'new_password': 'NewPassword123'
        }, format='json')
        self.assertEqual(success_response.status_code, status.HTTP_200_OK)

        # 4. Verify login with new password
        login_response = self.client.post('/api/auth/login/', {
            'username': 'testofficer',
            'password': 'NewPassword123'
        }, format='json')
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

