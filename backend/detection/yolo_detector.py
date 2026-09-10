import os
import cv2
import numpy as np
import torch
from django.conf import settings
from ultralytics import YOLO
from .csrnet_model import CSRNet

class YoloDetector:
    """
    S-19 Configurable High-Precision Crowd Detector.
    Supports single-pass and multi-scale tiled grid inference with global cross-tile NMS.
    Integrates with fine-tuned S-19 head detection models and CSRNet spatial density models.
    """
    def __init__(self, model_path=None):
        # 1. Device Configuration
        configured_device = getattr(settings, 'S19_DEVICE', 'cpu')
        if configured_device == 'cuda' and not torch.cuda.is_available():
            self.device = 'cpu'
        else:
            self.device = configured_device if torch.cuda.is_available() else 'cpu'

        self.csrnet_model = None

        # 2. Configurable Settings Defaults
        self.default_model_path = model_path or getattr(settings, 'S19_YOLO_MODEL_PATH', 'models/s19_head_detector.pt')
        self.default_conf = getattr(settings, 'S19_CONFIDENCE_THRESHOLD', 0.25)
        self.default_iou = getattr(settings, 'S19_NMS_IOU_THRESHOLD', 0.50)
        self.default_tile_size = getattr(settings, 'S19_TILE_SIZE', 1024)
        self.default_tile_overlap = getattr(settings, 'S19_TILE_OVERLAP', 0.20)
        self.allow_fallback = getattr(settings, 'S19_ALLOW_GENERIC_FALLBACK', True)

        # 3. Model Loading & Verification
        self.is_s19_model = False
        loaded_model_path = None

        if os.path.exists(self.default_model_path):
            loaded_model_path = self.default_model_path
            self.is_s19_model = True
            self.model_name = "S-19 Head Detector (s19_head_detector.pt)"
        elif os.path.exists(os.path.join(settings.BASE_DIR, self.default_model_path)):
            loaded_model_path = os.path.join(settings.BASE_DIR, self.default_model_path)
            self.is_s19_model = True
            self.model_name = "S-19 Head Detector (s19_head_detector.pt)"
        elif self.allow_fallback:
            # Explicitly mark generic fallback
            fallback_path = 'yolov8m.pt' if os.path.exists('yolov8m.pt') else 'yolov8n.pt'
            loaded_model_path = fallback_path
            self.is_s19_model = False
            self.model_name = f"Generic COCO Model ({fallback_path} Fallback)"
            print(f"[YoloDetector Notice] S-19 model '{self.default_model_path}' not found. Using explicit fallback: {fallback_path}")
        else:
            raise FileNotFoundError(
                f"[YoloDetector Error] Required S-19 model missing at '{self.default_model_path}' and fallback is disabled."
            )

        try:
            self.model = YOLO(loaded_model_path)
        except Exception as e:
            print(f"[YoloDetector Error] Failed to load model weights from {loaded_model_path}: {e}")
            if self.allow_fallback:
                self.model = YOLO('yolov8n.pt')
                self.model_name = "Generic COCO Model (yolov8n.pt Emergency Fallback)"
                self.is_s19_model = False
            else:
                raise e

        self.model.to(self.device)
        print(f"YOLO Detector initialized on device '{self.device}' using: {self.model_name} (S-19 Custom: {self.is_s19_model})")

    def generate_gaussian_blob(self, height, width, center_x, center_y, sigma=15):
        """Generates a 2D Gaussian kernel blob on a density matrix."""
        y, x = np.ogrid[-center_y:height-center_y, -center_x:width-center_x]
        h = np.exp(-(x*x + y*y) / (2. * sigma * sigma))
        h[h < 0.0001] = 0
        return h

    def compute_iou(self, box1, box2):
        """Computes Intersection over Union (IoU) between two bounding boxes (x1, y1, x2, y2)."""
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

    def apply_nms(self, boxes, iou_threshold=0.50):
        """Applies Global Cross-Tile Non-Maximum Suppression (NMS) to eliminate duplicates."""
        if not boxes:
            return []
        # Sort boxes by confidence score descending
        boxes = sorted(boxes, key=lambda b: b[4], reverse=True)
        keep = []
        while len(boxes) > 0:
            best = boxes.pop(0)
            keep.append(best)
            boxes = [b for b in boxes if self.compute_iou(best, b) < iou_threshold]
        return keep

    def predict_tiled(self, frame, conf=None, tile_size=None, overlap=None, iou_thresh=None):
        """
        Unified Configurable Tiled Grid Inference Engine with Global Cross-Tile NMS:
        - Slices high-resolution or dense crowd images into tiles of configurable size & overlap.
        - Translates all tile coordinates back to original image coordinate space.
        - Performs global Cross-Tile Non-Maximum Suppression (NMS) to eliminate duplicate counts.
        """
        conf_val = conf if conf is not None else self.default_conf
        tile_sz = tile_size if tile_size is not None else self.default_tile_size
        ovr = overlap if overlap is not None else self.default_tile_overlap
        iou_tr = iou_thresh if iou_thresh is not None else self.default_iou

        h, w, _ = frame.shape
        all_boxes = []

        def run_yolo_pass(img_patch, offset_x=0, offset_y=0):
            patch_h, patch_w, _ = img_patch.shape
            imgsz_val = max(320, min(max(patch_h, patch_w), 1280))
            
            # Align imgsz_val to multiple of 32
            imgsz_val = int(round(imgsz_val / 32.0) * 32)
            
            results = self.model(img_patch, imgsz=imgsz_val, conf=conf_val, verbose=False)
            for box in results[0].boxes:
                cls_id = int(box.cls[0])
                # If S-19 head detector model is used, all detections (cls 0) are heads.
                # If generic COCO model is used, cls 0 represents person.
                if cls_id == 0:
                    coords = box.xyxy[0].cpu().numpy()
                    x1, y1, x2, y2 = map(int, coords)
                    c = float(box.conf[0])
                    if c >= conf_val:
                        gx1 = x1 + offset_x
                        gy1 = y1 + offset_y
                        gx2 = x2 + offset_x
                        gy2 = y2 + offset_y
                        all_boxes.append((gx1, gy1, gx2, gy2, c))

        # 1. Run global full-image pass
        run_yolo_pass(frame, offset_x=0, offset_y=0)

        # 2. If image is larger than tile size, execute Tiled Grid Slicing Pass
        if h > tile_sz or w > tile_sz:
            stride = max(100, int(tile_sz * (1.0 - ovr)))
            
            x_cuts = list(range(0, max(1, w - tile_sz + 1), stride))
            if x_cuts[-1] + tile_sz < w:
                x_cuts.append(w - tile_sz)

            y_cuts = list(range(0, max(1, h - tile_sz + 1), stride))
            if y_cuts[-1] + tile_sz < h:
                y_cuts.append(h - tile_sz)

            for y_start in y_cuts:
                for x_start in x_cuts:
                    tile = frame[y_start:y_start + tile_sz, x_start:x_start + tile_sz]
                    if tile.shape[0] >= 60 and tile.shape[1] >= 60:
                        run_yolo_pass(tile, offset_x=x_start, offset_y=y_start)

        # 3. Apply Global Cross-Tile NMS to deduplicate overlapping counts
        final_boxes = self.apply_nms(all_boxes, iou_threshold=iou_tr)
        return final_boxes

    def process_frame(self, frame, high_precision=True, conf=None, tile_size=None, overlap=None, iou_thresh=None):
        """
        Processes a BGR OpenCV image array and returns:
        - crowd_count (int)
        - average_density (float)
        - heatmap (np.ndarray, BGR)
        - overlay (np.ndarray, BGR)
        Sets self.last_avg_confidence.
        """
        h, w, _ = frame.shape
        density_map = np.zeros((h, w), dtype=np.float32)
        
        conf_val = conf if conf is not None else self.default_conf

        if high_precision:
            person_boxes = self.predict_tiled(
                frame, 
                conf=conf_val, 
                tile_size=tile_size, 
                overlap=overlap, 
                iou_thresh=iou_thresh
            )
        else:
            # Single-pass fast inference
            all_boxes = []
            results = self.model(frame, imgsz=max(320, min(max(h, w), 1280)), conf=conf_val, verbose=False)
            for box in results[0].boxes:
                if int(box.cls[0]) == 0:
                    coords = box.xyxy[0].cpu().numpy()
                    x1, y1, x2, y2 = map(int, coords)
                    c = float(box.conf[0])
                    if c >= conf_val:
                        all_boxes.append((x1, y1, x2, y2, c))
            person_boxes = self.apply_nms(all_boxes, iou_threshold=self.default_iou)

        crowd_count = len(person_boxes)
        avg_confidence = float(np.mean([b[4] for b in person_boxes])) if crowd_count > 0 else 0.95
        self.last_avg_confidence = avg_confidence
        
        # Build Gaussian spatial density map from center coordinates
        for x1, y1, x2, y2, _ in person_boxes:
            cx = (x1 + x2) // 2
            cy = (y1 + y2) // 2
            
            box_w = x2 - x1
            box_h = y2 - y1
            sigma = int(max(8, min((box_w + box_h) / 4, 35)))
            
            blob = self.generate_gaussian_blob(h, w, cx, cy, sigma)
            density_map += blob
            
        # Normalize density map
        density_sum = density_map.sum()
        if density_sum > 0:
            density_map = (density_map / density_sum) * crowd_count
            
        # Average density per 100x100 pixel area block
        average_density = float((crowd_count / (h * w)) * 10000.0) if crowd_count > 0 else 0.0
        
        # Heatmap colormap generation
        max_density = density_map.max()
        if max_density > 0:
            density_norm = np.clip((density_map / max_density) * 255.0, 0, 255).astype(np.uint8)
        else:
            density_norm = np.zeros((h, w), dtype=np.uint8)
            
        heatmap = cv2.applyColorMap(density_norm, cv2.COLORMAP_JET)
        mask = (density_norm == 0)[:, :, np.newaxis]
        heatmap = np.where(mask, np.zeros_like(heatmap), heatmap)
        
        # Blended Overlay
        overlay = cv2.addWeighted(frame, 0.6, heatmap, 0.4, 0)
        
        # Draw bounding boxes and confidence labels
        for x1, y1, x2, y2, conf_score in person_boxes:
            cv2.rectangle(overlay, (x1, y1), (x2, y2), (212, 182, 6), 2)
            label = f"head {int(conf_score * 100)}%" if self.is_s19_model else f"person {int(conf_score * 100)}%"
            (text_w, text_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)
            cv2.rectangle(overlay, (x1, max(0, y1 - text_h - 4)), (x1 + text_w + 4, max(text_h + 4, y1)), (212, 182, 6), -1)
            cv2.putText(overlay, label, (x1 + 2, max(text_h, y1 - 2)), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
            
        return crowd_count, average_density, heatmap, overlay

    def get_csrnet_model(self):
        """Lazy loads the CSRNet spatial density model."""
        if self.csrnet_model is None:
            self.csrnet_model = CSRNet(load_weights=True)
        return self.csrnet_model

    def process_image_only_csrnet(self, frame):
        """
        Runs CSRNet density estimation on the given image frame.
        Fallback to YOLO tiled detection if CSRNet encounters an error.
        Returns: crowd_count, average_density, heatmap, overlay
        """
        try:
            csrnet = self.get_csrnet_model()
            crowd_count, average_density, heatmap, overlay = csrnet.predict_crowd_density(frame)
            self.last_avg_confidence = 0.95
            return crowd_count, average_density, heatmap, overlay
        except Exception as e:
            print(f"[CSRNet Processing Warning] Fallback to YOLO tiled detection: {e}")
            return self.process_frame(frame, high_precision=True)
