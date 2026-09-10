import os
import sys
import shutil
import time
import argparse
import glob
import cv2
import numpy as np
import torch
from ultralytics import YOLO

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

def evaluate_yolo_on_val(model, val_img_dir, val_lbl_dir, conf_thresh=0.25, iou_thresh=0.50, debug_output_dir=None):
    """
    Evaluates trained YOLO model on the 60-image validation set.
    Calculates crowd-counting metrics: MAE, RMSE, MAPE, Average Overcount, Average Undercount.
    Saves debug visual overlay images for the first 10 validation samples.
    """
    img_paths = sorted(glob.glob(os.path.join(val_img_dir, "*.jpg")) + glob.glob(os.path.join(val_img_dir, "*.png")))

    gt_counts = []
    pred_counts = []
    overcounts = []
    undercounts = []

    if debug_output_dir:
        os.makedirs(debug_output_dir, exist_ok=True)

    # Categorize images by GT count into low, medium, high density categories for debug overlay rendering
    val_samples = []
    for idx, img_path in enumerate(img_paths):
        basename = os.path.basename(img_path)
        img_name, _ = os.path.splitext(basename)
        lbl_path = os.path.join(val_lbl_dir, f"{img_name}.txt")

        gt_cnt = 0
        if os.path.exists(lbl_path):
            with open(lbl_path, 'r') as f:
                lines = [l.strip() for l in f.readlines() if l.strip()]
                gt_cnt = len(lines)
        val_samples.append({'img_path': img_path, 'lbl_path': lbl_path, 'gt_cnt': gt_cnt, 'basename': basename})

    # Sort samples by GT count to pick low (bottom 5), medium (mid 5), high (top 5)
    sorted_samples = sorted(val_samples, key=lambda s: s['gt_cnt'])
    low_samples = set(s['basename'] for s in sorted_samples[:5])
    mid_idx = len(sorted_samples) // 2
    med_samples = set(s['basename'] for s in sorted_samples[max(0, mid_idx-2):min(len(sorted_samples), mid_idx+3)])
    high_samples = set(s['basename'] for s in sorted_samples[-5:])
    debug_targets = low_samples | med_samples | high_samples

    for idx, sample in enumerate(val_samples):
        img_path = sample['img_path']
        lbl_path = sample['lbl_path']
        gt_cnt = sample['gt_cnt']
        basename = sample['basename']

        # Run YOLO inference
        results = model.predict(img_path, conf=conf_thresh, iou=iou_thresh, verbose=False)
        pred_cnt = 0
        boxes = []
        confs = []
        if len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            confs = results[0].boxes.conf.cpu().numpy()
            pred_cnt = len(boxes)

        gt_counts.append(gt_cnt)
        pred_counts.append(pred_cnt)

        diff = pred_cnt - gt_cnt
        if diff > 0:
            overcounts.append(diff)
            undercounts.append(0)
        elif diff < 0:
            overcounts.append(0)
            undercounts.append(abs(diff))
        else:
            overcounts.append(0)
            undercounts.append(0)

        # Save visual debug overlays for selected low/medium/high density samples
        if debug_output_dir and basename in debug_targets:
            img = cv2.imread(img_path)
            if img is not None:
                for b_idx, box in enumerate(boxes):
                    x1, y1, x2, y2 = map(int, box[:4])
                    c = confs[b_idx] if len(confs) > b_idx else 0.0
                    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 1)
                
                abs_err = abs(pred_cnt - gt_cnt)
                tag = "LOW" if basename in low_samples else ("HIGH" if basename in high_samples else "MED")
                cv2.putText(img, f"[{tag}] Pred: {pred_cnt} | GT: {gt_cnt} | AbsErr: {abs_err}", (15, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                cv2.imwrite(os.path.join(debug_output_dir, f"debug_{tag.lower()}_{basename}"), img)


    gt_arr = np.array(gt_counts, dtype=np.float32)
    pred_arr = np.array(pred_counts, dtype=np.float32)

    errors = pred_arr - gt_arr
    abs_errors = np.abs(errors)

    mae = float(np.mean(abs_errors))
    rmse = float(np.sqrt(np.mean(errors ** 2)))

    # MAPE calculation (avoiding division by zero)
    nonzero_mask = gt_arr > 0
    mape = float(np.mean(abs_errors[nonzero_mask] / gt_arr[nonzero_mask]) * 100.0) if np.any(nonzero_mask) else 0.0

    avg_overcount = float(np.mean(overcounts))
    avg_undercount = float(np.mean(undercounts))
    overcount_rate = float(np.mean(np.array(overcounts) > 0) * 100.0)
    undercount_rate = float(np.mean(np.array(undercounts) > 0) * 100.0)

    return {
        'num_val_images': len(img_paths),
        'total_gt_heads': int(np.sum(gt_arr)),
        'mae': mae,
        'rmse': rmse,
        'mape': mape,
        'avg_overcount': avg_overcount,
        'avg_undercount': avg_undercount,
        'overcount_rate': overcount_rate,
        'undercount_rate': undercount_rate
    }

def train_shanghaitech_yolo(
    dataset_path,
    epochs=50,
    batch_size=2,
    imgsz=1024,
    lr=0.001,
    device='cpu',
    base_model='yolov8n.pt',
    workers=0,
    seed=42,
    patience=10,
    output_dir=None,
    debug_dir=None
):
    """
    Trains/fine-tunes YOLO on ShanghaiTech Part A dataset.
    Strictly preserves previous experiment checkpoints and production models.
    """
    start_time = time.time()
    project_root = os.path.abspath(os.path.join(backend_dir, '..'))

    data_yaml = os.path.join(dataset_path, 'data.yaml')
    if not os.path.exists(data_yaml):
        raise FileNotFoundError(f"data.yaml not found at: {data_yaml}")

    # Output directory setup
    target_shanghaitech_dir = output_dir or os.path.join(project_root, 'models', 'shanghaitech', 'yolo', 'experiment_03')
    runs_dir = os.path.join(target_shanghaitech_dir, 'runs')
    os.makedirs(target_shanghaitech_dir, exist_ok=True)
    os.makedirs(runs_dir, exist_ok=True)

    print(f"==================================================")
    print(f"Starting ShanghaiTech Part A YOLO Training (Experiment 03)")
    print(f"==================================================")
    print(f"Base Model Path : {base_model}")
    print(f"Dataset Path   : {dataset_path}")
    print(f"Config YAML    : {data_yaml}")
    print(f"Epochs         : {epochs}")
    print(f"Patience       : {patience}")
    print(f"Batch Size     : {batch_size}")
    print(f"Image Size     : {imgsz}")
    print(f"Learning Rate  : {lr}")
    print(f"Device         : {device}")
    print(f"Random Seed    : {seed}")
    print(f"Output Dir     : {target_shanghaitech_dir}")
    print(f"==================================================")

    # Initialize model
    model = YOLO(base_model)

    # Train model
    train_results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch_size,
        lr0=lr,
        device=device,
        workers=workers,
        seed=seed,
        patience=patience,
        project=runs_dir,
        name='shanghaitech_yolo_run',
        exist_ok=True,
        verbose=True
    )

    training_duration = time.time() - start_time

    # Locate generated weights
    run_weights_dir = os.path.join(runs_dir, 'shanghaitech_yolo_run', 'weights')
    best_src = os.path.join(run_weights_dir, 'best.pt')
    last_src = os.path.join(run_weights_dir, 'last.pt')

    best_dst = os.path.join(target_shanghaitech_dir, 'best.pt')
    last_dst = os.path.join(target_shanghaitech_dir, 'last.pt')

    if os.path.exists(best_src):
        shutil.copy(best_src, best_dst)
        print(f"[Success] Saved best weights to: {best_dst}")
    if os.path.exists(last_src):
        shutil.copy(last_src, last_dst)
        print(f"[Success] Saved last weights to: {last_dst}")

    # Extract validation metrics from Ultralytics training results
    best_model_path = best_dst if os.path.exists(best_dst) else base_model
    best_model = YOLO(best_model_path)

    # Standard YOLO validation
    val_results = best_model.val(data=data_yaml, split='val', device=device, verbose=False)

    precision = float(val_results.results_dict.get('metrics/precision(B)', 0.0))
    recall = float(val_results.results_dict.get('metrics/recall(B)', 0.0))
    map50 = float(val_results.results_dict.get('metrics/mAP50(B)', 0.0))
    map50_95 = float(val_results.results_dict.get('metrics/mAP50-95(B)', 0.0))

    # Crowd Counting Metrics on 60 Validation Images
    val_img_dir = os.path.join(dataset_path, 'images', 'val')
    val_lbl_dir = os.path.join(dataset_path, 'labels', 'val')
    val_debug_dir = debug_dir or os.path.join(dataset_path, 'experiment_03_debug')

    count_metrics = evaluate_yolo_on_val(
        best_model,
        val_img_dir,
        val_lbl_dir,
        conf_thresh=0.25,
        iou_thresh=0.50,
        debug_output_dir=val_debug_dir
    )



    report_summary = {
        'base_model': base_model,
        'epochs': epochs,
        'imgsz': imgsz,
        'batch_size': batch_size,
        'device': device,
        'best_checkpoint_path': best_dst,
        'precision': precision,
        'recall': recall,
        'map50': map50,
        'map50_95': map50_95,
        'val_images': count_metrics['num_val_images'],
        'val_gt_heads': count_metrics['total_gt_heads'],
        'val_mae': count_metrics['mae'],
        'val_rmse': count_metrics['rmse'],
        'val_mape': count_metrics['mape'],
        'avg_overcount': count_metrics['avg_overcount'],
        'avg_undercount': count_metrics['avg_undercount'],
        'overcount_rate': count_metrics['overcount_rate'],
        'undercount_rate': count_metrics['undercount_rate'],
        'duration_seconds': training_duration
    }

    print(f"\n==================================================")
    print(f"SHANGHAITECH YOLO TRAINING & VALIDATION COMPLETE")
    print(f"==================================================")
    print(f"Best Model Saved To : {best_dst}")
    print(f"Precision           : {precision:.4f}")
    print(f"Recall              : {recall:.4f}")
    print(f"mAP50               : {map50:.4f}")
    print(f"mAP50-95            : {map50_95:.4f}")
    print(f"Validation MAE      : {count_metrics['mae']:.2f}")
    print(f"Validation RMSE     : {count_metrics['rmse']:.2f}")
    print(f"Validation MAPE     : {count_metrics['mape']:.2f}%")
    print(f"Average Overcount   : {count_metrics['avg_overcount']:.2f}")
    print(f"Average Undercount  : {count_metrics['avg_undercount']:.2f}")
    print(f"Training Duration   : {training_duration:.1f}s")
    print(f"==================================================")

    return report_summary

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Train YOLO Head Detector on ShanghaiTech Part A")
    parser.add_argument('--dataset-path', type=str, default='dataset/processed/shanghaitech/part_A/yolo', help="Path to processed YOLO dataset")
    parser.add_argument('--epochs', type=int, default=50, help="Number of training epochs")
    parser.add_argument('--batch-size', type=int, default=2, help="Batch size")
    parser.add_argument('--imgsz', type=int, default=1024, help="Image size")
    parser.add_argument('--lr', type=float, default=0.001, help="Learning rate")
    parser.add_argument('--device', type=str, default='cpu', help="Device (cpu or cuda)")
    parser.add_argument('--base-model', type=str, default='yolov8n.pt', help="Base YOLO model weights")
    parser.add_argument('--workers', type=int, default=0, help="Number of data loader workers")
    parser.add_argument('--seed', type=int, default=42, help="Random seed")
    parser.add_argument('--patience', type=int, default=10, help="Patience for early stopping")
    parser.add_argument('--output-dir', type=str, default=None, help="Output directory for model checkpoints")
    parser.add_argument('--debug-dir', type=str, default=None, help="Output directory for debug visual overlays")
    args = parser.parse_args()

    train_shanghaitech_yolo(
        dataset_path=args.dataset_path,
        epochs=args.epochs,
        batch_size=args.batch_size,
        imgsz=args.imgsz,
        lr=args.lr,
        device=args.device,
        base_model=args.base_model,
        workers=args.workers,
        seed=args.seed,
        patience=args.patience,
        output_dir=args.output_dir,
        debug_dir=args.debug_dir
    )

