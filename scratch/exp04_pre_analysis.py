import os
import sys
import glob
import cv2
import math
import numpy as np
import torch
from ultralytics import YOLO

def run_pre_analysis():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    exp03_weights = os.path.join(project_root, 'models', 'shanghaitech', 'yolo', 'experiment_03', 'best.pt')
    if not os.path.exists(exp03_weights):
        exp03_weights = os.path.join(project_root, 'runs', 'detect', 'models', 'shanghaitech', 'yolo', 'experiment_03', 'runs', 'shanghaitech_yolo_run', 'weights', 'best.pt')

    exp03_model = YOLO(exp03_weights)

    train_img_dir = os.path.join(project_root, 'dataset', 'processed', 'shanghaitech', 'part_A', 'yolo', 'images', 'train')
    train_lbl_dir = os.path.join(project_root, 'dataset', 'processed', 'shanghaitech', 'part_A', 'yolo', 'labels', 'train')
    val_img_dir = os.path.join(project_root, 'dataset', 'processed', 'shanghaitech', 'part_A', 'yolo', 'images', 'val')
    val_lbl_dir = os.path.join(project_root, 'dataset', 'processed', 'shanghaitech', 'part_A', 'yolo', 'labels', 'val')

    train_imgs = sorted(glob.glob(os.path.join(train_img_dir, '*.jpg')))
    val_imgs = sorted(glob.glob(os.path.join(val_img_dir, '*.jpg')))
    all_imgs = train_imgs + val_imgs

    # 1. GROUND TRUTH BOX STATS (Original & Normalized)
    gt_widths_orig = []
    gt_heights_orig = []
    head_counts_train = []
    head_counts_val = []

    for img_path in all_imgs:
        is_train = 'train' in img_path
        lbl_dir = train_lbl_dir if is_train else val_lbl_dir
        basename = os.path.basename(img_path)
        lbl_name = os.path.splitext(basename)[0] + '.txt'
        lbl_path = os.path.join(lbl_dir, lbl_name)

        img = cv2.imread(img_path)
        if img is None:
            continue
        h, w = img.shape[:2]

        cnt = 0
        if os.path.exists(lbl_path):
            with open(lbl_path, 'r') as f:
                lines = [l.strip() for l in f.readlines() if l.strip()]
            for line in lines:
                parts = line.split()
                if len(parts) == 5:
                    bw = float(parts[3]) * w
                    bh = float(parts[4]) * h
                    gt_widths_orig.append(bw)
                    gt_heights_orig.append(bh)
                    cnt += 1

        if is_train:
            head_counts_train.append(cnt)
        else:
            head_counts_val.append(cnt)

    arr_gt_w = np.array(gt_widths_orig)
    arr_gt_h = np.array(gt_heights_orig)

    print("==================================================")
    print("STEP 1: GROUND TRUTH BOX SIZE STATISTICS")
    print("==================================================")
    print(f"Total GT Boxes Analyzed : {len(arr_gt_w)}")
    print(f"GT Box Width (Original) : Mean = {arr_gt_w.mean():.2f}px, Median = {np.median(arr_gt_w):.2f}px, Min = {arr_gt_w.min():.2f}px, Max = {arr_gt_w.max():.2f}px")
    print(f"GT Box Height (Original): Mean = {arr_gt_h.mean():.2f}px, Median = {np.median(arr_gt_h):.2f}px, Min = {arr_gt_h.min():.2f}px, Max = {arr_gt_h.max():.2f}px")

    # 2. BOX SIZE CONSISTENCY & RATIO ANALYSIS (EXP 03 Predictions vs GT)
    print("\n==================================================")
    print("STEP 2: PREDICTED vs GROUND TRUTH BOX SIZE RATIO ANALYSIS")
    print("==================================================")
    
    pred_widths = []
    pred_heights = []
    width_ratios = []
    height_ratios = []

    for img_path in val_imgs[:20]:
        img = cv2.imread(img_path)
        h, w = img.shape[:2]
        basename = os.path.basename(img_path)
        lbl_name = os.path.splitext(basename)[0] + '.txt'
        lbl_path = os.path.join(val_lbl_dir, lbl_name)

        gt_w_img = []
        gt_h_img = []
        if os.path.exists(lbl_path):
            with open(lbl_path, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) == 5:
                        gt_w_img.append(float(parts[3]) * w)
                        gt_h_img.append(float(parts[4]) * h)

        if not gt_w_img:
            continue
        avg_gt_w_img = np.mean(gt_w_img)
        avg_gt_h_img = np.mean(gt_h_img)

        res = exp03_model.predict(img_path, conf=0.04, imgsz=1024, verbose=False)[0]
        if len(res.boxes) > 0:
            boxes_wh = res.boxes.xywh.cpu().numpy()
            for b in boxes_wh:
                pw = b[2] * (w / 1024.0)
                ph = b[3] * (h / 1024.0)
                pred_widths.append(pw)
                pred_heights.append(ph)
                width_ratios.append(pw / avg_gt_w_img)
                height_ratios.append(ph / avg_gt_h_img)

    arr_rw = np.array(width_ratios)
    arr_rh = np.array(height_ratios)

    print(f"Average Predicted Box Width  : {np.mean(pred_widths):.2f}px")
    print(f"Average Predicted Box Height : {np.mean(pred_heights):.2f}px")
    print(f"Width Ratio (Pred / GT)      : Mean = {arr_rw.mean():.2f}x, Median = {np.median(arr_rw):.2f}x, P25 = {np.percentile(arr_rw, 25):.2f}x, P75 = {np.percentile(arr_rw, 75):.2f}x, P90 = {np.percentile(arr_rw, 90):.2f}x")
    print(f"Height Ratio (Pred / GT)     : Mean = {arr_rh.mean():.2f}x, Median = {np.median(arr_rh):.2f}x, P25 = {np.percentile(arr_rh, 25):.2f}x, P75 = {np.percentile(arr_rh, 75):.2f}x, P90 = {np.percentile(arr_rh, 90):.2f}x")

    # 3. POINT-BASED LOCALIZATION DIAGNOSTIC AT DISTANCE THRESHOLDS
    print("\n==================================================")
    print("STEP 3: POINT-BASED LOCALIZATION DIAGNOSTIC")
    print("==================================================")

    dist_thresholds = [5.0, 10.0, 15.0, 20.0, 30.0, 50.0]
    total_preds = 0
    total_gts = 0

    preds_within = {d: 0 for d in dist_thresholds}
    gts_within = {d: 0 for d in dist_thresholds}

    for img_path in val_imgs:
        img = cv2.imread(img_path)
        h, w = img.shape[:2]
        basename = os.path.basename(img_path)
        lbl_name = os.path.splitext(basename)[0] + '.txt'
        lbl_path = os.path.join(val_lbl_dir, lbl_name)

        gt_pts = []
        if os.path.exists(lbl_path):
            with open(lbl_path, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) == 5:
                        gt_pts.append((float(parts[1]) * w, float(parts[2]) * h))

        res = exp03_model.predict(img_path, conf=0.04, imgsz=1024, verbose=False)[0]
        pred_pts = []
        if len(res.boxes) > 0:
            boxes_xyxy = res.boxes.xyxy.cpu().numpy()
            for b in boxes_xyxy:
                cx = (b[0] + b[2]) / 2.0 * (w / 1024.0)
                cy = (b[1] + b[3]) / 2.0 * (h / 1024.0)
                pred_pts.append((cx, cy))

        total_preds += len(pred_pts)
        total_gts += len(gt_pts)

        for px, py in pred_pts:
            if gt_pts:
                min_d = min([math.sqrt((px - gx)**2 + (py - gy)**2) for gx, gy in gt_pts])
                for d in dist_thresholds:
                    if min_d <= d:
                        preds_within[d] += 1

        for gx, gy in gt_pts:
            if pred_pts:
                min_d = min([math.sqrt((gx - px)**2 + (gy - py)**2) for px, py in pred_pts])
                for d in dist_thresholds:
                    if min_d <= d:
                        gts_within[d] += 1

    print(f"Total Validation Predictions (conf=0.04): {total_preds} | Total GT Heads: {total_gts}")
    for d in dist_thresholds:
        p_d = (preds_within[d] / float(total_preds) * 100.0) if total_preds > 0 else 0.0
        r_d = (gts_within[d] / float(total_gts) * 100.0) if total_gts > 0 else 0.0
        print(f"  Threshold <= {d:2.0f}px : Precision = {p_d:5.2f}% ({preds_within[d]}/{total_preds}) | Recall = {r_d:5.2f}% ({gts_within[d]}/{total_gts})")

    # 4. TRAINING & VALIDATION LABEL DENSITY ANALYSIS
    print("\n==================================================")
    print("STEP 4: TRAINING & VALIDATION DENSITY DISTRIBUTION")
    print("==================================================")
    
    arr_tr = np.array(head_counts_train)
    arr_va = np.array(head_counts_val)

    print(f"Train Dataset (240 images) : Min = {arr_tr.min()}, Max = {arr_tr.max()}, Mean = {arr_tr.mean():.1f}, Median = {np.median(arr_tr):.1f}, P90 = {np.percentile(arr_tr, 90):.1f}, P95 = {np.percentile(arr_tr, 95):.1f}, P99 = {np.percentile(arr_tr, 99):.1f}")
    print(f"Val Dataset   (60 images)  : Min = {arr_va.min()}, Max = {arr_va.max()}, Mean = {arr_va.mean():.1f}, Median = {np.median(arr_va):.1f}, P90 = {np.percentile(arr_va, 90):.1f}, P95 = {np.percentile(arr_va, 95):.1f}, P99 = {np.percentile(arr_va, 99):.1f}")
    print(f"Maximum heads in a single training image: {arr_tr.max()}")

if __name__ == '__main__':
    run_pre_analysis()
