import os
import sys
import cv2
import numpy as np
import torch
from ultralytics import YOLO

input_image_path = r"C:\Users\user\.gemini\antigravity-ide\brain\338978ef-a613-4033-8cc9-5aaa788b12cf\.user_uploaded\media_1787073576630.png"
output_dir = r"C:\Users\user\.gemini\antigravity-ide\brain\338978ef-a613-4033-8cc9-5aaa788b12cf"

frame = cv2.imread(input_image_path)
orig_h, orig_w, _ = frame.shape
print(f"Original image dimensions: {orig_w}x{orig_h}")

# Upscale image 3x for ultra-small head detection (targets 1935x1134)
scale_factor = 3.0
work_w = int(orig_w * scale_factor)
work_h = int(orig_h * scale_factor)
work_frame = cv2.resize(frame, (work_w, work_h), interpolation=cv2.INTER_CUBIC)

print(f"Upscaled image to: {work_w}x{work_h}")

model = YOLO('yolov8m.pt')

all_boxes = []
conf_threshold = 0.05
iou_threshold = 0.20

# 320x320 micro tiles with 40% overlap
tile_size = 320
overlap = 0.40
stride = int(tile_size * (1.0 - overlap))

x_cuts = list(range(0, max(1, work_w - tile_size + 1), stride))
if x_cuts[-1] + tile_size < work_w:
    x_cuts.append(work_w - tile_size)
y_cuts = list(range(0, max(1, work_h - tile_size + 1), stride))
if y_cuts[-1] + tile_size < work_h:
    y_cuts.append(work_h - tile_size)

print(f"Running micro-tiled inference across {len(x_cuts) * len(y_cuts)} tiles...")

for y_start in y_cuts:
    for x_start in x_cuts:
        tile = work_frame[y_start:y_start+tile_size, x_start:x_start+tile_size]
        results = model(tile, imgsz=320, conf=conf_threshold, verbose=False)
        for box in results[0].boxes:
            if int(box.cls[0]) == 0:  # person
                coords = box.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = map(int, coords)
                c = float(box.conf[0])
                # Scale back to original frame coordinates
                gx1 = int((x1 + x_start) / scale_factor)
                gy1 = int((y1 + y_start) / scale_factor)
                gx2 = int((x2 + x_start) / scale_factor)
                gy2 = int((y2 + y_start) / scale_factor)
                all_boxes.append((gx1, gy1, gx2, gy2, c))

# Apply NMS
all_boxes = sorted(all_boxes, key=lambda b: b[4], reverse=True)
keep_boxes = []
while len(all_boxes) > 0:
    best = all_boxes.pop(0)
    keep_boxes.append(best)
    # Filter IoU
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

print(f"--- MICRO-TILED HEAD DETECTION RESULT ---")
print(f"Total Detected Heads: {len(keep_boxes)}")

overlay = frame.copy()
for x1, y1, x2, y2, c in keep_boxes:
    cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 255, 255), 1)

cv2.imwrite(os.path.join(output_dir, "yolo_micro_overlay.png"), overlay)
print(f"Saved micro-tile detection overlay to: {os.path.join(output_dir, 'yolo_micro_overlay.png')}")
