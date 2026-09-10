import os
import sys
import glob
import cv2
import numpy as np
import torch
from ultralytics import YOLO

# Initialize Django environment
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.append(backend_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crowd_management.settings')
import django
django.setup()

from detection.yolo_detector import YoloDetector




def run_complete_diagnosis():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    weights_path = os.path.join(project_root, 'models', 'shanghaitech', 'yolo', 'experiment_03', 'best.pt')
    if not os.path.exists(weights_path):
        weights_path = os.path.join(project_root, 'runs', 'detect', 'models', 'shanghaitech', 'yolo', 'experiment_03', 'runs', 'shanghaitech_yolo_run', 'weights', 'best.pt')

    print(f"Loading Model Weights: {weights_path}")
    model = YOLO(weights_path)
    detector = YoloDetector(model_path=weights_path)

    val_img_dir = os.path.join(project_root, 'dataset', 'processed', 'shanghaitech', 'part_A', 'yolo', 'images', 'val')
    val_lbl_dir = os.path.join(project_root, 'dataset', 'processed', 'shanghaitech', 'part_A', 'yolo', 'labels', 'val')
    val_img_paths = sorted(glob.glob(os.path.join(val_img_dir, '*.jpg')))

    debug_dir = os.path.join(project_root, 'dataset', 'processed', 'shanghaitech', 'part_A', 'yolo', 'experiment_03_inference_debug')
    os.makedirs(debug_dir, exist_ok=True)

    # 1. 20-IMAGE COMPARISON TABLE DATA GENERATION
    table_rows = []
    
    for img_path in val_img_paths[:20]:
        basename = os.path.basename(img_path)
        lbl_name = os.path.splitext(basename)[0] + '.txt'
        lbl_path = os.path.join(val_lbl_dir, lbl_name)
        
        img = cv2.imread(img_path)
        h, w = img.shape[:2]

        gt_count = 0
        if os.path.exists(lbl_path):
            with open(lbl_path, 'r') as f:
                gt_count = len([l for l in f.readlines() if l.strip()])

        # Direct prediction conf=0.001
        res_001 = model.predict(img_path, conf=0.001, imgsz=1024, verbose=False)[0]
        raw_dets = len(res_001.boxes)

        # Direct prediction conf=0.25 (default threshold)
        res_25 = model.predict(img_path, conf=0.25, imgsz=1024, verbose=False)[0]
        final_dets_25 = len(res_25.boxes)

        # Direct prediction conf=0.05
        res_05 = model.predict(img_path, conf=0.05, imgsz=1024, verbose=False)[0]
        direct_05 = len(res_05.boxes)

        # Tiled inference conf=0.05, tile=1024, overlap=0.20
        tiled_boxes = detector.predict_tiled(img, conf=0.05, tile_size=1024, overlap=0.20, iou_thresh=0.50)
        tiled_05 = len(tiled_boxes)

        abs_err = abs(tiled_05 - gt_count)

        table_rows.append({
            'image': basename,
            'gt_count': gt_count,
            'raw_dets': raw_dets,
            'final_25': final_dets_25,
            'direct_05': direct_05,
            'tiled_05': tiled_05,
            'abs_err': abs_err
        })

    print(f"\nCompleted 20-image analysis table.")

    # 2. DEBUG VISUALIZATIONS (Low, Medium, High density)
    print("Generating debug visual overlays (GT only, Raw predictions, Tiled predictions)...")

    # Select 1 low density, 1 medium density, 1 high density
    sorted_by_gt = sorted(table_rows, key=lambda x: x['gt_count'])
    selected_samples = [sorted_by_gt[0], sorted_by_gt[len(sorted_by_gt)//2], sorted_by_gt[-1]]

    for cat_name, item in zip(['low_density', 'med_density', 'high_density'], selected_samples):
        img_name = item['image']
        img_path = os.path.join(val_img_dir, img_name)
        lbl_path = os.path.join(val_lbl_dir, os.path.splitext(img_name)[0] + '.txt')

        img_orig = cv2.imread(img_path)
        h, w = img_orig.shape[:2]

        # 1. Ground Truth Only
        img_gt = img_orig.copy()
        if os.path.exists(lbl_path):
            with open(lbl_path, 'r') as f:
                lines = [l.strip() for l in f.readlines() if l.strip()]
            for line in lines:
                parts = line.split()
                if len(parts) == 5:
                    cx, cy, bw, bh = [float(x) for x in parts[1:]]
                    x1 = int((cx - bw/2) * w)
                    y1 = int((cy - bh/2) * h)
                    x2 = int((cx + bw/2) * w)
                    y2 = int((cy + bh/2) * h)
                    cv2.rectangle(img_gt, (x1, y1), (x2, y2), (0, 255, 0), 1)
        cv2.putText(img_gt, f"GT Count: {item['gt_count']}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2)
        cv2.imwrite(os.path.join(debug_dir, f"{cat_name}_1_gt_only.jpg"), img_gt)

        # 2. Raw Model Predictions (conf=0.001)
        img_raw = img_orig.copy()
        res_raw = model.predict(img_path, conf=0.001, imgsz=1024, verbose=False)[0]
        if len(res_raw.boxes) > 0:
            boxes = res_raw.boxes.xyxy.cpu().numpy()
            confs = res_raw.boxes.conf.cpu().numpy()
            for b, c in zip(boxes, confs):
                x1, y1, x2, y2 = [int(v) for v in b[:4]]
                cv2.rectangle(img_raw, (x1, y1), (x2, y2), (0, 165, 255), 1)
        cv2.putText(img_raw, f"Raw Pred Count (conf=0.001): {len(res_raw.boxes)} | GT: {item['gt_count']}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 165, 255), 2)
        cv2.imwrite(os.path.join(debug_dir, f"{cat_name}_2_raw_pred.jpg"), img_raw)

        # 3. Final Tiled Predictions (conf=0.05, NMS IoU=0.50)
        img_tiled = img_orig.copy()
        tiled_boxes = detector.predict_tiled(img_orig, conf=0.05, tile_size=1024, overlap=0.20, iou_thresh=0.50)
        for b in tiled_boxes:
            x1, y1, x2, y2 = [int(v) for v in b[:4]]
            cv2.rectangle(img_tiled, (x1, y1), (x2, y2), (0, 0, 255), 1)
        cv2.putText(img_tiled, f"Tiled Pred Count (conf=0.05): {len(tiled_boxes)} | GT: {item['gt_count']} | Err: {abs(len(tiled_boxes) - item['gt_count'])}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2)
        cv2.imwrite(os.path.join(debug_dir, f"{cat_name}_3_tiled_final.jpg"), img_tiled)

    print(f"Saved 9 debug images to {debug_dir}")

    # Output Markdown Table
    print("\n==================================================")
    print("20-IMAGE VALIDATION DIAGNOSTIC TABLE")
    print("==================================================")
    print(f"| Image | GT Count | Raw Dets (conf=0.001) | Final Dets (conf=0.25) | Direct Count (conf=0.05) | Tiled Count (conf=0.05) | Absolute Error |")
    print(f"| :--- | :--- | :--- | :--- | :--- | :--- | :--- |")
    for r in table_rows:
        print(f"| `{r['image']}` | {r['gt_count']} | {r['raw_dets']} | {r['final_25']} | {r['direct_05']} | {r['tiled_05']} | {r['abs_err']} |")

if __name__ == '__main__':
    run_complete_diagnosis()
