import os
import csv
import json
import cv2
import numpy as np
from django.core.management.base import BaseCommand
from django.conf import settings

from ml.datasets.shanghaitech_loader import ShanghaiTechLoader
from detection.yolo_detector import YoloDetector
from detection.csrnet_model import CSRNet

class Command(BaseCommand):
    help = "Evaluates AI Crowd Counting models (YOLO & CSRNet) on benchmark datasets (ShanghaiTech) and computes standard metrics."

    def add_arguments(self, parser):
        parser.add_argument('--dataset', type=str, default='shanghaitech', help="Dataset name (e.g. shanghaitech)")
        parser.add_argument('--data-path', type=str, default='dataset/shanghaitech', help="Path to dataset root directory")
        parser.add_argument('--part', type=str, default='A', help="ShanghaiTech Part (A or B)")
        parser.add_argument('--split', type=str, default='test', help="Dataset split (test or train)")
        parser.add_argument('--model', type=str, default='both', help="Model to evaluate (yolo, csrnet, or both)")
        parser.add_argument('--save-debug', action='store_true', help="Save debug visual overlays under media/evaluation_debug/")

    def compute_evaluation_metrics(self, results):
        """Computes comprehensive evaluation metrics from image prediction tuples."""
        if not results:
            return {}

        preds = np.array([r['predicted'] for r in results], dtype=np.float64)
        gts = np.array([r['ground_truth'] for r in results], dtype=np.float64)
        errors = preds - gts
        abs_errors = np.abs(errors)

        mae = float(np.mean(abs_errors))
        rmse = float(np.sqrt(np.mean(errors ** 2)))

        valid_mask = gts > 0
        mape = float(np.mean(abs_errors[valid_mask] / gts[valid_mask]) * 100.0) if np.any(valid_mask) else 0.0

        median_ae = float(np.median(abs_errors))
        p95_ae = float(np.percentile(abs_errors, 95))
        max_ae = float(np.max(abs_errors))

        total_samples = len(results)
        overcount_mask = errors > 0
        undercount_mask = errors < 0

        overcount_rate = float(np.sum(overcount_mask) / total_samples)
        avg_overcount = float(np.mean(errors[overcount_mask])) if np.any(overcount_mask) else 0.0

        undercount_rate = float(np.sum(undercount_mask) / total_samples)
        avg_undercount = float(np.mean(np.abs(errors[undercount_mask]))) if np.any(undercount_mask) else 0.0

        return {
            'mae': round(mae, 3),
            'rmse': round(rmse, 3),
            'mape': round(mape, 3),
            'median_ae': round(median_ae, 3),
            'p95_ae': round(p95_ae, 3),
            'max_ae': round(max_ae, 3),
            'overcount_rate': round(overcount_rate, 4),
            'avg_overcount': round(avg_overcount, 3),
            'undercount_rate': round(undercount_rate, 4),
            'avg_undercount': round(avg_undercount, 3),
            'total_samples': total_samples
        }

    def handle(self, *args, **options):
        dataset_name = options['dataset'].lower()
        data_path = options['data_path']
        part = options['part'].upper()
        split = options['split'].lower()
        model_opt = options['model'].lower()
        save_debug = options['save_debug']

        # Build absolute path to dataset
        if not os.path.isabs(data_path):
            data_path = os.path.join(settings.BASE_DIR, '..', data_path)

        self.stdout.write(self.style.SUCCESS(f"=== Starting S-19 Crowd Evaluation on {dataset_name.upper()} Part {part} ({split}) ==="))
        self.stdout.write(f"Dataset Path: {data_path}")

        # Initialize dataset loader
        loader = ShanghaiTechLoader(data_path, part=part, split=split)
        val_summary = loader.validate()
        self.stdout.write(f"Found {val_summary['valid_samples']} valid samples ({val_summary['invalid_samples']} invalid/missing).")

        if len(loader) == 0:
            self.stderr.write(self.style.ERROR(f"No valid dataset samples found at '{data_path}'. Please check directory path."))
            return

        models_to_test = []
        if model_opt in ['yolo', 'both']:
            models_to_test.append('yolo')
        if model_opt in ['csrnet', 'both']:
            models_to_test.append('csrnet')

        # Create output directories
        eval_output_dir = os.path.join(settings.BASE_DIR, '..', 'evaluation', dataset_name)
        os.makedirs(eval_output_dir, exist_ok=True)

        debug_dir = os.path.join(settings.MEDIA_ROOT, 'evaluation_debug')
        if save_debug:
            os.makedirs(debug_dir, exist_ok=True)

        all_results = {}
        all_metrics = {}

        # Instantiate models
        yolo_engine = YoloDetector() if 'yolo' in models_to_test else None
        csrnet_engine = CSRNet(load_weights=True) if 'csrnet' in models_to_test else None

        for m_name in models_to_test:
            self.stdout.write(self.style.WARNING(f"\n--- Evaluating Model: {m_name.upper()} ---"))
            results_list = []

            for idx, sample in enumerate(loader):
                img_rgb = sample['image']
                if img_rgb is None:
                    continue
                    
                img_path = sample['image_path']
                gt_count = sample['ground_truth_count']
                img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
                basename = os.path.basename(img_path)

                if m_name == 'yolo':
                    count, density, heatmap, overlay = yolo_engine.process_frame(img_bgr, high_precision=True)
                    model_label = yolo_engine.model_name
                else: # csrnet
                    count, density, heatmap, overlay = csrnet_engine.predict_crowd_density(img_bgr)
                    model_label = "CSRNet Density Estimator"

                err = count - gt_count
                abs_err = abs(err)

                results_list.append({
                    'image': basename,
                    'ground_truth': gt_count,
                    'predicted': count,
                    'error': err,
                    'absolute_error': abs_err,
                    'model': m_name
                })

                # Visual Debug Output
                if save_debug and idx < 25: # Save debug overlay for first 25 samples
                    debug_overlay = overlay.copy()
                    hdr_text = f"S-19 Crowd Evaluation | GT: {gt_count} | Pred: {count} | Model: {m_name.upper()}"
                    cv2.rectangle(debug_overlay, (0, 0), (debug_overlay.shape[1], 40), (0, 0, 0), -1)
                    cv2.putText(debug_overlay, hdr_text, (15, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2, cv2.LINE_AA)
                    
                    dbg_name = f"{m_name}_eval_{basename}"
                    cv2.imwrite(os.path.join(debug_dir, dbg_name), debug_overlay)

                if (idx + 1) % 50 == 0 or (idx + 1) == len(loader):
                    self.stdout.write(f"Processed {idx+1}/{len(loader)} samples...")

            metrics = self.compute_evaluation_metrics(results_list)
            all_results[m_name] = results_list
            all_metrics[m_name] = metrics

            self.stdout.write(self.style.SUCCESS(
                f"[{m_name.upper()} Results] MAE: {metrics['mae']} | RMSE: {metrics['rmse']} | MAPE: {metrics['mape']}% | "
                f"Overcount Rate: {metrics['overcount_rate']*100:.1f}% | Undercount Rate: {metrics['undercount_rate']*100:.1f}%"
            ))

        # Save evaluation_results.csv
        csv_path = os.path.join(eval_output_dir, 'evaluation_results.csv')
        with open(csv_path, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['image', 'ground_truth', 'predicted', 'error', 'absolute_error', 'model'])
            for m_name, res in all_results.items():
                for r in res:
                    writer.writerow([r['image'], r['ground_truth'], r['predicted'], r['error'], r['absolute_error'], r['model']])

        # Save evaluation_summary.json
        summary_path = os.path.join(eval_output_dir, 'evaluation_summary.json')
        with open(summary_path, 'w') as f:
            json.dump({
                'dataset': dataset_name,
                'part': part,
                'split': split,
                'metrics': all_metrics
            }, f, indent=2)

        self.stdout.write(self.style.SUCCESS(f"\nSaved CSV evaluation report to: {csv_path}"))
        self.stdout.write(self.style.SUCCESS(f"Saved JSON evaluation summary to: {summary_path}"))
        if save_debug:
            self.stdout.write(self.style.SUCCESS(f"Saved visual debug images to: {debug_dir}"))
