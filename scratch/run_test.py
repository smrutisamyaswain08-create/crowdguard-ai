import os
import sys
import cv2

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_dir)

# Set DJANGO_SETTINGS_MODULE
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crowd_management.settings')

import django
django.setup()

from detection.yolo_detector import YoloDetector

input_image_path = r"C:\Users\user\.gemini\antigravity-ide\brain\338978ef-a613-4033-8cc9-5aaa788b12cf\.user_uploaded\media_1787073576630.png"
output_dir = r"C:\Users\user\.gemini\antigravity-ide\brain\338978ef-a613-4033-8cc9-5aaa788b12cf"

print(f"Loading input image from: {input_image_path}")
frame = cv2.imread(input_image_path)

if frame is None:
    print("Error: Could not load image!")
    sys.exit(1)

print(f"Image loaded successfully. Dimensions: {frame.shape[1]}x{frame.shape[0]}")

print("Initializing YOLO Detector...")
detector = YoloDetector()

print("Running crowd detection & multi-scale tiled inference...")
crowd_count, average_density, heatmap, overlay = detector.process_frame(frame, conf=0.12)

print("--- DETECTION RESULTS ---")
print(f"Total Crowd Count Detected: {crowd_count}")
print(f"Average Density (per 100x100px): {average_density:.4f}")
print(f"Model Used: {detector.model_name}")

overlay_path = os.path.join(output_dir, "yolo_test_overlay.png")
heatmap_path = os.path.join(output_dir, "yolo_test_heatmap.png")

cv2.imwrite(overlay_path, overlay)
cv2.imwrite(heatmap_path, heatmap)

print(f"Saved overlay image to: {overlay_path}")
print(f"Saved heatmap image to: {heatmap_path}")
