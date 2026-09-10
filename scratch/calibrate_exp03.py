import os
import sys
import glob
import cv2
import csv
import math
import numpy as np
import yaml
import torch
from ultralytics import YOLO

# Initialize Django environment
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.append(backend_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crowd_management.settings')
import django
django.setup()

from detection.yolo_detector import YoloDetector

def compute_iou(box1, box2):
    x1_1, y1_1, x2_1, y2_1 = box1[:4]
    x1_2, y1_2, x2_2, y2_2 = box2[:4]
    
    inter_x1 = max(x1_1, x1_2)
    inter_y1 = max(y1_1, y1_2)
    inter_x2 = min(x2_1, x2_2)
    inter_y2 = min(y2_1, y2_2)
    
    inter_w = max(0, inter_x2 - inter_x1)
    inter_h = max(0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h
    
    area1 = max(0, x2_1 - x1_1) * max(0, y2_1 - y1_1)
    area2 = max(0, x2_2 - x1_2) * max(0, y2_2 - y1_2)
    
    union_area = area1 + area2 - inter_area
    if union_area <= 0:
        return 0.0
    return inter_area / union_area

def apply_nms(boxes, iou_threshold=0.50):
    if not boxes:
        return []
    boxes = sorted(boxes, key=lambda b: b[4], reverse=True)
    keep = []
    while len(boxes) > 0:
        best = boxes.pop(0)
        keep.append(best)
        boxes = [b for b in boxes if compute_iou(best, b) < iou_threshold]
    return keep

def center_distance_nms(boxes, dist_thresh=10.0):
    if not boxes:
        return []
    boxes = sorted(boxes, key=lambda b: b[4], reverse=True)
    keep = []
    centers = []
    for b in boxes:
        cx = (b[0] + b[2]) / 2.0
        cy = (b[1] + b[3]) / 2.0
        too_close = False
        for kcx, kcy in centers:
            dist = math.sqrt((cx - kcx)**2 + (cy - kcy)**2)
            if dist < dist_thresh:
                too_close = True
                break
        if not too_close:
            keep.append(b)
            centers.append((cx, cy))
    return keep

def run_fast_calibration():
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

    calibration_dir = os.path.join(project_root, 'dataset', 'processed', 'shanghaitech', 'part_A', 'yolo', 'calibration')
    debug_dir = os.path.join(project_root, 'dataset', 'processed', 'shanghaitech', 'part_A', 'yolo', 'calibration_debug')
    os.makedirs(calibration_dir, exist_ok=True)
    os.makedirs(debug_dir, exist_ok=True)

    val_gt = {}
    low_imgs, med_imgs, high_imgs = [], [], []

    for img_path in val_img_paths:
        basename = os.path.basename(img_path)
        lbl_name = os.path.splitext(basename)[0] + '.txt'
        lbl_path = os.path.join(val_lbl_dir, lbl_name)
        img = cv2.imread(img_path)
        h, w = img.shape[:2]

        gt_points = []
        if os.path.exists(lbl_path):
            with open(lbl_path, 'r') as f:
                lines = [l.strip() for l in f.readlines() if l.strip()]
            for line in lines:
                parts = line.split()
                if len(parts) == 5:
                    cx = float(parts[1]) * w
                    cy = float(parts[2]) * h
                    gt_points.append((cx, cy))

        gt_cnt = len(gt_points)
        val_gt[basename] = {'path': img_path, 'gt_count': gt_cnt, 'gt_points': gt_points, 'w': w, 'h': h}

        if gt_cnt < 300:
            low_imgs.append(basename)
        elif gt_cnt <= 700:
            med_imgs.append(basename)
        else:
            high_imgs.append(basename)

    print(f"Validation Stratification: {len(low_imgs)} Low (<300), {len(med_imgs)} Medium (300-700), {len(high_imgs)} High (>700).")

    # PRE-EXTRACT RAW TILED DETECTIONS (conf=0.001) FOR EACH IMAGE & CONFIGURATION
    print("\nPre-extracting raw tiled detections (conf=0.001) across 60 validation images...")
    
    # Store: raw_tiles_cache[(basename, tile_size, overlap)] = list of (x1, y1, x2, y2, conf)
    raw_tiles_cache = {}

    tile_configs = [
        (1024, 0.20), (512, 0.20), (768, 0.20),
        (1024, 0.10), (1024, 0.15), (1024, 0.25), (1024, 0.30)
    ]
    unique_configs = list(set(tile_configs))

    for idx, (t_sz, ov) in enumerate(unique_configs):
        print(f"  Pre-processing Tiled Config {idx+1}/{len(unique_configs)} (Tile: {t_sz}, Overlap: {ov:.2f})...")
        for k, info in val_gt.items():
            img = cv2.imread(info['path'])
            # Fetch raw tiled boxes at conf=0.001
            raw_b = detector.predict_tiled(img, conf=0.001, tile_size=t_sz, overlap=ov, iou_thresh=1.0)
            raw_tiles_cache[(k, t_sz, ov)] = raw_b

    print("Pre-extraction complete! Now evaluating calibration grids in memory...")

    def compute_counting_metrics(preds_dict, filter_keys=None):
        keys = filter_keys if filter_keys is not None else list(val_gt.keys())
        n = len(keys)
        if n == 0:
            return {}

        errors, sq_errors, p_errors, overcounts, undercounts = [], [], [], [], []
        total_dets = 0

        for k in keys:
            gt = val_gt[k]['gt_count']
            pred = preds_dict.get(k, 0)
            err = pred - gt
            abs_e = abs(err)

            errors.append(abs_e)
            sq_errors.append(err ** 2)
            p_errors.append(abs_e / max(1.0, float(gt)))

            if err > 0:
                overcounts.append(err)
            elif err < 0:
                undercounts.append(abs_e)

            total_dets += pred

        mae = float(np.mean(errors))
        rmse = float(np.sqrt(np.mean(sq_errors)))
        mape = float(np.mean(p_errors) * 100.0)

        avg_over = float(np.mean(overcounts)) if overcounts else 0.0
        avg_under = float(np.mean(undercounts)) if undercounts else 0.0

        return {
            'total_dets': total_dets,
            'avg_dets': total_dets / float(n),
            'mae': mae,
            'rmse': rmse,
            'mape': mape,
            'avg_overcount': avg_over,
            'avg_undercount': avg_under,
            'overcount_rate': float(len(overcounts)) / float(n) * 100.0,
            'undercount_rate': float(len(undercounts)) / float(n) * 100.0
        }

    # 1. CONFIDENCE THRESHOLD GRID EXPERIMENT
    print("\n==================================================")
    print("STEP 1: CONFIDENCE THRESHOLD GRID EXPERIMENT")
    print("==================================================")
    
    conf_grid = [0.005, 0.010, 0.015, 0.020, 0.025, 0.030, 0.035, 0.040, 0.050, 0.075, 0.100]
    conf_csv_path = os.path.join(calibration_dir, 'confidence_results.csv')

    conf_rows_out = []

    with open(conf_csv_path, 'w', newline='') as fcsv:
        writer = csv.writer(fcsv)
        writer.writerow(['conf', 'total_dets', 'avg_dets', 'mae', 'rmse', 'mape', 'avg_overcount', 'avg_undercount', 'overcount_rate', 'undercount_rate', 'mae_low', 'mae_med', 'mae_high'])

        for c_val in conf_grid:
            preds = {}
            for k in val_gt:
                raw_b = raw_tiles_cache[(k, 1024, 0.20)]
                filt_b = [b for b in raw_b if b[4] >= c_val]
                nms_b = apply_nms(filt_b, iou_threshold=0.50)
                preds[k] = len(nms_b)

            m_all = compute_counting_metrics(preds)
            m_low = compute_counting_metrics(preds, low_imgs)
            m_med = compute_counting_metrics(preds, med_imgs)
            m_high = compute_counting_metrics(preds, high_imgs)

            row = [c_val, m_all['total_dets'], m_all['avg_dets'], m_all['mae'], m_all['rmse'], m_all['mape'], m_all['avg_overcount'], m_all['avg_undercount'], m_all['overcount_rate'], m_all['undercount_rate'], m_low['mae'], m_med['mae'], m_high['mae']]
            writer.writerow(row)
            conf_rows_out.append(row)
            print(f"Conf: {c_val:5.3f} | Total Dets: {m_all['total_dets']:5d} | MAE: {m_all['mae']:6.2f} | RMSE: {m_all['rmse']:6.2f} | Low MAE: {m_low['mae']:6.2f} | Med MAE: {m_med['mae']:6.2f} | High MAE: {m_high['mae']:6.2f}")

    # 2. MAX_DET ANALYSIS EXPERIMENT (Direct)
    print("\n==================================================")
    print("STEP 2: MAX_DET ANALYSIS EXPERIMENT (Direct conf=0.03)")
    print("==================================================")
    max_det_vals = [300, 500, 1000, 2000]
    for md in max_det_vals:
        preds = {}
        for k, info in val_gt.items():
            res = model.predict(info['path'], conf=0.03, imgsz=1024, max_det=md, verbose=False)[0]
            preds[k] = len(res.boxes)
        m = compute_counting_metrics(preds)
        print(f"Max Det: {md:4d} | Direct Total Dets: {m['total_dets']:6d} | Avg: {m['avg_dets']:6.2f} | MAE: {m['mae']:6.2f}")

    # 3. TILE SIZE & OVERLAP EXPERIMENT
    print("\n==================================================")
    print("STEP 3: TILE SIZE & OVERLAP EXPERIMENT (conf=0.03, NMS IoU=0.50)")
    print("==================================================")
    
    tile_csv_path = os.path.join(calibration_dir, 'tile_results.csv')

    with open(tile_csv_path, 'w', newline='') as fcsv:
        writer = csv.writer(fcsv)
        writer.writerow(['tile_size', 'overlap', 'total_dets', 'mae', 'rmse', 'mape', 'avg_overcount', 'avg_undercount', 'mae_low', 'mae_med', 'mae_high'])

        for t_sz in [512, 768, 1024]:
            for ov in [0.10, 0.15, 0.20, 0.25, 0.30]:
                preds = {}
                for k in val_gt:
                    raw_b = raw_tiles_cache.get((k, t_sz, ov), [])
                    if not raw_b:
                        img = cv2.imread(val_gt[k]['path'])
                        raw_b = detector.predict_tiled(img, conf=0.001, tile_size=t_sz, overlap=ov, iou_thresh=1.0)
                        raw_tiles_cache[(k, t_sz, ov)] = raw_b
                    filt_b = [b for b in raw_b if b[4] >= 0.03]
                    nms_b = apply_nms(filt_b, iou_threshold=0.50)
                    preds[k] = len(nms_b)

                m_all = compute_counting_metrics(preds)
                m_low = compute_counting_metrics(preds, low_imgs)
                m_med = compute_counting_metrics(preds, med_imgs)
                m_high = compute_counting_metrics(preds, high_imgs)

                row = [t_sz, ov, m_all['total_dets'], m_all['mae'], m_all['rmse'], m_all['mape'], m_all['avg_overcount'], m_all['avg_undercount'], m_low['mae'], m_med['mae'], m_high['mae']]
                writer.writerow(row)
                print(f"Tile: {t_sz:4d} | Overlap: {ov:4.2f} | Total Dets: {m_all['total_dets']:6d} | MAE: {m_all['mae']:6.2f} | RMSE: {m_all['rmse']:6.2f}")

    # 4. NMS IOU & CENTER-DISTANCE EXPERIMENT
    print("\n==================================================")
    print("STEP 4: NMS IOU vs CENTER-DISTANCE EXPERIMENT (conf=0.03)")
    print("==================================================")
    
    nms_csv_path = os.path.join(calibration_dir, 'nms_results.csv')

    with open(nms_csv_path, 'w', newline='') as fcsv:
        writer = csv.writer(fcsv)
        writer.writerow(['method', 'param', 'total_dets', 'mae', 'rmse', 'mape', 'avg_overcount', 'avg_undercount', 'mae_low', 'mae_med', 'mae_high'])

        # IoU NMS
        for iou_v in [0.30, 0.40, 0.50, 0.60, 0.70]:
            preds = {}
            for k in val_gt:
                raw_b = raw_tiles_cache[(k, 1024, 0.20)]
                filt_b = [b for b in raw_b if b[4] >= 0.03]
                nms_b = apply_nms(filt_b, iou_threshold=iou_v)
                preds[k] = len(nms_b)

            m_all = compute_counting_metrics(preds)
            m_low = compute_counting_metrics(preds, low_imgs)
            m_med = compute_counting_metrics(preds, med_imgs)
            m_high = compute_counting_metrics(preds, high_imgs)

            row = ['iou_nms', iou_v, m_all['total_dets'], m_all['mae'], m_all['rmse'], m_all['mape'], m_all['avg_overcount'], m_all['avg_undercount'], m_low['mae'], m_med['mae'], m_high['mae']]
            writer.writerow(row)
            print(f"Method: IoU NMS ({iou_v:.2f}) | Total: {m_all['total_dets']:6d} | MAE: {m_all['mae']:6.2f} | RMSE: {m_all['rmse']:6.2f}")

        # Center Distance NMS
        for dist_v in [3, 5, 8, 10, 15]:
            preds = {}
            for k in val_gt:
                raw_b = raw_tiles_cache[(k, 1024, 0.20)]
                filt_b = [b for b in raw_b if b[4] >= 0.03]
                cd_b = center_distance_nms(filt_b, dist_thresh=float(dist_v))
                preds[k] = len(cd_b)

            m_all = compute_counting_metrics(preds)
            m_low = compute_counting_metrics(preds, low_imgs)
            m_med = compute_counting_metrics(preds, med_imgs)
            m_high = compute_counting_metrics(preds, high_imgs)

            row = ['center_dist', dist_v, m_all['total_dets'], m_all['mae'], m_all['rmse'], m_all['mape'], m_all['avg_overcount'], m_all['avg_undercount'], m_low['mae'], m_med['mae'], m_high['mae']]
            writer.writerow(row)
            print(f"Method: Center Dist ({dist_v:2d}px) | Total: {m_all['total_dets']:6d} | MAE: {m_all['mae']:6.2f} | RMSE: {m_all['rmse']:6.2f}")

    # 5. PREDICTION QUALITY & NEAREST NEIGHBOR POINT MATCHING ANALYSIS
    print("\n==================================================")
    print("STEP 5: PREDICTION QUALITY ANALYSIS (GT Points vs Pred Box Centers)")
    print("==================================================")
    
    count_csv_path = os.path.join(calibration_dir, 'count_matching_results.csv')
    all_min_dists = []

    with open(count_csv_path, 'w', newline='') as fcsv:
        writer = csv.writer(fcsv)
        writer.writerow(['image', 'gt_count', 'pred_count', 'matched_5px', 'matched_10px', 'matched_15px', 'avg_min_dist'])

        for k, info in val_gt.items():
            raw_b = raw_tiles_cache[(k, 1024, 0.20)]
            filt_b = [b for b in raw_b if b[4] >= 0.03]
            boxes = apply_nms(filt_b, iou_threshold=0.50)
            pred_centers = [((b[0]+b[2])/2.0, (b[1]+b[3])/2.0) for b in boxes]
            gt_pts = info['gt_points']

            m5, m10, m15 = 0, 0, 0
            img_dists = []

            for gcx, gcy in gt_pts:
                if pred_centers:
                    dists = [math.sqrt((gcx - pcx)**2 + (gcy - pcy)**2) for pcx, pcy in pred_centers]
                    min_d = min(dists)
                    img_dists.append(min_d)
                    all_min_dists.append(min_d)
                    if min_d <= 5.0:
                        m5 += 1
                    if min_d <= 10.0:
                        m10 += 1
                    if min_d <= 15.0:
                        m15 += 1

            avg_d = float(np.mean(img_dists)) if img_dists else 0.0
            writer.writerow([k, len(gt_pts), len(pred_centers), m5, m10, m15, avg_d])

    total_gt_pts = len(all_min_dists)
    p_5 = np.sum(np.array(all_min_dists) <= 5.0) / float(total_gt_pts) * 100.0
    p_10 = np.sum(np.array(all_min_dists) <= 10.0) / float(total_gt_pts) * 100.0
    p_15 = np.sum(np.array(all_min_dists) <= 15.0) / float(total_gt_pts) * 100.0

    print(f"Total GT Points Analyzed   : {total_gt_pts}")
    print(f"Percentage Within 5.0px    : {p_5:.2f}%")
    print(f"Percentage Within 10.0px   : {p_10:.2f}%")
    print(f"Percentage Within 15.0px   : {p_15:.2f}%")
    print(f"Overall Mean Distance to GT: {np.mean(all_min_dists):.2f}px")

    # 6. SELECTION OF BEST VALIDATION CONFIGURATION
    all_configs = []
    
    for c_val in [0.02, 0.025, 0.03, 0.035, 0.04]:
        for t_sz in [768, 1024]:
            for ov in [0.15, 0.20, 0.25]:
                for iou_v in [0.40, 0.50, 0.60]:
                    preds = {}
                    for k in val_gt:
                        raw_b = raw_tiles_cache.get((k, t_sz, ov), [])
                        filt_b = [b for b in raw_b if b[4] >= c_val]
                        nms_b = apply_nms(filt_b, iou_threshold=iou_v)
                        preds[k] = len(nms_b)
                    
                    m_all = compute_counting_metrics(preds)
                    m_low = compute_counting_metrics(preds, low_imgs)
                    m_med = compute_counting_metrics(preds, med_imgs)
                    m_high = compute_counting_metrics(preds, high_imgs)

                    all_configs.append({
                        'conf': c_val,
                        'tile_size': t_sz,
                        'overlap': ov,
                        'iou': iou_v,
                        'mae': m_all['mae'],
                        'rmse': m_all['rmse'],
                        'mape': m_all['mape'],
                        'avg_overcount': m_all['avg_overcount'],
                        'avg_undercount': m_all['avg_undercount'],
                        'mae_low': m_low['mae'],
                        'mae_med': m_med['mae'],
                        'mae_high': m_high['mae']
                    })

    all_configs = sorted(all_configs, key=lambda x: x['mae'])
    best_config = all_configs[0]

    print("\n==================================================")
    print("BEST VALIDATION CONFIGURATION FOUND")
    print("==================================================")
    print(f"Confidence Threshold : {best_config['conf']}")
    print(f"Tile Size            : {best_config['tile_size']}")
    print(f"Tile Overlap         : {best_config['overlap']}")
    print(f"NMS IoU Threshold    : {best_config['iou']}")
    print(f"Validation MAE       : {best_config['mae']:.2f}")
    print(f"Validation RMSE      : {best_config['rmse']:.2f}")
    print(f"Validation MAPE      : {best_config['mape']:.2f}%")
    print(f"Low Density MAE      : {best_config['mae_low']:.2f}")
    print(f"Med Density MAE      : {best_config['mae_med']:.2f}")
    print(f"High Density MAE     : {best_config['mae_high']:.2f}")

    # 7. GENERATE DEBUG OVERLAYS FOR BEST 3 CONFIGURATIONS
    print("\nGenerating calibration debug visual overlays for best configuration...")
    
    top_3_configs = all_configs[:3]
    for idx_cfg, cfg in enumerate(top_3_configs):
        c_val = cfg['conf']
        t_sz = cfg['tile_size']
        ov = cfg['overlap']
        iou_v = cfg['iou']

        # Pick 1 low, 1 med, 1 high sample
        s_low = low_imgs[0]
        s_med = med_imgs[0]
        s_high = high_imgs[0]

        for cat_name, img_name in zip(['low_density', 'med_density', 'high_density'], [s_low, s_med, s_high]):
            info = val_gt[img_name]
            img_orig = cv2.imread(info['path'])
            h, w = img_orig.shape[:2]

            raw_b = raw_tiles_cache.get((img_name, t_sz, ov), [])
            filt_b = [b for b in raw_b if b[4] >= c_val]
            nms_b = apply_nms(filt_b, iou_threshold=iou_v)

            img_draw = img_orig.copy()
            for b in nms_b:
                x1, y1, x2, y2 = [int(v) for v in b[:4]]
                cv2.rectangle(img_draw, (x1, y1), (x2, y2), (0, 0, 255), 1)

            for gcx, gcy in info['gt_points']:
                cv2.circle(img_draw, (int(gcx), int(gcy)), 3, (0, 255, 0), -1)

            cv2.putText(img_draw, f"Config {idx_cfg+1} (Conf {c_val}, Tile {t_sz}, Ov {ov}, IoU {iou_v})", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
            cv2.putText(img_draw, f"Pred: {len(nms_b)} | GT: {info['gt_count']} | Err: {abs(len(nms_b) - info['gt_count'])}", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

            out_fn = os.path.join(debug_dir, f"cfg{idx_cfg+1}_{cat_name}_{img_name}")
            cv2.imwrite(out_fn, img_draw)

    print(f"Saved debug visualizations to {debug_dir}")

    # Save isolated calibration.yaml
    calib_yaml_path = os.path.join(project_root, 'models', 'shanghaitech', 'yolo', 'experiment_03', 'calibration.yaml')
    os.makedirs(os.path.dirname(calib_yaml_path), exist_ok=True)
    with open(calib_yaml_path, 'w') as fyaml:
        yaml.dump({
            'experiment': 'experiment_03_calibrated',
            'model_path': 'models/shanghaitech/yolo/experiment_03/best.pt',
            'confidence_threshold': float(best_config['conf']),
            'tile_size': int(best_config['tile_size']),
            'tile_overlap': float(best_config['overlap']),
            'nms_iou_threshold': float(best_config['iou']),
            'max_det': 1000,
            'metrics': {
                'mae': float(best_config['mae']),
                'rmse': float(best_config['rmse']),
                'mape': float(best_config['mape']),
                'mae_low': float(best_config['mae_low']),
                'mae_med': float(best_config['mae_med']),
                'mae_high': float(best_config['mae_high'])
            }
        }, fyaml)
    print(f"Saved experimental calibration config to: {calib_yaml_path}")

if __name__ == '__main__':
    run_fast_calibration()
