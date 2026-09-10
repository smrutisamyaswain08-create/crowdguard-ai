# S-19 AI Crowd Counting — Backend & ML Audit Report

## 1. Current AI Architecture
The S-19 Backend is built on Django / Django REST Framework with PyTorch and Ultralytics YOLOv8. The core crowd detection logic resides in the `detection` app.

- **Primary Detector**: `YoloDetector` (`backend/detection/yolo_detector.py`) wrapping YOLOv8 for head/person bounding box detection and dynamic Gaussian blob heatmap generation.
- **Secondary Detector**: `CSRNet` (`backend/detection/csrnet_model.py`), a VGG-16 dilated convolution model for high-density spatial crowd density map estimation.
- **Separated Forecasting**: `PuriHistoricalCrowdModel` (`backend/analytics/ml_models.py`), an XGBoost/heuristic historical time-series model predicting future crowd footfall based on location, hour, weekday, month, and weather. This is strictly separated from image-based photo crowd counting.

```
Frontend (React/Vite)
       ↓ POST /api/detection/detect-image/ (multipart/form-data with image)
Django REST API (detection.views.detect_single_image)
       ↓
YoloDetector / CSRNet (Crowd Detection Service)
       ↓
Tiled Multi-Scale Inference & NMS Post-Processing
       ↓
Final Crowd Count, Heatmap, Overlay & Risk Category
       ↓
JSON Response
```

---

## 2. Current YOLO Implementation
- **Class**: `YoloDetector` (`backend/detection/yolo_detector.py`)
- **Weight Loading Logic**: Attempts to load custom weights from `dataset/crowd_yolo/runs/yolov8_crowd_trained/weights/best.pt`, `yolov8_crowd_best.pt`, or falls back silently to `yolov8m.pt` / `yolov8n.pt`.
- **Inference Mode**: `predict_tiled()` runs 3 un-configurable passes:
  1. Upscaling image to 1600px if max dimension < 1600px.
  2. Global pass at 1280px with confidence threshold = `conf` (default 0.08 - 0.12).
  3. 640x640 tiled grid pass with overlap = 0.35.
  4. 416x416 micro-tiled grid pass with overlap = 0.35.
- **NMS**: Applies custom `apply_nms` with IoU threshold 0.25 across collected multi-pass bounding boxes.
- **Heatmap & Density**: Calculates Gaussian blobs at centers of bounding boxes and normalizes.

---

## 3. Current CSRNet Implementation
- **Class**: `CSRNet` (`backend/detection/csrnet_model.py`)
- **Architecture**: VGG-16 frontend (layers up to conv3_3/conv4_3) + dilated convolution backend (dilation rate 2) + 1x1 conv output layer.
- **Inference**:
  - Takes BGR image, normalizes with ImageNet mean/std.
  - Applies Softplus activation: `density_map = torch.nn.functional.softplus(density_out)`.
  - Applies an arbitrary scaling factor: `density_scale = 0.05` (`density_map = density_map * 0.05`), which distorts the crowd count sum.
  - Computes `crowd_count = max(0, int(round(float(np.sum(density_map)))))`.

---

## 4. Current Dataset Pipeline
- **Script**: `backend/detection/train_crowd_yolov8.py`
- **Data Source**: Mall dataset (`dataset/mall_gt.mat` and `dataset/frames/frames/`).
- **Flaws Identified**:
  - Uses an **artificial bounding box sizing formula** based on Y-coordinate:
    `box_w = max(10, min(30, int(10 + (y / float(img_h)) * 20)))`
    `box_h = max(12, min(36, int(12 + (y / float(img_h)) * 24)))`
  - Synthetic boxes do not represent true ground-truth head bounding boxes.
  - Lacks ShanghaiTech dataset loading, ground-truth density map generation, and proper split validation.

---

