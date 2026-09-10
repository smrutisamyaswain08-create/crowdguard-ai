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

full_img = cv2.imread(input_image_path)
if full_img is None:
    print("Could not load image!")
    sys.exit(1)

h, w, _ = full_img.shape

# Test Image 1: Full Image
img1 = full_img.copy()

# Test Image 2: Half Crop (Left half only - should detect ~half the crowd)
img2 = full_img[:, :w//2].copy()

# Test Image 3: Quarter Crop (Top-Left quadrant - should detect ~quarter of crowd)
img3 = full_img[:h//2, :w//2].copy()

detector = YoloDetector()

print("--- TESTING DYNAMIC YOLO HEADCOUNT ACROSS DIFFERENT IMAGES ---")
c1, d1, _, _ = detector.process_frame(img1)
print(f"Image 1 (Full Image {w}x{h}): {c1} people detected")

c2, d2, _, _ = detector.process_frame(img2)
print(f"Image 2 (Left Half Crop {w//2}x{h}): {c2} people detected")

c3, d3, _, _ = detector.process_frame(img3)
print(f"Image 3 (Top-Left Quarter Crop {w//2}x{h//2}): {c3} people detected")

print("\n--- TESTING DYNAMIC CSRNet DENSITY ACROSS DIFFERENT IMAGES ---")
csr_c1, _, _, _ = detector.process_image_only_csrnet(img1)
print(f"CSRNet Image 1 (Full Image): {csr_c1} people estimated")

csr_c2, _, _, _ = detector.process_image_only_csrnet(img2)
print(f"CSRNet Image 2 (Left Half Crop): {csr_c2} people estimated")

csr_c3, _, _, _ = detector.process_image_only_csrnet(img3)
print(f"CSRNet Image 3 (Top-Left Quarter Crop): {csr_c3} people estimated")
