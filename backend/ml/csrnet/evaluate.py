import os
import math
import numpy as np
import torch
import cv2
from .model import CSRNetModel

def compute_csrnet_metrics(predictions, ground_truths):
    """
    Calculates comprehensive evaluation metrics for CSRNet crowd predictions:
    - MAE (Mean Absolute Error)
    - RMSE (Root Mean Squared Error)
    - MAPE (Mean Absolute Percentage Error)
    - Median Absolute Error
    - 95th Percentile Absolute Error
    - Maximum Absolute Error
    - Overcount rate & average overcount
    - Undercount rate & average undercount
    """
    preds = np.array(predictions, dtype=np.float64)
    gts = np.array(ground_truths, dtype=np.float64)
    
    errors = preds - gts
    abs_errors = np.abs(errors)
    
    mae = float(np.mean(abs_errors))
    rmse = float(np.sqrt(np.mean(errors ** 2)))
    
    # Safe MAPE handling zero ground-truth cases
    valid_mask = gts > 0
    mape = float(np.mean(abs_errors[valid_mask] / gts[valid_mask]) * 100.0) if np.any(valid_mask) else 0.0
    
    median_ae = float(np.median(abs_errors))
    p95_ae = float(np.percentile(abs_errors, 95))
    max_ae = float(np.max(abs_errors)) if len(abs_errors) > 0 else 0.0
    
    overcount_mask = errors > 0
    undercount_mask = errors < 0
    
    total_samples = len(errors)
    overcount_rate = float(np.sum(overcount_mask) / total_samples) if total_samples > 0 else 0.0
    avg_overcount = float(np.mean(errors[overcount_mask])) if np.any(overcount_mask) else 0.0
    
    undercount_rate = float(np.sum(undercount_mask) / total_samples) if total_samples > 0 else 0.0
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

def evaluate_csrnet_model(model_path, loader, device='cpu'):
    """Runs inference across ShanghaiTech dataset loader samples and evaluates metrics."""
    device = device if (device == 'cuda' and torch.cuda.is_available()) else 'cpu'
    model = CSRNetModel(load_vgg_weights=False)
    
    if os.path.exists(model_path):
        ckpt = torch.load(model_path, map_location=device)
        state_dict = ckpt.get('state_dict', ckpt)
        model.load_state_dict(state_dict)
        print(f"[CSRNet Evaluation] Loaded checkpoint: {model_path}")
    else:
        print(f"[CSRNet Evaluation Warning] Checkpoint {model_path} not found. Running with baseline VGG weights.")

    model.to(device)
    model.eval()

    predictions = []
    ground_truths = []
    detailed_results = []

    transform = torch.nn.Sequential()

    with torch.no_grad():
        for sample in loader:
            img = sample['image']
            gt_count = sample['ground_truth_count']
            img_path = sample['image_path']

            if img is None:
                continue

            # Transform BGR/RGB array to tensor
            img_tensor = torch.from_numpy(img).permute(2, 0, 1).float().unsqueeze(0) / 255.0
            # ImageNet mean/std normalization
            mean = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
            std = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)
            img_tensor = (img_tensor - mean) / std

            img_tensor = img_tensor.to(device)
            density_out = model(img_tensor)
            density_map = torch.nn.functional.softplus(density_out).squeeze().cpu().numpy()

            pred_count = max(0, int(round(float(np.sum(density_map)))))
            err = pred_count - gt_count
            abs_err = abs(err)

            predictions.append(pred_count)
            ground_truths.append(gt_count)

            detailed_results.append({
                'image': os.path.basename(img_path),
                'ground_truth': gt_count,
                'predicted': pred_count,
                'error': err,
                'absolute_error': abs_err
            })

    metrics = compute_csrnet_metrics(predictions, ground_truths)
    return metrics, detailed_results
