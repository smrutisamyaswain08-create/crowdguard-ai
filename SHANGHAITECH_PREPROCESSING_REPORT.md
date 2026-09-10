# ShanghaiTech Part A Dataset Preprocessing & Validation Report

## 1. Executive Summary
- **Source Dataset Location**: `C:\Users\user\Downloads\CROWD-MANAGEMENT-SYSTEM-main\backend\..\dataset\shanghaitech`
- **Processed Dataset Location**: `C:\Users\user\Downloads\CROWD-MANAGEMENT-SYSTEM-main\backend\..\dataset\processed\shanghaitech\part_A`
- **Dataset Split**: Official 300 Training images divided into **80% Train (240 images)** & **20% Validation (60 images)**. Official **182 Test images** kept strictly as unseen **Test Set**.
- **Random Seed**: `42`
- **YOLO Label Validation**: **PASS** (0 invalid labels, 0 missing labels).
- **CSRNet Density Map Validation**: **PASS** (Integral sum matches ground truth headcount with average difference < 0.05).

---

## 2. Dataset Split Statistics

| Split | Images | Total GT Heads | Min Heads | Max Heads | Avg Heads | Median Heads |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Train (80%)** | 240 | 127250 | 33 | 3138 | 530.21 | 378.0 |
| **Val (20%)** | 60 | 35163 | 39 | 2672 | 586.05 | 384.5 |
| **Test (Official)** | 182 | 78862 | 66 | 2256 | 433.31 | 307.5 |
| **Total** | 482 | 241275 | 33 | 3138 | 500.57 | 359.0 |

---

## 3. YOLO Label Generation & Validation

- **Box Generation Strategy**: Documented & Configurable. Head centers are expanded to bounding boxes using base size (15px x 15px) adaptively scaled by k-NN local head density (capped between 8px and 45px) and strictly clipped to [0, 1] image bounds.
- **Label Format**: `0 x_center y_center width height` (normalized floats).
- **Total YOLO Labels Created**: 482
- **Invalid Labels**: 0
- **Missing Labels**: 0
- **Debug Overlays Saved**: `dataset/processed/shanghaitech/part_A/yolo/debug/`
- **Config Generated**: `dataset/processed/shanghaitech/part_A/yolo/data.yaml`

---

## 4. CSRNet Density Map Generation & Validation

- **Density Map Strategy**: Geometry Gaussian Kernels ($\sigma = 15.0$).
- **Counting Identity Property**: $\sum \text{density\_map} \approx \text{ground\_truth\_count}$.
- **Arbitrary Multiplier**: NONE (0.05 scaling factor strictly removed).
- **Total Density Maps Created**: 482 (.npy arrays)
- **Failed Maps**: 0
- **Debug Overlays Saved**: `dataset/processed/shanghaitech/part_A/csrnet/debug/`

### Sample Density Map Validation Integrity:

| Image Name | Ground Truth Count | Density Map Sum | Absolute Difference | Relative Error |
| :--- | :--- | :--- | :--- | :--- |
| `tr_processed_IMG_195.jpg` | 243 | 243.00 | 0.0000 | 0.000% |
| `tr_processed_IMG_44.jpg` | 280 | 280.00 | 0.0000 | 0.000% |
| `tr_processed_IMG_132.jpg` | 200 | 200.00 | 0.0000 | 0.000% |
| `tr_processed_IMG_18.jpg` | 280 | 280.00 | 0.0000 | 0.000% |
| `tr_processed_IMG_128.jpg` | 1456 | 1456.00 | 0.0000 | 0.000% |

---

## 5. Files Created

- `dataset/processed/shanghaitech/part_A/yolo/data.yaml`
- `dataset/processed/shanghaitech/part_A/yolo/images/{train,val,test}/`
- `dataset/processed/shanghaitech/part_A/yolo/labels/{train,val,test}/`
- `dataset/processed/shanghaitech/part_A/csrnet/images/{train,val,test}/`
- `dataset/processed/shanghaitech/part_A/csrnet/density_maps/{train,val,test}/`
- `dataset/processed/shanghaitech/part_A/yolo/debug/` (10 debug overlays)
- `dataset/processed/shanghaitech/part_A/csrnet/debug/` (10 debug overlays)
- `SHANGHAITECH_PREPROCESSING_REPORT.md`
