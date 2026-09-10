import os
import sys
import glob
import cv2
import numpy as np

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ml.datasets.shanghaitech_loader import ShanghaiTechLoader

def analyze_yolo_dataset(processed_dir):
    train_img_dir = os.path.join(processed_dir, 'images', 'train')
    train_lbl_dir = os.path.join(processed_dir, 'labels', 'train')
    val_img_dir = os.path.join(processed_dir, 'images', 'val')
    val_lbl_dir = os.path.join(processed_dir, 'labels', 'val')

    train_imgs = sorted(glob.glob(os.path.join(train_img_dir, '*.jpg')))
    val_imgs = sorted(glob.glob(os.path.join(val_img_dir, '*.jpg')))

    print(f"=== YOLO Dataset Diagnostics ===")
    print(f"Train Images Count : {len(train_imgs)}")
    print(f"Val Images Count   : {len(val_imgs)}")

    all_box_w_px = []
    all_box_h_px = []
    all_box_w_norm = []
    all_box_h_norm = []
    
    downsampled_512_w = []
    downsampled_512_h = []
    downsampled_1024_w = []
    downsampled_1024_h = []

    total_boxes = 0
    invalid_lines = 0

    all_img_paths = train_imgs + val_imgs

    for img_path in all_img_paths:
        basename = os.path.basename(img_path)
        img_name, _ = os.path.splitext(basename)
        
        split = 'train' if 'train' in img_path else 'val'
        lbl_dir = train_lbl_dir if split == 'train' else val_lbl_dir
        lbl_path = os.path.join(lbl_dir, f"{img_name}.txt")

        if not os.path.exists(lbl_path):
            print(f"[Warning] Label missing for image: {basename}")
            continue

        img = cv2.imread(img_path)
        if img is None:
            continue
        h, w = img.shape[:2]

        with open(lbl_path, 'r') as f:
            lines = [l.strip() for l in f.readlines() if l.strip()]

        for line in lines:
            parts = line.split()
            if len(parts) != 5:
                invalid_lines += 1
                continue
            cls_id, xc, yc, bw_norm, bh_norm = int(parts[0]), float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])
            
            bw_px = bw_norm * w
            bh_px = bh_norm * h

            # Calculate box dimensions when downsampled to 512x512 and 1024x1024
            scale_512 = 512.0 / float(w)
            scale_1024 = 1024.0 / float(w)

            bw_512 = bw_px * scale_512
            bh_512 = bh_px * scale_512
            bw_1024 = bw_px * scale_1024
            bh_1024 = bh_px * scale_1024

            all_box_w_px.append(bw_px)
            all_box_h_px.append(bh_px)
            all_box_w_norm.append(bw_norm)
            all_box_h_norm.append(bh_norm)

            downsampled_512_w.append(bw_512)
            downsampled_512_h.append(bh_512)
            downsampled_1024_w.append(bw_1024)
            downsampled_1024_h.append(bh_1024)

            total_boxes += 1

    bw_px_arr = np.array(all_box_w_px)
    bh_px_arr = np.array(all_box_h_px)
    bw_norm_arr = np.array(all_box_w_norm)
    bh_norm_arr = np.array(all_box_h_norm)

    bw_512_arr = np.array(downsampled_512_w)
    bw_1024_arr = np.array(downsampled_1024_w)

    print(f"\n--- Box Statistics (Original Resolution ~2048x1536) ---")
    print(f"Total Bounding Boxes Analyzed : {total_boxes}")
    print(f"Invalid Label Format Count    : {invalid_lines}")
    print(f"Width (Pixels)  - Min: {bw_px_arr.min():.2f}px, Max: {bw_px_arr.max():.2f}px, Mean: {bw_px_arr.mean():.2f}px, Median: {np.median(bw_px_arr):.2f}px")
    print(f"Height (Pixels) - Min: {bh_px_arr.min():.2f}px, Max: {bh_px_arr.max():.2f}px, Mean: {bh_px_arr.mean():.2f}px, Median: {np.median(bh_px_arr):.2f}px")
    print(f"Width (Norm)    - Min: {bw_norm_arr.min():.6f}, Max: {bw_norm_arr.max():.6f}, Mean: {bw_norm_arr.mean():.6f}")
    print(f"Height (Norm)   - Min: {bh_norm_arr.min():.6f}, Max: {bh_norm_arr.max():.6f}, Mean: {bh_norm_arr.mean():.6f}")

    print(f"\n--- Size Range Distribution (Original Pixels) ---")
    print(f"  < 8px       : {np.sum(bw_px_arr < 8) / total_boxes * 100:.2f}% ({np.sum(bw_px_arr < 8)})")
    print(f"  8 - 12px    : {np.sum((bw_px_arr >= 8) & (bw_px_arr < 12)) / total_boxes * 100:.2f}% ({np.sum((bw_px_arr >= 8) & (bw_px_arr < 12))})")
    print(f"  12 - 20px   : {np.sum((bw_px_arr >= 12) & (bw_px_arr < 20)) / total_boxes * 100:.2f}% ({np.sum((bw_px_arr >= 12) & (bw_px_arr < 20))})")
    print(f"  20 - 30px   : {np.sum((bw_px_arr >= 20) & (bw_px_arr < 30)) / total_boxes * 100:.2f}% ({np.sum((bw_px_arr >= 20) & (bw_px_arr < 30))})")
    print(f"  30 - 45px   : {np.sum((bw_px_arr >= 30) & (bw_px_arr < 45)) / total_boxes * 100:.2f}% ({np.sum((bw_px_arr >= 30) & (bw_px_arr < 45))})")
    print(f"  At 45px Cap : {np.sum(bw_px_arr >= 44.9) / total_boxes * 100:.2f}% ({np.sum(bw_px_arr >= 44.9)})")

    print(f"\n--- Impact of Resizing to 512px vs 1024px ---")
    print(f"At 512px Resizing:")
    print(f"  Box Width Mean: {bw_512_arr.mean():.2f}px, Median: {np.median(bw_512_arr):.2f}px")
    print(f"  Boxes < 3px (Sub-pixel/vanishing): {np.sum(bw_512_arr < 3.0) / total_boxes * 100:.2f}% ({np.sum(bw_512_arr < 3.0)})")
    print(f"  Boxes < 8px (Stride 8 minimum):     {np.sum(bw_512_arr < 8.0) / total_boxes * 100:.2f}% ({np.sum(bw_512_arr < 8.0)})")

    print(f"At 1024px Resizing:")
    print(f"  Box Width Mean: {bw_1024_arr.mean():.2f}px, Median: {np.median(bw_1024_arr):.2f}px")
    print(f"  Boxes < 3px: {np.sum(bw_1024_arr < 3.0) / total_boxes * 100:.2f}% ({np.sum(bw_1024_arr < 3.0)})")
    print(f"  Boxes < 8px: {np.sum(bw_1024_arr < 8.0) / total_boxes * 100:.2f}% ({np.sum(bw_1024_arr < 8.0)})")

if __name__ == '__main__':
    p_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dataset', 'processed', 'shanghaitech', 'part_A', 'yolo'))
    analyze_yolo_dataset(p_dir)
