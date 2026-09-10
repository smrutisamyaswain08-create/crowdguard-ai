# S-19 AI Crowd Counting — ML Training & Dataset Guide

This guide details the complete dataset preparation, preprocessing, fine-tuning, validation, and evaluation pipeline for the **S-19 AI Crowd Counting Backend**.

---

## 1. Directory Structure Setup

Keep ShanghaiTech and S-19 datasets in separate folders:

```
dataset/
├── shanghaitech/
│   ├── part_A/
│   │   ├── train_data/
│   │   │   ├── images/          (IMG_1.jpg, ...)
│   │   │   └── ground-truth/    (GT_IMG_1.mat, ...)
│   │   └── test_data/
│   │       ├── images/          (IMG_1.jpg, ...)
│   │       └── ground-truth/    (GT_IMG_1.mat, ...)
│   └── part_B/
│       ├── train_data/
│       └── test_data/
│
└── s19/
    ├── images/
    │   ├── train/
    │   ├── val/
    │   └── test/
    └── labels/
        ├── train/
        ├── val/
        └── test/
```

---

## 2. Dataset Loader (`ml/datasets/shanghaitech_loader.py`)

The loader parses original `.mat` ground-truth annotation files (`image_info`, `annPoints`, `location`) and pairs them with image files.

**Key Features**:
- **Automatic Ground Truth Calculation**: Calculates `ground_truth_count` directly from `len(head_points)` without manual entry.
- **Validation**: Scans image/annotation pairs, validates file existence, and reports missing or corrupt files.

**Python API**:
```python
from ml.datasets.shanghaitech_loader import ShanghaiTechLoader

loader = ShanghaiTechLoader("dataset/shanghaitech", part="A", split="train")
summary = loader.validate()
print(summary)
# Output: {'valid_samples': 300, 'total_gt_heads': 150000, 'avg_heads_per_image': 500.0}
```

---

## 3. Dataset Preprocessing (`ml/datasets/convert_shanghaitech.py`)

Converts ShanghaiTech `.mat` head center points into model-specific targets:

### A. CSRNet Density Map Generation
- Generates 2D Gaussian density maps where:
  $$\sum \text{density\_map} \approx \text{number of head points}$$
- Uses geometry-adaptive k-NN Gaussian kernels ($\sigma = \beta \cdot \bar{d}_k$).
- Saves `.npy` arrays under `processed/csrnet/part_A/train/`.

### B. YOLO Bounding Box Generation
- Generates normalized YOLO bounding box label files (`.txt`).
- **Documented Box Sizing**: Configured via `S19_HEAD_BOX_WIDTH` (default: 15px) and `S19_HEAD_BOX_HEIGHT` (default: 15px), scaled adaptively by local head density k-NN distances (capped between 8px and 45px).
- Format: `0 <x_center> <y_center> <w_norm> <h_norm>`

---

## 4. Train / Validation Split (`ml/datasets/dataset_split.py`)

Splits the official training data into 80% training and 20% validation while keeping the **official test set completely untouched** for unbiased evaluation.

```python
from ml.datasets.dataset_split import create_validation_split

create_validation_split(
    train_img_dir="dataset/s19/images/train",
    train_lbl_dir="dataset/s19/labels/train",
    val_img_dir="dataset/s19/images/val",
    val_lbl_dir="dataset/s19/labels/val",
    val_ratio=0.20
)
```

---

## 5. Model Fine-Tuning Commands

### YOLO Head Detector Training
Train YOLOv8 using real annotations:
```bash
python backend/ml/yolo/train_yolo.py --dataset-path dataset/s19 --epochs 30 --batch-size 16 --device cpu
```
- Saved Checkpoints: `models/shanghaitech/yolo/best.pt` and `models/s19_head_detector.pt`.

### CSRNet Density Estimator Training
Train PyTorch CSRNet using MSE loss and Adam optimizer:
```bash
python backend/ml/csrnet/train.py --data-dir dataset/shanghaitech/processed --epochs 50 --batch-size 1 --lr 1e-5 --device cpu
```
- Saved Checkpoints: `models/shanghaitech/csrnet/best.pth` and `models/s19_csrnet.pth`.

---

## 6. Comprehensive Model Evaluation

Execute evaluation across benchmark datasets:
```bash
python backend/manage.py evaluate_crowd --dataset shanghaitech --data-path dataset/shanghaitech --part A --model both --save-debug
```

### Calculated Metrics:
- **MAE** (Mean Absolute Error): $\frac{1}{N} \sum |\hat{y}_i - y_i|$
- **RMSE** (Root Mean Squared Error): $\sqrt{\frac{1}{N} \sum (\hat{y}_i - y_i)^2}$
- **MAPE** (Mean Absolute Percentage Error)
- **Median Absolute Error** & **95th Percentile Absolute Error**
- **Max Absolute Error**
- **Overcount / Undercount Rates & Averages**

### Generated Reports:
- `evaluation/shanghaitech/evaluation_results.csv`: Per-image ground truth, prediction, error, and absolute error.
- `evaluation/shanghaitech/evaluation_summary.json`: Comprehensive aggregate metrics.
- `media/evaluation_debug/`: Visual debug overlays with ground-truth vs predicted counts.
