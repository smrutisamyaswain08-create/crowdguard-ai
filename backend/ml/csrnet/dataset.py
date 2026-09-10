import os
import glob
import cv2
import numpy as np
import torch
from torch.utils.data import Dataset
from torchvision import transforms

class CrowdDensityDataset(Dataset):
    """
    PyTorch Dataset for CSRNet crowd density map training & validation.
    Loads RGB image and corresponding .npy ground-truth density map.
    Downsamples ground-truth density map by factor of 8 to match CSRNet output spatial resolution.
    """
    def __init__(self, img_dir, density_dir, is_train=True):
        self.img_dir = img_dir
        self.density_dir = density_dir
        self.is_train = is_train

        self.img_paths = sorted(
            glob.glob(os.path.join(img_dir, "*.jpg")) + 
            glob.glob(os.path.join(img_dir, "*.png"))
        )

        self.transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def __len__(self):
        return len(self.img_paths)

    def __getitem__(self, idx):
        img_path = self.img_paths[idx]
        basename = os.path.basename(img_path)
        name, _ = os.path.splitext(basename)

        npy_path = os.path.join(self.density_dir, f"{name}.npy")
        
        img = cv2.imread(img_path)
        if img is None:
            raise FileNotFoundError(f"Could not read image file: {img_path}")
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        if os.path.exists(npy_path):
            density_map = np.load(npy_path).astype(np.float32)
        else:
            h, w = img.shape[:2]
            density_map = np.zeros((h, w), dtype=np.float32)

        # Apply random horizontal flip for data augmentation during training
        if self.is_train and np.random.rand() > 0.5:
            img = cv2.flip(img, 1)
            density_map = cv2.flip(density_map, 1)

        # Downsample density map by factor of 8 to match CSRNet feature stride (2 maxpools = 1/8 size)
        h, w = density_map.shape
        target_h, target_w = h // 8, w // 8
        
        density_downscaled = cv2.resize(density_map, (target_w, target_h), interpolation=cv2.INTER_CUBIC)
        # Rescale downscaled map so that its total sum remains invariant
        orig_sum = density_map.sum()
        down_sum = density_downscaled.sum()
        if down_sum > 0:
            density_downscaled = (density_downscaled / down_sum) * orig_sum

        img_tensor = self.transform(img)
        density_tensor = torch.from_numpy(density_downscaled).unsqueeze(0)

        return img_tensor, density_tensor, orig_sum
