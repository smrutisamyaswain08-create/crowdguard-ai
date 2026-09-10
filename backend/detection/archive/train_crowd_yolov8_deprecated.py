"""
DEPRECATED / ARCHIVED SCRIPT

This file (train_crowd_yolov8_deprecated.py) contains the legacy Mall dataset preparation logic
which generated artificial bounding box sizes based on image Y-coordinate formulas:
    box_w = max(10, min(30, int(10 + (y / float(img_h)) * 20)))
    box_h = max(12, min(36, int(12 + (y / float(img_h)) * 24)))

It has been archived in favor of the new ShanghaiTech and S-19 real annotation pipeline:
    - ml/datasets/shanghaitech_loader.py
    - ml/datasets/convert_shanghaitech.py
    - ml/yolo/train_yolo.py
"""

import os
import sys
import shutil
import cv2
import numpy as np
import scipy.io as sio
from ultralytics import YOLO

def prepare_yolo_dataset(project_root):
    dataset_dir = os.path.join(project_root, 'dataset')
    frames_dir = os.path.join(dataset_dir, 'frames', 'frames')
    gt_file = os.path.join(dataset_dir, 'mall_gt.mat')
    
    output_yolo_dir = os.path.join(dataset_dir, 'crowd_yolo')
    train_img_dir = os.path.join(output_yolo_dir, 'images', 'train')
    val_img_dir = os.path.join(output_yolo_dir, 'images', 'val')
    train_lbl_dir = os.path.join(output_yolo_dir, 'labels', 'train')
    val_lbl_dir = os.path.join(output_yolo_dir, 'labels', 'val')

    for d in [train_img_dir, val_img_dir, train_lbl_dir, val_lbl_dir]:
        os.makedirs(d, exist_ok=True)

    print(f"Loading Ground Truth MAT file: {gt_file}")
    gt_data = sio.loadmat(gt_file)
    frames_gt = gt_data['frame'][0]

    img_w, img_h = 640, 480
    total_frames = len(frames_gt)
    print(f"Total frames found: {total_frames}")

    # Split 80% train (1600), 20% val (400)
    train_count = int(total_frames * 0.8)

    for idx in range(total_frames):
        frame_name = f"seq_{idx+1:06d}.jpg"
        src_img_path = os.path.join(frames_dir, frame_name)
        if not os.path.exists(src_img_path):
            continue

        is_train = idx < train_count
        target_img_dir = train_img_dir if is_train else val_img_dir
        target_lbl_dir = train_lbl_dir if is_train else val_lbl_dir

        # Copy image
        dst_img_path = os.path.join(target_img_dir, frame_name)
        if not os.path.exists(dst_img_path):
            shutil.copy(src_img_path, dst_img_path)

        # Extract head coordinates
        f_info = frames_gt[idx]
        locs = f_info[0][0][0]  # Array of (x, y)

        lbl_filename = f"seq_{idx+1:06d}.txt"
        dst_lbl_path = os.path.join(target_lbl_dir, lbl_filename)

        lines = []
        for point in locs:
            x, y = point[0], point[1]
            
            # Legacy formula (Deprecated)
            box_w = max(10, min(30, int(10 + (y / float(img_h)) * 20)))
            box_h = max(12, min(36, int(12 + (y / float(img_h)) * 24)))

            x_center = x / float(img_w)
            y_center = y / float(img_h)
            w_norm = box_w / float(img_w)
            h_norm = box_h / float(img_h)

            x_center = max(0.0, min(1.0, x_center))
            y_center = max(0.0, min(1.0, y_center))
            w_norm = max(0.001, min(1.0, w_norm))
            h_norm = max(0.001, min(1.0, h_norm))

            lines.append(f"0 {x_center:.6f} {y_center:.6f} {w_norm:.6f} {h_norm:.6f}")

        with open(dst_lbl_path, 'w') as f:
            f.write('\n'.join(lines))

    yaml_path = os.path.join(output_yolo_dir, 'crowd_data.yaml')
    yaml_content = f"""path: '{output_yolo_dir.replace("\\\\", "/")}'
train: images/train
val: images/val

names:
  0: person
"""
    with open(yaml_path, 'w') as f:
        f.write(yaml_content)

    return yaml_path
