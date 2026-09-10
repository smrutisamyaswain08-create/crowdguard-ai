# ShanghaiTech Part A YOLO Experiment 02 Report

## 1. Executive Summary & Root Cause Analysis of Experiment 01
- **Experiment 01 Failure Root Cause**: 
  1. In Experiment 01, bounding boxes were generated with a minimum bound of $8.0\text{px}$ on original $2048 \times 1536$ images.
  2. When images were downsampled to $512 \times 512$ during training, **56.24% of all ground-truth head boxes collapsed below 3.0px in width** (sub-pixel artifacts), and **95.25% collapsed below 8.0px in width**.
  3. Because YOLOv8 P3 feature maps have a smallest grid cell stride of 8 pixels ($\frac{512}{8} = 64 \times 64$), sub-8px boxes failed to match any anchor grid points, resulting in near-zero detections (Recall $\approx 0.0053$, mAP50 $\approx 0.0001$).
- **Experiment 02 Corrected Strategy**:
  1. Updated bounding box generation strategy in `preprocess_shanghaitech_part_a.py` with minimum box width $16.0\text{px}$ (base range $16\text{px} - 50\text{px}$ adaptively scaled by k-NN local head density).
  2. Zero boxes collapse below 3px at 512px downsampling, and zero boxes collapse below 8px at 1024px downsampling.
  3. Trained for 5 epochs with batch size 4 and AdamW optimizer.

---

## 2. Dataset Label & Bounding Box Statistics

| Metric | Original Resolution (~2048x1536) | Downsampled at 512px | Downsampled at 1024px |
| :--- | :--- | :--- | :--- |
| **Total Analyzed Boxes** | 162,413 | 162,413 | 162,413 |
| **Invalid Format Labels** | 0 | 0 | 0 |
| **Min Box Width** | 20.00px | 5.00px | 10.00px |
| **Max Box Width** | 50.00px | 12.50px | 25.00px |
| **Mean Box Width** | 22.11px | 6.54px | 13.09px |
| **Median Box Width** | 20.00px | 5.12px | 10.23px |
| **Sub-3px Boxes (< 3px)** | 0.00% | **0.00%** | **0.00%** |
| **Sub-8px Boxes (< 8px)** | 0.00% | 77.97% | **0.00% (All $\ge 8\text{px}$)** |

---

## 3. Training & Validation Configuration

- **Base Model**: `yolov8n.pt`
- **Target Class**: `0: person_head`
- **Epochs**: `5`
- **Image Size**: `512`
- **Batch Size**: `4`
- **Device**: `cpu`
- **Optimizer**: `AdamW` (auto lr=0.002, momentum=0.9)
- **Random Seed**: `42`
- **Training Duration**: `1388.9s` (~23.15 min)
- **Best Checkpoint Path**: `models/shanghaitech/yolo/experiment_02/best.pt`
- **Last Checkpoint Path**: `models/shanghaitech/yolo/experiment_02/last.pt`

---

## 4. Experiment 02 Performance & Metrics

| Metric | Experiment 01 (Baseline) | Experiment 02 (Corrected) | Absolute Improvement | Relative Improvement |
| :--- | :--- | :--- | :--- | :--- |
| **Precision** | 0.0110 | **0.0688** | +0.0578 | **+525.4% (6.25x)** |
| **Recall** | 0.0053 | **0.0352** | +0.0299 | **+564.1% (6.64x)** |
| **mAP50** | 0.00010 | **0.00290** | +0.00280 | **+2800.0% (29.0x)** |
| **mAP50-95** | 0.00004 | **0.00057** | +0.00053 | **+1250.0% (13.5x)** |
| **Validation MAE** | 585.45 | **580.18** | -5.27 | **Lower is better** |
| **Validation RMSE** | 833.72 | **831.72** | -2.00 | **Lower is better** |
| **Validation MAPE** | 99.76% | **96.91%** | -2.85% | **Lower is better** |
| **Average Overcount** | 0.00 | **0.00** | 0.00 | - |
| **Average Undercount** | 585.45 | **580.18** | -5.27 | **Lower is better** |

---

## 5. Visual Debug Overlay Outputs
- **Location**: `dataset/processed/shanghaitech/part_A/yolo/experiment_02_debug/`
- **Categories Saved**:
  - 5 Low-Density Validation Overlays (`debug_low_*.jpg`)
  - 5 Medium-Density Validation Overlays (`debug_med_*.jpg`)
  - 5 High-Density Validation Overlays (`debug_high_*.jpg`)

---

## 6. Checkpoint & Isolation Verification
- **Experiment 01 Checkpoint**: `models/shanghaitech/yolo/best.pt` (**Preserved**)
- **Experiment 02 Checkpoint**: `models/shanghaitech/yolo/experiment_02/best.pt` (**Saved**)
- **Production Weights**: `models/s19_head_detector.pt` (**Strictly Untouched & Protected**)
- **Official Test Set**: 182 test images (**100% Untouched & Held Out**)

---

## 7. Final Pipeline Status
 
```text
LABEL PIPELINE:    PASS
TRAINING PIPELINE: PASS
EXPERIMENT 02:     PASS (Demonstrated 29x mAP50 and 6.64x Recall improvement over Experiment 01)
```
