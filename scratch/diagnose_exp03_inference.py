import os
import sys
import glob
import cv2
import torch
import numpy as np
from ultralytics import YOLO

# Add backend to path for importing tiled inference engine if needed
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
try:
    from detection.yolo_detector import YOLOCrowdDetector
except ImportError:
    YOLOCrowdDetector = None

def run_diagnostics():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    exp03_weights = os.path.join(project_root, 'models', 'shanghaitech', 'yolo', 'experiment_03', 'best.pt')
    
    if not os.path.exists(exp03_weights):
        exp03_weights = os.path.join(project_root, 'runs', 'detect', 'models', 'shanghaitech', 'yolo', 'experiment_03', 'runs', 'shanghaitech_yolo_run', 'weights', 'best.pt')

    print(f"Loading Experiment 03 Checkpoint: {exp03_weights}")
    model = YOLO(exp03_weights)

    val_img_dir = os.path.join(project_root, 'dataset', 'processed', 'shanghaitech', 'part_A', 'yolo', 'images', 'val')
    val_lbl_dir = os.path.join(project_root, 'dataset', 'processed', 'shanghaitech', 'part_A', 'yolo', 'labels', 'val')
    val_img_paths = sorted(glob.glob(os.path.join(val_img_dir, '*.jpg')))

    print(f"Found {len(val_img_paths)} validation images.")

    # 1. CLASS ID VERIFICATION
    print("\n==================================================")
    print("STEP 1: CLASS ID VERIFICATION")
    print("==================================================")
    print(f"Model Names Dictionary: {model.names}")
    
    # 2. CONFIDENCE THRESHOLD ANALYSIS (conf = 0.001, 0.01, 0.05, 0.10, 0.25, 0.50)
    conf_thresholds = [0.001, 0.01, 0.05, 0.10, 0.25, 0.50]
    conf_results = {}

    print("\n==================================================")
    print("STEP 2: CONFIDENCE THRESHOLD ANALYSIS (60 Validation Images)")
    print("==================================================")

    for conf in conf_thresholds:
        total_detections = 0
        mae_list = []

        for img_path in val_img_paths:
            basename = os.path.basename(img_path)
            lbl_name = os.path.splitext(basename)[0] + '.txt'
            lbl_path = os.path.join(val_lbl_dir, lbl_name)

            gt_count = 0
            if os.path.exists(lbl_path):
                with open(lbl_path, 'r') as f:
                    gt_count = len([l for l in f.readlines() if l.strip()])

            results = model.predict(img_path, conf=conf, imgsz=1024, verbose=False)
            det_count = len(results[0].boxes) if len(results) > 0 else 0
            total_detections += det_count
            mae_list.append(abs(det_count - gt_count))

        avg_det = total_detections / float(len(val_img_paths))
        mae = np.mean(mae_list)
        conf_results[conf] = {'total_dets': total_detections, 'avg_dets': avg_det, 'mae': mae}
        print(f"Conf Threshold: {conf:6.3f} | Total Detections: {total_detections:6d} | Avg Pred Count: {avg_det:6.2f} | MAE: {mae:6.2f}")

    # 3. DIRECT INFERENCE DETAIL ON 20 VALIDATION IMAGES AT LOW CONF (0.001) vs HIGH CONF (0.25)
    print("\n==================================================")
    print("STEP 3: 20-IMAGE DETAILED INFERENCE DIAGNOSIS (conf=0.001 & conf=0.25)")
    print("==================================================")
    
    sample_20 = val_img_paths[:20]
    table_rows = []

    for img_path in sample_20:
        basename = os.path.basename(img_path)
        lbl_name = os.path.splitext(basename)[0] + '.txt'
        lbl_path = os.path.join(val_lbl_dir, lbl_name)

        gt_count = 0
        if os.path.exists(lbl_path):
            with open(lbl_path, 'r') as f:
                gt_count = len([l for l in f.readlines() if l.strip()])

        # Low conf predict
        res_low = model.predict(img_path, conf=0.001, imgsz=1024, verbose=False)[0]
        confs_low = res_low.boxes.conf.cpu().numpy() if len(res_low.boxes) > 0 else np.array([])
        raw_dets = len(confs_low)
        min_c = confs_low.min() if raw_dets > 0 else 0.0
        max_c = confs_low.max() if raw_dets > 0 else 0.0
        avg_c = confs_low.mean() if raw_dets > 0 else 0.0

        # Std conf predict (0.25)
        res_std = model.predict(img_path, conf=0.25, imgsz=1024, verbose=False)[0]
        final_dets = len(res_std.boxes)

        table_rows.append({
            'image': basename,
            'gt_count': gt_count,
            'raw_dets_001': raw_dets,
            'min_conf': min_c,
            'max_conf': max_c,
            'avg_conf': avg_c,
            'final_dets_25': final_dets,
            'abs_error_25': abs(final_dets - gt_count)
        })

        print(f"{basename:25s} | GT: {gt_count:4d} | Raw (conf 0.001): {raw_dets:5d} | Conf Range: [{min_c:.4f} - {max_c:.4f}] | Avg Conf: {avg_c:.4f} | Final (conf 0.25): {final_dets:4d}")

    # 4. TILED INFERENCE & CROSS-TILE NMS ANALYSIS
    print("\n==================================================")
    print("STEP 4: TILED INFERENCE vs DIRECT INFERENCE COMPARISON")
    print("==================================================")
    
    detector = None
    if YOLOCrowdDetector is not None:
        try:
            detector = YOLOCrowdDetector(model_path=exp03_weights, conf_thresh=0.05, iou_thresh=0.50)
            print("Successfully initialized YOLOCrowdDetector.")
        except Exception as e:
            print(f"Could not initialize YOLOCrowdDetector: {e}")

    for img_path in val_img_paths[:5]:
        basename = os.path.basename(img_path)
        img = cv2.imread(img_path)
        h, w = img.shape[:2]

        # Direct prediction
        res_dir = model.predict(img_path, conf=0.05, imgsz=1024, verbose=False)[0]
        dir_count = len(res_dir.boxes)

        tiled_count = "N/A"
        if detector is not None:
            try:
                count, bboxes, confs = detector.detect_tiled(img, tile_size=1024, overlap=0.20)
                tiled_count = count
            except Exception as e:
                tiled_count = f"Error ({e})"

        print(f"Image: {basename:25s} ({w}x{h}) | Direct (conf=0.05): {dir_count:4d} | Tiled (conf=0.05): {tiled_count}")

    # 5. BOX SIZE & IOU ANALYSIS
    print("\n==================================================")
    print("STEP 5: BOUNDING BOX SIZE & IOU ANALYSIS")
    print("==================================================")

    all_pred_widths = []
    all_gt_widths = []

    for img_path in val_img_paths[:10]:
        basename = os.path.basename(img_path)
        lbl_name = os.path.splitext(basename)[0] + '.txt'
        lbl_path = os.path.join(val_lbl_dir, lbl_name)
        img = cv2.imread(img_path)
        if img is None:
            continue
        h, w = img.shape[:2]

        if os.path.exists(lbl_path):
            with open(lbl_path, 'r') as f:
                lines = [l.strip() for l in f.readlines() if l.strip()]
            for line in lines:
                parts = line.split()
                if len(parts) == 5:
                    all_gt_widths.append(float(parts[3]) * w)

        res = model.predict(img_path, conf=0.001, imgsz=1024, verbose=False)[0]
        if len(res.boxes) > 0:
            boxes = res.boxes.xywh.cpu().numpy()
            for b in boxes:
                all_pred_widths.append(b[2])

    print(f"Average Ground-Truth Box Width (Original Image Space) : {np.mean(all_gt_widths):.2f}px")
    print(f"Average Predicted Box Width (conf=0.001)               : {np.mean(all_pred_widths) if len(all_pred_widths) > 0 else 0.0:.2f}px")

if __name__ == '__main__':
    run_diagnostics()
