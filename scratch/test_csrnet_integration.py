import os
import sys
import cv2

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crowd_management.settings')
import django
django.setup()

from detection.yolo_detector import YoloDetector

input_image_path = r"C:\Users\user\.gemini\antigravity-ide\brain\338978ef-a613-4033-8cc9-5aaa788b12cf\.user_uploaded\media_1787073576630.png"
output_dir = r"C:\Users\user\.gemini\antigravity-ide\brain\338978ef-a613-4033-8cc9-5aaa788b12cf"

frame = cv2.imread(input_image_path)
if frame is None:
    print("Failed to load image!")
    sys.exit(1)

print("Initializing YoloDetector with CSRNet integration...")
detector = YoloDetector()

print("Running CSRNet Density Estimation on high-density crowd image...")
crowd_count, avg_density, heatmap, overlay = detector.process_image_only_csrnet(frame)

print("\n--- CSRNet DENSITY ESTIMATION RESULTS ---")
print(f"Exact Integrated Crowd Headcount: {crowd_count}")
print(f"Average Density (per 100x100px): {avg_density:.4f}")

csr_overlay_path = os.path.join(output_dir, "csrnet_overlay.png")
csr_heatmap_path = os.path.join(output_dir, "csrnet_heatmap.png")

cv2.imwrite(csr_overlay_path, overlay)
cv2.imwrite(csr_heatmap_path, heatmap)

print(f"Saved CSRNet Overlay to: {csr_overlay_path}")
print(f"Saved CSRNet Heatmap to: {csr_heatmap_path}")
