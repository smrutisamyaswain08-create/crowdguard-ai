import os
import sys
import glob
import cv2
import numpy as np

def analyze_1024_boxes(processed_dir):
    train_img_dir = os.path.join(processed_dir, 'images', 'train')
    train_lbl_dir = os.path.join(processed_dir, 'labels', 'train')
    val_img_dir = os.path.join(processed_dir, 'images', 'val')
    val_lbl_dir = os.path.join(processed_dir, 'labels', 'val')

    train_imgs = sorted(glob.glob(os.path.join(train_img_dir, '*.jpg')))
    val_imgs = sorted(glob.glob(os.path.join(val_img_dir, '*.jpg')))
    all_img_paths = train_imgs + val_imgs

    downsampled_1024_w = []

    for img_path in all_img_paths:
        basename = os.path.basename(img_path)
        img_name, _ = os.path.splitext(basename)
        split = 'train' if 'train' in img_path else 'val'
        lbl_dir = train_lbl_dir if split == 'train' else val_lbl_dir
        lbl_path = os.path.join(lbl_dir, f"{img_name}.txt")

        if not os.path.exists(lbl_path):
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
                continue
            bw_norm = float(parts[3])
            bw_px = bw_norm * w
            scale_1024 = 1024.0 / float(w)
            bw_1024 = bw_px * scale_1024
            downsampled_1024_w.append(bw_1024)

    arr = np.array(downsampled_1024_w)
    total = len(arr)

    p_lt_4 = np.sum(arr < 4.0) / total * 100.0
    p_4_8 = np.sum((arr >= 4.0) & (arr < 8.0)) / total * 100.0
    p_8_12 = np.sum((arr >= 8.0) & (arr < 12.0)) / total * 100.0
    p_12_20 = np.sum((arr >= 12.0) & (arr < 20.0)) / total * 100.0
    p_gt_20 = np.sum(arr >= 20.0) / total * 100.0

    print(f"=== GT Box Width Statistics at 1024px Resolution ===")
    print(f"Total Bounding Boxes : {total}")
    print(f"Minimum Box Width    : {arr.min():.2f}px")
    print(f"Maximum Box Width    : {arr.max():.2f}px")
    print(f"Mean Box Width       : {arr.mean():.2f}px")
    print(f"Median Box Width     : {np.median(arr):.2f}px")
    print(f"Percentage < 4px     : {p_lt_4:.2f}% ({np.sum(arr < 4.0)})")
    print(f"Percentage 4-8px     : {p_4_8:.2f}% ({np.sum((arr >= 4.0) & (arr < 8.0))})")
    print(f"Percentage 8-12px    : {p_8_12:.2f}% ({np.sum((arr >= 8.0) & (arr < 12.0))})")
    print(f"Percentage 12-20px   : {p_12_20:.2f}% ({np.sum((arr >= 12.0) & (arr < 20.0))})")
    print(f"Percentage > 20px    : {p_gt_20:.2f}% ({np.sum(arr >= 20.0)})")

if __name__ == '__main__':
    p_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dataset', 'processed', 'shanghaitech', 'part_A', 'yolo'))
    analyze_1024_boxes(p_dir)
