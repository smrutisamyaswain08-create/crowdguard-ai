import os
import cv2
import numpy as np
import torch
from .model import CSRNetModel

class CSRNetInference:
    """
    CSRNet Inference Engine for standalone crowd counting and density heatmap visualization.
    """
    def __init__(self, checkpoint_path=None, device='cpu'):
        self.device = device if (device == 'cuda' and torch.cuda.is_available()) else 'cpu'
        self.model = CSRNetModel(load_vgg_weights=False)
        self.is_loaded = False

        if checkpoint_path and os.path.exists(checkpoint_path):
            try:
                ckpt = torch.load(checkpoint_path, map_location=self.device)
                state_dict = ckpt.get('state_dict', ckpt)
                self.model.load_state_dict(state_dict)
                self.is_loaded = True
                print(f"[CSRNetInference] Loaded model weights from {checkpoint_path}")
            except Exception as e:
                print(f"[CSRNetInference Warning] Failed loading weights from {checkpoint_path}: {e}")

        self.model.to(self.device)
        self.model.eval()

    def predict(self, frame):
        """
        Runs CSRNet density map inference on an OpenCV BGR image.
        Returns predicted crowd count and density map array.
        """
        h, w, _ = frame.shape
        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        tensor = torch.from_numpy(img_rgb).permute(2, 0, 1).float().unsqueeze(0) / 255.0
        mean = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)
        tensor = (tensor - mean) / std
        tensor = tensor.to(self.device)

        with torch.no_grad():
            density_out = self.model(tensor)
            density_map = torch.nn.functional.softplus(density_out).squeeze().cpu().numpy()

        crowd_count = max(0, int(round(float(np.sum(density_map)))))
        density_resized = cv2.resize(density_map, (w, h), interpolation=cv2.INTER_CUBIC)
        density_resized = np.maximum(0, density_resized)

        return crowd_count, density_resized
