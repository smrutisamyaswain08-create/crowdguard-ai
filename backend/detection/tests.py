from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from camera.models import Camera
from detection.models import Detection
from alerts.models import Alert
from reports.models import Report

User = get_user_model()

class CrowdManagementSystemTests(APITestCase):
    def setUp(self):
        # Create users
        self.admin_user = User.objects.create_superuser(
            username='admin_test',
            email='admin@test.com',
            password='testpassword123',
            role='admin'
        )
        self.officer_user = User.objects.create_user(
            username='officer_test',
            email='officer@test.com',
            password='testpassword123',
            role='security_officer'
        )
        
        # Create camera
        self.camera = Camera.objects.create(
            name='Test Terminal Cam',
            location='Gate B Arrival Hall',
            status='online'
        )
        
        # Get login token for auth
        self.login_url = reverse('token_obtain_pair')
        response = self.client.post(self.login_url, {
            'username': 'officer_test',
            'password': 'testpassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.access_token = response.data['access']
        
        # Authenticate client
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')

    def test_camera_crud_operations(self):
        # Create a new camera
        url = reverse('camera_list_create')
        data = {
            'name': 'New Testing Camera',
            'location': 'Loading Dock Zone',
            'status': 'online'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Camera.objects.count(), 2)

        # Toggle status
        toggle_url = reverse('camera_toggle_status', kwargs={'pk': self.camera.id})
        response = self.client.post(toggle_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.camera.refresh_from_db()
        self.assertEqual(self.camera.status, 'offline')

    def test_detection_logging_and_alert_triggers(self):
        # Create a low risk detection
        det_low = Detection.objects.create(
            camera=self.camera,
            count=35,
            density=0.05,
            risk='low'
        )
        self.assertEqual(det_low.risk, 'low')
        
        # Verify no active alerts are triggered for low risk
        self.assertEqual(Alert.objects.filter(detection=det_low).count(), 0)

        # Create a critical risk detection
        det_crit = Detection.objects.create(
            camera=self.camera,
            count=320,
            density=0.55,
            risk='critical'
        )
        
        # Simulate active alerts triggered on view level
        # In views.py, critical triggers both evacuation and restricted_entry alerts
        Alert.objects.create(detection=det_crit, alert_type='evacuation')
        Alert.objects.create(detection=det_crit, alert_type='restricted_entry')
        
        self.assertEqual(Alert.objects.filter(detection=det_crit).count(), 2)
        
        # Test Resolve Alert view
        active_alert = Alert.objects.filter(detection=det_crit, resolved=False).first()
        resolve_url = reverse('alert_resolve', kwargs={'pk': active_alert.id})
        
        response = self.client.post(resolve_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        active_alert.refresh_from_db()
        self.assertTrue(active_alert.resolved)

    def test_analytics_dashboard_endpoints(self):
        # Trigger summary view
        url = reverse('dashboard_summary')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('active_cameras', response.data)
        
        # Trigger trends view
        trends_url = reverse('crowd_trends')
        response = self.client.get(trends_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('labels', response.data)

    def test_report_generation(self):
        # Generate CSV Report
        url = reverse('report_generate')
        response = self.client.post(url, {
            'report_type': 'daily',
            'format': 'csv'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv')

        # Generate PDF Report
        response = self.client.post(url, {
            'report_type': 'weekly',
            'format': 'pdf'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        
        # Verify Report model records saved
        self.assertEqual(Report.objects.count(), 2)

    def test_report_sharing(self):
        # 1. Create a report to share
        report = Report.objects.create(report_type='daily')
        from django.core.files.base import ContentFile
        report.file.save("test_report.pdf", ContentFile(b"fake pdf content"))
        report.save()

        # 2. Try to share as non-admin (officer_user is currently authenticated)
        share_url = reverse('report_share', kwargs={'report_id': report.id})
        response = self.client.post(share_url, {'email': 'recipient@example.com'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Authenticate as admin
        admin_login_response = self.client.post(self.login_url, {
            'username': 'admin_test',
            'password': 'testpassword123'
        })
        self.assertEqual(admin_login_response.status_code, status.HTTP_200_OK)
        admin_token = admin_login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')

        # 4. Try to share as admin
        response = self.client.post(share_url, {'email': 'recipient@example.com'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('successfully shared', response.data['message'])

    def test_manage_thresholds(self):
        # 1. Retrieve current thresholds (by default should be 50, 150, 300)
        url = reverse('manage_thresholds')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['low_limit'], 50)
        self.assertEqual(response.data['medium_limit'], 150)
        self.assertEqual(response.data['high_limit'], 300)

        # 2. Try to update thresholds as non-admin (officer_user is currently authenticated)
        response = self.client.post(url, {
            'low_limit': 21,
            'medium_limit': 100,
            'high_limit': 250
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Authenticate as admin
        admin_login_response = self.client.post(self.login_url, {
            'username': 'admin_test',
            'password': 'testpassword123'
        })
        self.assertEqual(admin_login_response.status_code, status.HTTP_200_OK)
        admin_token = admin_login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')

        # 4. Update thresholds as admin (valid values)
        response = self.client.post(url, {
            'low_limit': 21,
            'medium_limit': 100,
            'high_limit': 250
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['low_limit'], 21)
        
        # Verify AuditLog created
        from accounts.models import AuditLog
        self.assertTrue(AuditLog.objects.filter(action='threshold_update', user=self.admin_user).exists())

        # 5. Try to update with invalid values (low_limit >= medium_limit)
        response = self.client.post(url, {
            'low_limit': 120,
            'medium_limit': 100,
            'high_limit': 250
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_detect_single_image_threshold_and_dashboard_update(self):
        import io
        from PIL import Image

        # Create a simple synthetic image in memory
        img = Image.new('RGB', (640, 480), color=(73, 109, 137))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)

        url = reverse('detect_single_image')
        response = self.client.post(url, {'image': img_bytes}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('density', response.data)
        self.assertIn('risk', response.data)
        self.assertIn('alert_triggered', response.data)

        # Check dashboard summary endpoint to verify average density and active alert counts
        summary_url = reverse('dashboard_summary')
        summary_res = self.client.get(summary_url)
        self.assertEqual(summary_res.status_code, status.HTTP_200_OK)
        self.assertIn('average_crowd_density', summary_res.data)
        self.assertIn('unresolved_alerts', summary_res.data)
        self.assertEqual(summary_res.data['average_crowd_density'], response.data['density'])

    def test_detect_single_image_high_precision(self):
        import io
        from PIL import Image

        # Create a synthetic high-resolution image in memory
        img = Image.new('RGB', (1280, 960), color=(100, 120, 140))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)

        url = reverse('detect_single_image')
        response = self.client.post(url, {
            'image': img_bytes,
            'high_precision': 'true',
            'confidence': '0.12'
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('model_used', response.data)
        self.assertIn('detection_mode', response.data)
        self.assertIn('avg_confidence', response.data)
        self.assertIn('confidence_score', response.data)
        self.assertTrue(isinstance(response.data['avg_confidence'], (int, float)))
        self.assertTrue(response.data['avg_confidence'] > 0.0)
        self.assertTrue(response.data['confidence_score'].endswith('%'))
        self.assertEqual(response.data['detection_mode'], "Tiled Sliced Multi-Scale Inference")
        self.assertEqual(response.data['confidence_threshold'], 0.12)


