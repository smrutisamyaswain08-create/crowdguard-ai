import os
import argparse
import time
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from .model import CSRNetModel
from .dataset import CrowdDensityDataset

def train_csrnet(data_dir, output_dir=None, epochs=100, batch_size=1, lr=1e-5, device='cpu', val_ratio=0.2):
    """
    Trains CSRNet model on preprocessed density map dataset.
    Saves trained checkpoints to models/shanghaitech/csrnet/best.pth and models/s19_csrnet.pth.
    """
    device = device if (device == 'cuda' and torch.cuda.is_available()) else 'cpu'
    print(f"[CSRNet Training] Initializing training on device '{device}' for {epochs} epochs...")

    train_img_dir = os.path.join(data_dir, 'images', 'train')
    train_den_dir = os.path.join(data_dir, 'csrnet', 'train')
    
    val_img_dir = os.path.join(data_dir, 'images', 'val')
    val_den_dir = os.path.join(data_dir, 'csrnet', 'val')

    if not os.path.exists(train_img_dir) or not os.path.exists(train_den_dir):
        print(f"[CSRNet Training Error] Training directories missing in {data_dir}. Run preprocessing script first.")
        return None

    train_dataset = CrowdDensityDataset(train_img_dir, train_den_dir, is_train=True)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)

    has_val = os.path.exists(val_img_dir) and os.path.exists(val_den_dir) and len(os.listdir(val_img_dir)) > 0
    if has_val:
        val_dataset = CrowdDensityDataset(val_img_dir, val_den_dir, is_train=False)
        val_loader = DataLoader(val_dataset, batch_size=1, shuffle=False, num_workers=0)

    model = CSRNetModel(load_vgg_weights=True).to(device)
    criterion = nn.MSELoss(reduction='sum').to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)

    best_mae = float('inf')
    
    models_root = output_dir or os.path.join(os.path.dirname(__file__), '..', '..', '..', 'models')
    ckpt_dir = os.path.join(models_root, 'shanghaitech', 'csrnet')
    os.makedirs(ckpt_dir, exist_ok=True)
    
    s19_target_path = os.path.join(models_root, 's19_csrnet.pth')

    for epoch in range(1, epochs + 1):
        model.train()
        epoch_loss = 0.0
        start_time = time.time()

        for imgs, target_den, gt_counts in train_loader:
            imgs = imgs.to(device)
            target_den = target_den.to(device)

            optimizer.zero_grad()
            pred_den = torch.nn.functional.softplus(model(imgs))
            loss = criterion(pred_den, target_den)
            loss.backward()
            optimizer.step()

            epoch_loss += loss.item()

        elapsed = time.time() - start_time
        print(f"Epoch [{epoch}/{epochs}] - Loss: {epoch_loss:.4f} - Time: {elapsed:.2f}s")

        # Validation phase
        if has_val and (epoch % 5 == 0 or epoch == epochs):
            model.eval()
            val_mae = 0.0
            val_samples = 0
            
            with torch.no_grad():
                for imgs, target_den, gt_counts in val_loader:
                    imgs = imgs.to(device)
                    pred_den = torch.nn.functional.softplus(model(imgs))
                    pred_count = pred_den.sum().item()
                    gt_count = gt_counts.item()
                    val_mae += abs(pred_count - gt_count)
                    val_samples += 1

            avg_mae = val_mae / val_samples if val_samples > 0 else 0.0
            print(f"--> Validation MAE: {avg_mae:.2f}")

            if avg_mae < best_mae:
                best_mae = avg_mae
                best_path = os.path.join(ckpt_dir, 'best.pth')
                torch.save({'state_dict': model.state_dict(), 'mae': best_mae, 'epoch': epoch}, best_path)
                torch.save({'state_dict': model.state_dict(), 'mae': best_mae, 'epoch': epoch}, s19_target_path)
                print(f"*** New Best Model Saved (MAE: {best_mae:.2f}) -> {best_path} & {s19_target_path} ***")

        # Save last checkpoint
        last_path = os.path.join(ckpt_dir, 'last.pth')
        torch.save({'state_dict': model.state_dict(), 'epoch': epoch}, last_path)

    print(f"[CSRNet Training] Completed. Best validation MAE: {best_mae:.2f}")
    return s19_target_path

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Train CSRNet Model on Crowd Density Dataset")
    parser.add_argument('--data-dir', type=str, required=True, help="Path to processed dataset directory")
    parser.add_argument('--epochs', type=int, default=100, help="Number of epochs")
    parser.add_argument('--batch-size', type=int, default=1, help="Batch size")
    parser.add_argument('--lr', type=float, default=1e-5, help="Learning rate")
    parser.add_argument('--device', type=str, default='cpu', help="Device (cpu or cuda)")
    args = parser.parse_args()

    train_csrnet(args.data_dir, epochs=args.epochs, batch_size=args.batch_size, lr=args.lr, device=args.device)