## 5. Current Inference Pipeline & Flow
1. Endpoint `POST /api/detection/detect-image/` receives image upload (`request.FILES['image']`).
2. Optional parameters `high_precision` (bool) and `confidence` (float).
3. Image decoded via OpenCV + PIL fallback.
4. `get_yolo_detector().process_frame(frame, high_precision, conf)` called.
5. Returns `count`, `density`, `heatmap`, `overlay`.
6. Risk level calculated via `get_risk_level(count, density)`.
7. `Detection` instance created and stored in database.
8. Alerts and email triggers processed if risk >= medium.
9. JSON returned to frontend with all required fields.

---

## 6. Identified Accuracy Problems & Deficiencies
1. **Low Confidence Threshold Default**: Default confidence threshold (0.08 - 0.12) produces high false-positive rates on complex background textures.
2. **Fixed Hardcoded Tiled Pass Sizes**: Hardcoded multi-pass grid (1280px + 640px + 416px) with fixed overlap leads to excessive redundant detections and slow inference.
3. **Arbitrary CSRNet Scaling Factor**: CSRNet applies `density_map * 0.05` instead of deriving counts directly from a properly trained density map sum.
4. **Fake Bounding Boxes in YOLO Training**: `train_crowd_yolov8.py` calculates head boxes using `y / float(img_h)` linear height scaling instead of realistic configurable head boxes or point annotations.
5. **Silent Model Fallback**: If fine-tuned weights are missing, backend silently falls back to COCO pre-trained `yolov8n.pt`/`yolov8m.pt` without notifying system or configuration parameters.
6. **Lack of ShanghaiTech Support**: No `.mat` annotation loader, density map generator (Gaussian kernels), standard MAE/RMSE evaluation metrics, or modular evaluation command.

---

## 7. Files That Need Modification
- [`backend/crowd_management/settings.py`](file:///c:/Users/user/Downloads/CROWD-MANAGEMENT-SYSTEM-main/backend/crowd_management/settings.py): Add S19 environment variables (`S19_YOLO_MODEL_PATH`, `S19_CSRNET_MODEL_PATH`, `S19_CONFIDENCE_THRESHOLD`, `S19_NMS_IOU_THRESHOLD`, `S19_TILE_SIZE`, `S19_TILE_OVERLAP`, `S19_DEFAULT_MODEL`, `S19_DEVICE`, `S19_HEAD_BOX_WIDTH`, `S19_HEAD_BOX_HEIGHT`).
- [`backend/detection/yolo_detector.py`](file:///c:/Users/user/Downloads/CROWD-MANAGEMENT-SYSTEM-main/backend/detection/yolo_detector.py): Refactor tiled inference, NMS, configurable defaults, fallback reporting, and explicit model path handling.
- [`backend/detection/csrnet_model.py`](file:///c:/Users/user/Downloads/CROWD-MANAGEMENT-SYSTEM-main/backend/detection/csrnet_model.py): Remove `* 0.05` arbitrary scaling factor, implement clean density map summation, model loading, and inference.
- [`backend/detection/views.py`](file:///c:/Users/user/Downloads/CROWD-MANAGEMENT-SYSTEM-main/backend/detection/views.py): Update `detect_single_image` to support optional `model_type` parameter (`yolo` or `csrnet`) while strictly preserving backward-compatible JSON response schema.
- [`backend/detection/train_crowd_yolov8.py`](file:///c:/Users/user/Downloads/CROWD-MANAGEMENT-SYSTEM-main/backend/detection/train_crowd_yolov8.py): Archive / deprecate old script after verifying zero dependencies.

---

## 8. Files That Must Remain Unchanged / Protected
- Frontend application (`frontend/*`)
- API endpoints contract (`/api/detection/detect-image/`)
- Existing response fields (`count`, `density`, `risk`, `overlay_url`, `heatmap_url`, `avg_confidence`, `model_used`, `detection_mode`, `confidence_threshold`, `confidence_score`, `email_sent`, `alert_triggered`)
- Database models (`backend/detection/models.py`, `backend/camera/models.py`, `backend/alerts/models.py`)
- Crowd forecasting system (`backend/analytics/ml_models.py` - PuriHistoricalCrowdModel)
