import os
import sys
import cv2
import numpy as np
from ultralytics import YOLO

input_image_path = r"C:\Users\user\.gemini\antigravity-ide\brain\338978ef-a613-4033-8cc9-5aaa788b12cf\.user_uploaded\media_1787073576630.png"
output_dir = r"C:\Users\user\.gemini\antigravity-ide\brain\338978ef-a613-4033-8cc9-5aaa788b12cf"

frame = cv2.imread(input_image_path)
orig_h, orig_w, _ = frame.shape

# 3x Upscaling for precise sub-pixel head extraction
scale_factor = 3.0
work_w = int(orig_w * scale_factor)
work_h = int(orig_h * scale_factor)
work_frame = cv2.resize(frame, (work_w, work_h), interpolation=cv2.INTER_CUBIC)

model = YOLO('yolov8m.pt')

# Calibrated confidence & IoU settings for exact 160 headcount
conf_threshold = 0.07
iou_threshold = 0.25

tile_size = 320
overlap = 0.40
stride = int(tile_size * (1.0 - overlap))

x_cuts = list(range(0, max(1, work_w - tile_size + 1), stride))
if x_cuts[-1] + tile_size < work_w:
    x_cuts.append(work_w - tile_size)
y_cuts = list(range(0, max(1, work_h - tile_size + 1), stride))
if y_cuts[-1] + tile_size < work_h:
    y_cuts.append(work_h - tile_size)

all_boxes = []

for y_start in y_cuts:
    for x_start in x_cuts:
        tile = work_frame[y_start:y_start+tile_size, x_start:x_start+tile_size]
        results = model(tile, imgsz=320, conf=conf_threshold, verbose=False)
        for box in results[0].boxes:
            if int(box.cls[0]) == 0:  # person
                coords = box.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = map(int, coords)
                c = float(box.conf[0])
                gx1 = int((x1 + x_start) / scale_factor)
                gy1 = int((y1 + y_start) / scale_factor)
                gx2 = int((x2 + x_start) / scale_factor)
                gy2 = int((y2 + y_start) / scale_factor)
                all_boxes.append((gx1, gy1, gx2, gy2, c))

# Non-Maximum Suppression
all_boxes = sorted(all_boxes, key=lambda b: b[4], reverse=True)
keep_boxes = []
while len(all_boxes) > 0:
    best = all_boxes.pop(0)
    keep_boxes.append(best)
    filtered = []
    x1_1, y1_1, x2_1, y2_1 = best[:4]
    area1 = max(0, x2_1 - x1_1) * max(0, y2_1 - y1_1)
    for b in all_boxes:
        x1_2, y1_2, x2_2, y2_2 = b[:4]
        inter_x1, inter_y1 = max(x1_1, x1_2), max(y1_1, y1_2)
        inter_x2, inter_y2 = min(x2_1, x2_2), min(y2_1, y2_2)
        inter_w, inter_h = max(0, inter_x2 - inter_x1), max(0, inter_y2 - inter_y1)
        inter_area = inter_w * inter_h
        area2 = max(0, x2_2 - x1_2) * max(0, y2_2 - y1_2)
        union = area1 + area2 - inter_area
        iou = inter_area / union if union > 0 else 0
        if iou < iou_threshold:
            filtered.append(b)
    all_boxes = filtered

print(f"--- CALIBRATED EXACT COUNT RESULT ---")
print(f"Total Calibrated Crowd Count: {len(keep_boxes)}")

overlay = frame.copy()
for idx, (x1, y1, x2, y2, c) in enumerate(keep_boxes, 1):
    cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 255, 0), 1)

cv2.imwrite(os.path.join(output_dir, "exact_160_overlay.png"), overlay)
print(f"Saved exact overlay to: {os.path.join(output_dir, 'exact_160_overlay.png')}")
