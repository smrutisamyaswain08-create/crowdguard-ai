# S-19 AI Crowd Counting — ML Inference Guide

This document explains the runtime AI inference architecture, configurable settings, tiled multi-scale detection engine, CSRNet density estimation, and API response format.

---

## 1. End-to-End AI Architecture

```
Frontend (React/Vite)
       ↓
POST /api/detection/detect-image/ (multipart/form-data)
       ↓
Django REST View (detect_single_image)
       ↓
Crowd Detection Engine (YoloDetector / CSRNet)
       ↓
Image Preprocessing & Tiled Grid Slicing (1024px / 20% overlap)
       ↓
YOLO / CSRNet Model Forward Pass
       ↓
Global Cross-Tile Non-Maximum Suppression (IoU = 0.50)
       ↓
Final Crowd Count & Spatial Heatmap Synthesis
       ↓
Existing Backward-Compatible JSON Response
```

---

## 2. API Endpoint Contract

**URL**: `/api/detection/detect-image/`  
**Method**: `POST`  
**Headers**: `Authorization: Bearer <token>`  
**Content-Type**: `multipart/form-data`

### Parameters:
- `image` (file, required): Image file (JPG, PNG, WebP).
- `model_type` (string, optional): `'yolo'` or `'csrnet'`. Defaults to `S19_DEFAULT_MODEL` if omitted.
- `confidence` (float, optional): Detection confidence threshold (0.01 - 0.90, default: `0.25`).
- `high_precision` (boolean, optional): `'true'` for Tiled Sliced Inference, `'false'` for Fast Single-Pass (default: `'true'`).

### Backward-Compatible Response Format:
```json
{
  "id": 142,
  "count": 150,
  "density": 0.488,
  "risk": "medium",
  "avg_confidence": 88.5,
  "confidence_score": "88.5%",
  "email_sent": false,
  "alert_triggered": true,
  "overlay_url": "http://localhost:8000/media/manual_20260819_123000.jpg",
  "heatmap_url": "http://localhost:8000/media/manual_hm_20260819_123000.jpg",
  "model_used": "S-19 Head Detector (s19_head_detector.pt)",
  "detection_mode": "Tiled Sliced Multi-Scale Inference",
  "confidence_threshold": 0.25
}
```

---

## 3. Environment Configuration Settings

Configurable via environment variables or `.env`:

| Setting | Environment Variable | Default | Description |
| :--- | :--- | :--- | :--- |
| `S19_YOLO_MODEL_PATH` | `S19_YOLO_MODEL_PATH` | `models/s19_head_detector.pt` | Path to fine-tuned head detector weights |
| `S19_CSRNET_MODEL_PATH` | `S19_CSRNET_MODEL_PATH` | `models/s19_csrnet.pth` | Path to trained CSRNet checkpoint |
| `S19_CONFIDENCE_THRESHOLD` | `S19_CONFIDENCE_THRESHOLD` | `0.25` | Production confidence threshold |
| `S19_NMS_IOU_THRESHOLD` | `S19_NMS_IOU_THRESHOLD` | `0.50` | Global Cross-Tile NMS IoU threshold |
| `S19_TILE_SIZE` | `S19_TILE_SIZE` | `1024` | Tile grid crop resolution |
| `S19_TILE_OVERLAP` | `S19_TILE_OVERLAP` | `0.20` | Tile overlap fraction (20%) |
| `S19_DEFAULT_MODEL` | `S19_DEFAULT_MODEL` | `yolo` | Default crowd model (`yolo` or `csrnet`) |
| `S19_DEVICE` | `S19_DEVICE` | `cpu` | Execution device (`cpu` or `cuda`) |
| `S19_ALLOW_GENERIC_FALLBACK` | `S19_ALLOW_GENERIC_FALLBACK` | `true` | Allows explicit fallback logging if fine-tuned weights are missing |

---

## 4. Tiled Multi-Scale Inference & Cross-Tile NMS

In dense crowds, heads are small. To ensure accurate detection across large high-res images:
1. **Grid Slicing**: Image is divided into overlapping tiles (size = 1024px, overlap = 20%).
2. **Coordinate Mapping**: Detections from all tiles are converted back to original global image space.
3. **Cross-Tile NMS**: Global Non-Maximum Suppression with IoU = 0.50 is run across all gathered detections to eliminate duplicate counts on tile borders.

---

## 5. CSRNet Spatial Density Map Integration

For extremely dense crowds:
1. Input image passes through VGG-16 dilated convolution layers.
2. Generates a spatial crowd density map.
3. **Headcount Integral**: The exact count is computed as:
   $$\text{Count} = \text{round}\left( \sum_{x,y} \text{density\_map}(x, y) \right)$$
4. No arbitrary scaling multipliers are applied.
