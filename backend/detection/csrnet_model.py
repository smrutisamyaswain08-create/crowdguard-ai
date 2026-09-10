import os
import cv2
import numpy as np
import torch
import torch.nn as nn
from torchvision import models, transforms
from django.conf import settings

class CSRNet(nn.Module):
    """
    CSRNet: Congested Scene Recognition Network for High-Density Crowd Counting.
    Uses VGG-16 frontend with dilated convolutional backend to generate spatial crowd density maps.
    The sum of pixel values across the predicted density map gives the exact crowd headcount.
    """
    def __init__(self, model_path=None, load_weights=True):
        super(CSRNet, self).__init__()
        self.device = getattr(settings, 'S19_DEVICE', 'cuda' if torch.cuda.is_available() else 'cpu')
        if self.device == 'cuda' and not torch.cuda.is_available():
            self.device = 'cpu'
        
        self.frontend_feat = [64, 64, 'M', 128, 128, 'M', 256, 256, 256, 'M', 512, 512, 512]
        self.backend_feat  = [512, 512, 512, 256, 128, 64]
        self.frontend = self._make_layers(self.frontend_feat)
        self.backend = self._make_layers(self.backend_feat, in_channels=512, dilation=True)
        self.output_layer = nn.Conv2d(64, 1, kernel_size=1)
        
        # Initialize backend & output layer weights
        for m in self.backend.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.normal_(m.weight, std=0.01)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
        nn.init.normal_(self.output_layer.weight, std=0.01)
        if self.output_layer.bias is not None:
            nn.init.constant_(self.output_layer.bias, 0)

        # Check for trained weights checkpoint path
        target_weights = model_path or getattr(settings, 'S19_CSRNET_MODEL_PATH', None)
        self.is_trained = False

        if target_weights and os.path.exists(target_weights):
            try:
                state_dict = torch.load(target_weights, map_location=self.device)
                if 'state_dict' in state_dict:
                    state_dict = state_dict['state_dict']
                self.load_state_dict(state_dict)
                self.is_trained = True
                print(f"[CSRNet] Successfully loaded trained CSRNet checkpoint: {target_weights}")
            except Exception as e:
                print(f"[CSRNet Warning] Failed to load checkpoint {target_weights}: {e}")

        if not self.is_trained and load_weights:
            try:
                vgg = models.vgg16(weights=models.VGG16_Weights.DEFAULT)
                frontend_dict = self.frontend.state_dict()
                vgg_dict = vgg.features.state_dict()
                
                # Copy matching VGG-16 feature extraction weights
                for (k_src, v_src), (k_dst, v_dst) in zip(vgg_dict.items(), frontend_dict.items()):
                    if v_src.shape == v_dst.shape:
                        frontend_dict[k_dst].copy_(v_src)
                self.frontend.load_state_dict(frontend_dict)
                print("[CSRNet] Initialized VGG16 backbone weights (Untrained Backend).")
            except Exception as e:
                print(f"[CSRNet Warning] Could not load VGG weights: {e}")

        self.to(self.device)
        self.eval()

        self.transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    def forward(self, x):
        x = self.frontend(x)
        x = self.backend(x)
        x = self.output_layer(x)
        return x

    def _make_layers(self, cfg, in_channels=3, batch_norm=False, dilation=False):
        d_rate = 2 if dilation else 1
        layers = []
        for v in cfg:
            if v == 'M':
                layers += [nn.MaxPool2d(kernel_size=2, stride=2)]
            else:
                conv2d = nn.Conv2d(in_channels, v, kernel_size=3, padding=d_rate, dilation=d_rate)
                if batch_norm:
                    layers += [conv2d, nn.BatchNorm2d(v), nn.ReLU(inplace=True)]
                else:
                    layers += [conv2d, nn.ReLU(inplace=True)]
                in_channels = v
        return nn.Sequential(*layers)

    def predict_crowd_density(self, frame):
        """
        Takes an OpenCV BGR frame (np.ndarray) and returns:
        - crowd_count (int): Sum of spatial density map (exact headcount estimate)
        - average_density (float): Density per 100x100px area
        - heatmap (np.ndarray, BGR): Jet colormap visualization of density
        - overlay (np.ndarray, BGR): Blended visualization on original frame
        """
        orig_h, orig_w, _ = frame.shape
        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        input_tensor = self.transform(img_rgb).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            density_out = self.forward(input_tensor)
            density_map = torch.nn.functional.softplus(density_out).squeeze().cpu().numpy()

        # Final crowd count comes directly from sum of spatial density map
        # (NO arbitrary scaling factors such as * 0.05)
        crowd_count = max(0, int(round(float(np.sum(density_map)))))
        
        # Resize density map to original frame dimensions
        density_resized = cv2.resize(density_map, (orig_w, orig_h), interpolation=cv2.INTER_CUBIC)
        density_resized = np.maximum(0, density_resized)
        
        # Average density per 100x100 pixel area
        average_density = float((crowd_count / (orig_h * orig_w)) * 10000.0) if crowd_count > 0 else 0.0
        
        # Generate heatmap colormap
        max_val = density_resized.max()
        if max_val > 0:
            density_norm = np.clip((density_resized / max_val) * 255.0, 0, 255).astype(np.uint8)
        else:
            density_norm = np.zeros((orig_h, orig_w), dtype=np.uint8)

        heatmap = cv2.applyColorMap(density_norm, cv2.COLORMAP_JET)
        mask = (density_norm == 0)[:, :, np.newaxis]
        heatmap = np.where(mask, np.zeros_like(heatmap), heatmap)
        
        # Blended overlay
        overlay = cv2.addWeighted(frame, 0.55, heatmap, 0.45, 0)
        
        # Overlay badge text
        status_note = "" if self.is_trained else " (Untrained CSRNet Model)"
        label = f"CSRNet Count: {crowd_count} | Avg Density: {average_density:.2f}{status_note}"
        cv2.putText(overlay, label, (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2, cv2.LINE_AA)

        return crowd_count, average_density, heatmap, overlay
