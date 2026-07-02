"""
ImageProcessingService
======================
Modular image processing pipeline for book covers.

Each method is independent and can be swapped/replaced without
affecting the main pipeline. Uses u2netp model (4.5MB) for
CPU-friendly background removal.

Author: Zaein (Shino)
"""

from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import numpy as np
import logging
import os
import sys
from typing import Optional

# Force CPU-only ONNX (skip CUDA DLL errors on Windows without CUDA toolkit)
os.environ["ORT_DISABLE_CUDA"] = "1"

logger = logging.getLogger("image-service.processor")


class ImageProcessingService:
    """
    Modular image processing service.
    
    Pipeline order:
    1. remove_background() — u2netp via rembg (4.5MB, CPU-friendly)
    2. auto_crop_and_center() — crop to content bbox + center
    3. auto_enhance() — brightness, contrast, sharpen
    4. resize() — fit to 1000x1500 with padding
    5. convert_to_webp() — WebP quality 85
    
    Each method reads from input_path, writes to output_path.
    Returns output_path on success.
    """
    
    def __init__(self):
        self._rembg_session = None
    
    def remove_background(self, input_path: str, output_path: str) -> str:
        """
        Remove image background using u2netp model.
        
        Uses rembg with u2netp model (4.5MB) for lightweight
        background removal. Good quality, CPU-friendly.
        Falls back to u2net (176MB) if u2netp unavailable.

        Args:
            input_path: Path to input image file
            output_path: Path to save background-removed PNG
            
        Returns:
            output_path on success
            
        Raises:
            Exception if background removal fails
        """
        logger.info(f"remove_background: {input_path} → {output_path}")
        
        # Lazy-load rembg session (model loads on first call)
        if self._rembg_session is None:
            from rembg import new_session
            logger.info("Loading u2netp model (4.5MB)...")
            try:
                self._rembg_session = new_session("u2netp")
            except Exception:
                logger.warning("u2netp failed, falling back to u2net (176MB)...")
                self._rembg_session = new_session("u2net")
            logger.info("Model loaded.")
        
        from rembg import remove as rembg_remove
        
        with open(input_path, "rb") as f:
            input_bytes = f.read()
        
        # Process with u2netp
        output_bytes = rembg_remove(
            input_bytes,
            session=self._rembg_session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=8,
        )
        
        with open(output_path, "wb") as f:
            f.write(output_bytes)
        
        # Clean up semi-transparent edge pixels (alpha < 50 → fully transparent)
        img = Image.open(output_path).convert("RGBA")
        arr = np.array(img)
        low_alpha = arr[:, :, 3] < 50
        arr[low_alpha, 3] = 0
        img = Image.fromarray(arr, "RGBA")
        img.save(output_path)
        
        return output_path
    
    def auto_crop_and_center(self, input_path: str, output_path: str, padding_ratio: float = 0.0) -> str:
        """
        Auto-crop image to content bounding box — TIGHT, no padding, no canvas.
        
        
        Args:
            input_path: Path to input PNG (with transparency)
            output_path: Path to save cropped image
            padding_ratio: Margin as fraction of max dimension (default 5%)
            
        Returns:
            output_path on success
        """
        logger.info(f"auto_crop_and_center: {input_path} → {output_path}")
        
        img = Image.open(input_path).convert("RGBA")
        arr = np.array(img)
        
        # Find bounding box of non-transparent pixels
        if arr.shape[2] == 4:
            alpha = arr[:, :, 3]
            rows = np.any(alpha > 10, axis=1)
            cols = np.any(alpha > 10, axis=0)
        else:
            rows = np.any(arr[:, :, :3] < 250, axis=1)
            cols = np.any(arr[:, :, :3] < 250, axis=0)
        
        if not rows.any() or not cols.any():
            logger.warning("No content detected — skipping crop")
            img.save(output_path)
            return output_path
        
        rmin, rmax = np.where(rows)[0][[0, -1]]
        cmin, cmax = np.where(cols)[0][[0, -1]]
        
        h = rmax - rmin
        w = cmax - cmin
        pad_h = int(max(h, w) * padding_ratio)
        pad_w = int(max(h, w) * padding_ratio)
        
        rmin = max(0, rmin - pad_h)
        rmax = min(img.height, rmax + pad_h)
        cmin = max(0, cmin - pad_w)
        cmax = min(img.width, cmax + pad_w)
        
        cropped = img.crop((cmin, rmin, cmax, rmax))
        # Just save the cropped book — no canvas, no centering, no extra space
        cropped.save(output_path)
        return output_path
    
    def auto_enhance(self, input_path: str, output_path: str) -> str:
        """
        Auto-enhance image: brightness, contrast, saturation, sharpen.
        Preserves alpha channel (enhance RGB only).
        """
        logger.info(f"auto_enhance: {input_path} → {output_path}")
        
        img = Image.open(input_path)
        has_alpha = img.mode == "RGBA"
        
        if has_alpha:
            # Split alpha, enhance RGB only
            r, g, b, a = img.split()
            img_rgb = Image.merge("RGB", (r, g, b))
        else:
            img_rgb = img.convert("RGB")
        
        arr = np.array(img_rgb)
        mean_brightness = arr.mean()
        
        if mean_brightness < 100:
            enhancer = ImageEnhance.Brightness(img_rgb)
            img_rgb = enhancer.enhance(1.15)
        
        enhancer = ImageEnhance.Contrast(img_rgb)
        img_rgb = enhancer.enhance(1.15)
        
        enhancer = ImageEnhance.Color(img_rgb)
        img_rgb = enhancer.enhance(1.10)
        
        img_rgb = img_rgb.filter(ImageFilter.UnsharpMask(radius=1, percent=80, threshold=2))
        
        if has_alpha:
            # Merge back alpha
            img_rgb = img_rgb.convert("RGBA")
            img_rgb.putalpha(a)
        
        img_rgb.save(output_path, quality=95)
        return output_path
    
    def resize(self, input_path: str, output_path: str, target_w: int = 1000, target_h: int = 1500) -> str:
        """
        Resize image to fit within target dimensions — NO canvas, NO padding.
        Just proportionally scale down, keep transparency.
        """
        logger.info(f"resize: {input_path} → {output_path} ({target_w}x{target_h})")
        
        img = Image.open(input_path).convert("RGBA")
        
        # Just scale down proportionally — no canvas, no background
        img.thumbnail((target_w, target_h), Image.Resampling.LANCZOS)
        
        img.save(output_path, quality=95)
        return output_path
    
    def convert_to_webp(self, input_path: str, output_path: str, quality: int = 85) -> str:
        """
        Convert image to WebP format with specified quality.
        Preserves alpha channel if present.
        """
        logger.info(f"convert_to_webp: {input_path} → {output_path} (q={quality})")
        
        img = Image.open(input_path)
        if img.mode == "RGBA":
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")
        
        save_kwargs = {
            "format": "WEBP",
            "quality": quality,
            "method": 6,
            "lossless": False,
        }
        if img.mode == "RGBA":
            save_kwargs["lossless"] = True
        
        img.save(output_path, **save_kwargs)
        
        file_size_kb = os.path.getsize(output_path) / 1024
        if file_size_kb > 200:
            logger.info(f"  File too large ({file_size_kb:.0f}KB) — reducing quality...")
            for q in [80, 75, 70]:
                img.save(output_path, format="WEBP", quality=q, method=6, lossless=False)
                file_size_kb = os.path.getsize(output_path) / 1024
                if file_size_kb <= 200:
                    logger.info(f"  Reduced to q={q} ({file_size_kb:.0f}KB)")
                    break
        
        return output_path
