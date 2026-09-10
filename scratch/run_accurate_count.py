import os
import sys
import cv2

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crowd_management.settings')

import django
django.setup()

from detection.yolo_detector import YoloDetector

input_image_path = r"C:\Users\user\.gemini\antigravity-ide\brain\338978ef-a613-4033-8cc9-5aaa788b12cf\.user_uploaded\media_1787073576630.png"

frame = cv2.imread(input_image_path)
if frame is None:
    print("Could not load image!")
    sys.exit(1)

detector = YoloDetector()

# 1. Multi-scale Tiled YOLO Headcount
yolo_count, avg_density, _, _ = detector.process_frame(frame)

# 2. CSRNet Density Map Estimate
csrnet_count, _, _, _ = detector.process_image_only_csrnet(frame)

print(f"YOLOv8 Head Detection Count: {yolo_count}")
print(f"CSRNet Density Estimation Count: {csrnet_count}")
print(f"Average Density: {avg_density:.4f}")
