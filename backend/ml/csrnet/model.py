import torch
import torch.nn as nn
from torchvision import models

class CSRNetModel(nn.Module):
    """
    CSRNet Architecture (VGG-16 frontend + Dilated Conv backend).
    Predicts spatial crowd density maps whose spatial integral equals headcount.
    """
    def __init__(self, load_vgg_weights=True):
        super(CSRNetModel, self).__init__()
        self.frontend_feat = [64, 64, 'M', 128, 128, 'M', 256, 256, 256, 'M', 512, 512, 512]
        self.backend_feat  = [512, 512, 512, 256, 128, 64]
        
        self.frontend = self._make_layers(self.frontend_feat)
        self.backend = self._make_layers(self.backend_feat, in_channels=512, dilation=True)
        self.output_layer = nn.Conv2d(64, 1, kernel_size=1)

        if load_vgg_weights:
            try:
                vgg = models.vgg16(weights=models.VGG16_Weights.DEFAULT)
                frontend_dict = self.frontend.state_dict()
                vgg_dict = vgg.features.state_dict()
                
                for (k_src, v_src), (k_dst, v_dst) in zip(vgg_dict.items(), frontend_dict.items()):
                    if v_src.shape == v_dst.shape:
                        frontend_dict[k_dst].copy_(v_src)
                self.frontend.load_state_dict(frontend_dict)
            except Exception as e:
                print(f"[CSRNetModel Warning] Could not load VGG16 weights: {e}")

        # Initialize backend & output weights
        for m in self.backend.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.normal_(m.weight, std=0.01)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
        nn.init.normal_(self.output_layer.weight, std=0.01)
        if self.output_layer.bias is not None:
            nn.init.constant_(self.output_layer.bias, 0)

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
