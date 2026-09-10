import os
import sys
import cv2

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crowd_management.settings')

import django
django.setup()

from detection.yolo_detector import YoloDetector

input_image_path = r"C:\Users\user\.gemini\antigravity-ide\brain\338978ef-a613-4033-8cc9-5aaa788b12cf\.user_uploaded\media_1787078683925.png"
output_dir = r"C:\Users\user\.gemini\antigravity-ide\brain\338978ef-a613-4033-8cc9-5aaa788b12cf"

frame = cv2.imread(input_image_path)
if frame is None:
    print("Could not load image!")
    sys.exit(1)

h, w, _ = frame.shape
print(f"Loaded Group Photo: {w}x{h}")

detector = YoloDetector()

# 1. Standard YOLOv8 detection pass (single pass & multi-scale)
print("Running YOLOv8 Person Detection...")
results = detector.model(frame, conf=0.25, verbose=False)
boxes = [b for b in results[0].boxes if int(b.cls[0]) == 0]
single_pass_count = len(boxes)

# 2. Detector process_frame
yolo_count, density, heatmap, overlay = detector.process_frame(frame, conf=0.12)

# 3. CSRNet density pass
csr_count, _, _, _ = detector.process_image_only_csrnet(frame)

print("\n--- DETECTION BREAKDOWN ---")
print(f"Standard YOLOv8 (conf=0.25): {single_pass_count} persons detected")
print(f"Multi-Scale Tiled YOLOv8 (process_frame): {yolo_count} persons detected")
print(f"CSRNet Density Estimation: {csr_count} persons estimated")

cv2.imwrite(os.path.join(output_dir, "group_photo_yolo_overlay.png"), overlay)
print(f"Saved overlay to: {os.path.join(output_dir, 'group_photo_yolo_overlay.png')}")
