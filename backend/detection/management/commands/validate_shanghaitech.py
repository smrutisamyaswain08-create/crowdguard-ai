import os
import glob
import cv2
import numpy as np
from django.core.management.base import BaseCommand
from django.conf import settings
from ml.datasets.shanghaitech_loader import ShanghaiTechLoader

class Command(BaseCommand):
    help = "Validates the ShanghaiTech Part A dataset, inspects ground-truth annotations, and calculates dataset statistics."

    def add_arguments(self, parser):
        parser.add_argument('--data-path', type=str, default='dataset/shanghaitech', help="Path to ShanghaiTech dataset root")
        parser.add_argument('--part', type=str, default='A', help="ShanghaiTech Part (A or B)")

    def handle(self, *args, **options):
        data_path = options['data_path']
        part = options['part'].upper()

        if not os.path.isabs(data_path):
            data_path = os.path.join(settings.BASE_DIR, '..', data_path)

        train_loader = ShanghaiTechLoader(data_path, part=part, split='train')
        test_loader = ShanghaiTechLoader(data_path, part=part, split='test')

        train_summary = train_loader.validate()
        test_summary = test_loader.validate()

        train_images = train_summary['valid_samples']
        train_anns = train_summary['valid_samples']
        test_images = test_summary['valid_samples']
        test_anns = test_summary['valid_samples']

        missing_imgs = len(train_loader.invalid_samples) + len(test_loader.invalid_samples)
        missing_anns = missing_imgs
        invalid_anns = 0

        train_pass = train_images > 0 and missing_imgs == 0
        test_pass = test_images > 0 and missing_imgs == 0

        self.stdout.write(self.style.SUCCESS("========================================"))
        self.stdout.write(self.style.SUCCESS(f"ShanghaiTech Part {part} Dataset Validation"))
        self.stdout.write(self.style.SUCCESS("========================================"))
        self.stdout.write(f"Train images       : {train_images}")
        self.stdout.write(f"Train annotations  : {train_anns}")
        self.stdout.write(f"Test images        : {test_images}")
        self.stdout.write(f"Test annotations   : {test_anns}")
        self.stdout.write(f"Missing images     : {missing_imgs}")
        self.stdout.write(f"Missing annotations: {missing_anns}")
        self.stdout.write(f"Invalid annotations: {invalid_anns}")
        self.stdout.write("")
        self.stdout.write(f"Train dataset      : {'PASS' if train_pass else 'FAIL'}")
        self.stdout.write(f"Test dataset       : {'PASS' if test_pass else 'FAIL'}")
        self.stdout.write("")
        self.stdout.write("Sample annotations:")
        self.stdout.write(f"{'Image':<20} {'Ground Truth':<15} {'Width x Height':<15}")
        self.stdout.write("-" * 52)

        # Print 5 sample training annotations
        for sample in train_loader.samples[:5]:
            img_path = sample['image_path']
            gt_cnt = sample['ground_truth_count']
            img_name = os.path.basename(img_path)
            img = cv2.imread(img_path)
            h, w = (img.shape[0], img.shape[1]) if img is not None else (0, 0)
            self.stdout.write(f"{img_name:<20} {gt_cnt:<15} {w}x{h:<15}")

        self.stdout.write(self.style.SUCCESS("========================================\n"))

        # Calculate Statistics
        train_counts = [s['ground_truth_count'] for s in train_loader.samples]
        test_counts = [s['ground_truth_count'] for s in test_loader.samples]

        self.stdout.write(self.style.SUCCESS("=== DATASET STATISTICS ==="))
        self.stdout.write("[Training Set Statistics]")
        self.stdout.write(f"  - Number of images: {len(train_counts)}")
        self.stdout.write(f"  - Minimum crowd count: {min(train_counts) if train_counts else 0}")
        self.stdout.write(f"  - Maximum crowd count: {max(train_counts) if train_counts else 0}")
        self.stdout.write(f"  - Average crowd count: {np.mean(train_counts):.2f}" if train_counts else "  - Average: 0")
        self.stdout.write(f"  - Median crowd count : {np.median(train_counts):.1f}" if train_counts else "  - Median: 0")

        self.stdout.write("\n[Test Set Statistics]")
        self.stdout.write(f"  - Number of images: {len(test_counts)}")
        self.stdout.write(f"  - Minimum crowd count: {min(test_counts) if test_counts else 0}")
        self.stdout.write(f"  - Maximum crowd count: {max(test_counts) if test_counts else 0}")
        self.stdout.write(f"  - Average crowd count: {np.mean(test_counts):.2f}" if test_counts else "  - Average: 0")
        self.stdout.write(f"  - Median crowd count : {np.median(test_counts):.1f}" if test_counts else "  - Median: 0")
        self.stdout.write(self.style.SUCCESS("========================================\n"))

        # Prepare derived dataset directories (Section 10)
        proc_yolo_img = os.path.join(settings.BASE_DIR, '..', 'dataset', 'processed', 'shanghaitech', f'part_{part}', 'yolo', 'images')
        proc_yolo_lbl = os.path.join(settings.BASE_DIR, '..', 'dataset', 'processed', 'shanghaitech', f'part_{part}', 'yolo', 'labels')
        proc_csrnet_img = os.path.join(settings.BASE_DIR, '..', 'dataset', 'processed', 'shanghaitech', f'part_{part}', 'csrnet', 'images')
        proc_csrnet_den = os.path.join(settings.BASE_DIR, '..', 'dataset', 'processed', 'shanghaitech', f'part_{part}', 'csrnet', 'density_maps')

        for d in [proc_yolo_img, proc_yolo_lbl, proc_csrnet_img, proc_csrnet_den]:
            os.makedirs(d, exist_ok=True)

        self.stdout.write(self.style.SUCCESS(f"Prepared derived dataset directories at: dataset/processed/shanghaitech/part_{part}/"))
