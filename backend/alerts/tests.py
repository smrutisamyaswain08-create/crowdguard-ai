from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

User = get_user_model()

class AlertsAPITests(APITestCase):
    def setUp(self):
        # Create an admin user and officer user
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='testpassword123',
            role='admin'
        )
        self.officer_user = User.objects.create_user(
            username='officer_test',
            email='officer@test.com',
            password='testpassword123',
            role='security_officer',
            assigned_location='West Sector'
        )
        self.login_url = reverse('token_obtain_pair')

    def test_send_officer_alert_email(self):
        # Obtain JWT Token
        login_response = self.client.post(self.login_url, {
            'username': 'admin_test',
            'password': 'testpassword123'
        })
        token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # Send alert warning email
        url = reverse('send_officer_alert')
        response = self.client.post(url, {
            'email': 'officer@test.com',
            'username': 'officer_test',
            'location': 'West Sector',
            'risk': 'medium',
            'count': 23
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('successfully emailed', response.data['message'])

        # Fail request if email is not provided
        response_fail = self.client.post(url, {
            'username': 'officer_test'
        })
        self.assertEqual(response_fail.status_code, status.HTTP_400_BAD_REQUEST)
