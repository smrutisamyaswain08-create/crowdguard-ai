import os
import sys
import cv2

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crowd_management.settings')

import django
django.setup()

from detection.yolo_detector import YoloDetector

input_image_path = r"C:\Users\user\.gemini\antigravity-ide\brain\338978ef-a613-4033-8cc9-5aaa788b12cf\.user_uploaded\media_1787077285869.png"
output_dir = r"C:\Users\user\.gemini\antigravity-ide\brain\338978ef-a613-4033-8cc9-5aaa788b12cf"

frame = cv2.imread(input_image_path)
if frame is None:
    print("Could not load image!")
    sys.exit(1)

h, w, _ = frame.shape
print(f"Loaded image: {w}x{h}")

detector = YoloDetector()

print("Running YOLOv8 Multi-Scale Tiled Detection...")
yolo_count, yolo_density, yolo_heatmap, yolo_overlay = detector.process_frame(frame)

print("Running CSRNet Density Map Estimation...")
csr_count, csr_density, csr_heatmap, csr_overlay = detector.process_image_only_csrnet(frame)

print("\n--- DETECTION RESULTS ---")
print(f"YOLOv8 Head Detection Count: {yolo_count}")
print(f"CSRNet Spatial Density Count: {csr_count}")
print(f"Average Density: {yolo_density:.4f}")

yolo_overlay_path = os.path.join(output_dir, "new_image_yolo_overlay.png")
csr_overlay_path = os.path.join(output_dir, "new_image_csr_overlay.png")
csr_heatmap_path = os.path.join(output_dir, "new_image_csr_heatmap.png")

cv2.imwrite(yolo_overlay_path, yolo_overlay)
cv2.imwrite(csr_overlay_path, csr_overlay)
cv2.imwrite(csr_heatmap_path, csr_heatmap)

print(f"Saved YOLO overlay to: {yolo_overlay_path}")
print(f"Saved CSRNet overlay to: {csr_overlay_path}")
print(f"Saved CSRNet heatmap to: {csr_heatmap_path}")
