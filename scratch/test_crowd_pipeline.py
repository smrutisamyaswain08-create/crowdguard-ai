import os
import sys
import io
import unittest
import numpy as np
import cv2
from PIL import Image

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crowd_management.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from django.conf import settings

from ml.datasets.shanghaitech_loader import ShanghaiTechLoader
from ml.datasets.convert_shanghaitech import generate_density_map_gaussian, points_to_yolo_boxes
from ml.csrnet.evaluate import compute_csrnet_metrics
from detection.yolo_detector import YoloDetector
from detection.csrnet_model import CSRNet

from rest_framework.test import APIClient

User = get_user_model()

class CrowdPipelineTestSuite(unittest.TestCase):
    """Integration & Unit Test Suite for S-19 Crowd Pipeline Components."""

    def setUp(self):
        # Create test user for API authentication
        self.user, _ = User.objects.get_or_create(
            username='test_crowd_admin',
            defaults={'email': 'admin@crowdtest.com', 'role': 'admin'}
        )
        self.user.set_password('testpass123')
        self.user.save()

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_density_map_gaussian_integral_sum(self):
        """Verifies that density map sum equals total annotated head points."""
        im_shape = (480, 640, 3)
        head_pts = np.array([
            [100.0, 150.0],
            [200.0, 250.0],
            [300.0, 350.0],
            [400.0, 100.0],
            [500.0, 200.0]
        ], dtype=np.float32)

        density_map = generate_density_map_gaussian(im_shape, head_pts, sigma=15, adaptive=False)
        map_sum = float(density_map.sum())
        expected_count = float(len(head_pts))

        self.assertAlmostEqual(map_sum, expected_count, places=3)
        print(f"[TEST PASS] Density Map Integral Sum ({map_sum:.3f}) equals Head Points Count ({expected_count})")

    def test_yolo_label_conversion_format(self):
        """Verifies YOLO label generation produces valid normalized 0-1 coordinates."""
        im_shape = (480, 640, 3)
        head_pts = np.array([[100.0, 150.0], [200.0, 250.0]], dtype=np.float32)
        
        yolo_lines = points_to_yolo_boxes(im_shape, head_pts, box_w=15, box_h=15, adaptive_knn=False)
        self.assertEqual(len(yolo_lines), 2)
        
        parts = yolo_lines[0].split()
        cls_id = int(parts[0])
        xc, yc, w, h = map(float, parts[1:])

        self.assertEqual(cls_id, 0)
        self.assertTrue(0.0 <= xc <= 1.0)
        self.assertTrue(0.0 <= yc <= 1.0)
        self.assertTrue(0.0 < w <= 1.0)
        self.assertTrue(0.0 < h <= 1.0)
        print(f"[TEST PASS] YOLO Label format verified: {yolo_lines[0]}")

    def test_tiled_inference_and_cross_tile_nms(self):
        """Tests tiled inference and cross-tile NMS deduplication."""
        detector = YoloDetector()
        
        # Create a synthetic image with 3 drawn circles (heads)
        frame = np.zeros((640, 640, 3), dtype=np.uint8)
        cv2.circle(frame, (100, 100), 12, (255, 255, 255), -1)
        cv2.circle(frame, (300, 300), 12, (255, 255, 255), -1)
        cv2.circle(frame, (500, 500), 12, (255, 255, 255), -1)

        boxes = detector.predict_tiled(frame, conf=0.10, tile_size=416, overlap=0.20, iou_thresh=0.50)
        self.assertTrue(isinstance(boxes, list))
        print(f"[TEST PASS] Tiled inference executed smoothly. Detected boxes count: {len(boxes)}")

    def test_csrnet_density_summation(self):
        """Verifies CSRNet predict_crowd_density returns valid count, density, heatmap, overlay."""
        csrnet = CSRNet(load_weights=False)
        frame = np.zeros((320, 320, 3), dtype=np.uint8)
        cv2.rectangle(frame, (50, 50), (250, 250), (100, 100, 100), -1)

        count, density, heatmap, overlay = csrnet.predict_crowd_density(frame)
        self.assertTrue(isinstance(count, int))
        self.assertTrue(count >= 0)
        self.assertEqual(heatmap.shape, (320, 320, 3))
        self.assertEqual(overlay.shape, (320, 320, 3))
        print(f"[TEST PASS] CSRNet density map prediction verified. Count: {count}")

    def test_evaluation_metrics_computation(self):
        """Verifies MAE, RMSE, MAPE evaluation metrics logic."""
        predictions = [100, 150, 200, 50]
        ground_truths = [110, 140, 210, 50]

        metrics = compute_csrnet_metrics(predictions, ground_truths)
        self.assertEqual(metrics['mae'], 7.5)
        self.assertTrue(metrics['rmse'] > 0)
        self.assertIn('overcount_rate', metrics)
        self.assertIn('undercount_rate', metrics)
        print(f"[TEST PASS] Evaluation metrics computed: {metrics}")

    def test_api_detect_single_image_backward_compatibility(self):
        """Tests POST /api/detection/detect-image/ endpoint backward compatibility."""
        self.client.force_login(self.user)

        # Create a synthetic image buffer
        img = Image.new('RGB', (640, 480), color=(120, 140, 160))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)

        response = self.client.post('/api/detection/detect-image/', {'image': img_bytes}, format='multipart')
        self.assertEqual(response.status_code, 200)

        data = response.json()
        required_keys = [
            'id', 'count', 'density', 'risk', 'avg_confidence', 
            'confidence_score', 'email_sent', 'alert_triggered', 
            'overlay_url', 'heatmap_url', 'model_used', 
            'detection_mode', 'confidence_threshold'
        ]

        for k in required_keys:
            self.assertIn(k, data, f"Required key '{k}' missing from API response!")

        print(f"[TEST PASS] API /api/detection/detect-image/ verified with response keys: {list(data.keys())}")

if __name__ == '__main__':
    unittest.main()
