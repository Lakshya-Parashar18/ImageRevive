import base64
import io
import time
import uuid
import math
from typing import Dict, Tuple, Optional
import numpy as np
from PIL import Image
import cv2

from app.schemas.models import HistogramData, ChannelStats, SampleImageInfo

# In-memory image cache: image_id -> (np_array_rgb, metadata_dict, timestamp)
_IMAGE_CACHE: Dict[str, Dict] = {}
CACHE_TTL_SECONDS = 7200  # 2 hours

def clean_expired_cache():
    now = time.time()
    expired = [k for k, v in _IMAGE_CACHE.items() if now - v.get("timestamp", 0) > CACHE_TTL_SECONDS]
    for k in expired:
        _IMAGE_CACHE.pop(k, None)

def store_image_in_cache(img_rgb: np.ndarray, filename: str = "image.png", content_type: str = "image/png", custom_id: Optional[str] = None) -> str:
    clean_expired_cache()
    image_id = custom_id if custom_id else str(uuid.uuid4())
    _IMAGE_CACHE[image_id] = {
        "image": img_rgb,
        "filename": filename,
        "content_type": content_type,
        "timestamp": time.time(),
        "width": img_rgb.shape[1],
        "height": img_rgb.shape[0],
        "channels": 1 if len(img_rgb.shape) == 2 else img_rgb.shape[2]
    }
    return image_id

def get_image_from_cache(image_id: str) -> Optional[np.ndarray]:
    item = _IMAGE_CACHE.get(image_id)
    if item:
        item["timestamp"] = time.time()  # touch
        return item["image"]
    return None

def numpy_to_base64(img_rgb: np.ndarray, format: str = "PNG", quality: int = 95) -> str:
    """Encodes a NumPy RGB or Grayscale uint8 array to a base64 data URL."""
    if img_rgb.dtype != np.uint8:
        img_rgb = np.clip(img_rgb, 0, 255).astype(np.uint8)
    
    if len(img_rgb.shape) == 2:
        pil_img = Image.fromarray(img_rgb, mode='L')
    elif img_rgb.shape[2] == 3:
        pil_img = Image.fromarray(img_rgb, mode='RGB')
    elif img_rgb.shape[2] == 4:
        pil_img = Image.fromarray(img_rgb, mode='RGBA')
    else:
        pil_img = Image.fromarray(img_rgb[:, :, 0], mode='L')
        
    buf = io.BytesIO()
    if format.upper() in ["JPG", "JPEG"]:
        if pil_img.mode in ("RGBA", "P"):
            pil_img = pil_img.convert("RGB")
        pil_img.save(buf, format="JPEG", quality=quality)
        mime = "image/jpeg"
    else:
        pil_img.save(buf, format="PNG")
        mime = "image/png"
        
    b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:{mime};base64,{b64_str}"

def base64_to_numpy(data_url_or_b64: str) -> Tuple[np.ndarray, str]:
    """Decodes a base64 data URL to a NumPy RGB uint8 array and format."""
    if "," in data_url_or_b64:
        header, b64_str = data_url_or_b64.split(",", 1)
        mime = header.split(";")[0].split(":")[1] if ":" in header else "image/png"
    else:
        b64_str = data_url_or_b64
        mime = "image/png"
        
    raw_bytes = base64.b64decode(b64_str)
    if len(raw_bytes) > 15 * 1024 * 1024:
        raise ValueError("Image file size exceeds maximum permitted limit of 15 MB")
        
    pil_img = Image.open(io.BytesIO(raw_bytes))
    format_name = pil_img.format or "PNG"
    
    # Check dimensions
    if pil_img.width > 4096 or pil_img.height > 4096:
        raise ValueError(f"Image dimensions ({pil_img.width}x{pil_img.height}) exceed maximum allowed 4096x4096px")
        
    if pil_img.mode == 'RGBA':
        # Flatten RGBA onto white background or preserve RGB
        background = Image.new("RGB", pil_img.size, (255, 255, 255))
        background.paste(pil_img, mask=pil_img.split()[3])
        np_arr = np.array(background)
    elif pil_img.mode == 'L':
        np_arr = np.array(pil_img)
    else:
        pil_img = pil_img.convert('RGB')
        np_arr = np.array(pil_img)
        
    return np_arr, format_name

def compute_histogram(img: np.ndarray) -> HistogramData:
    """Computes exact 256-bin histograms for R, G, B, and Luminance/Grayscale channels."""
    bins = list(range(256))
    if len(img.shape) == 2:
        hist_gray, _ = np.histogram(img.ravel(), bins=256, range=(0, 256))
        return HistogramData(bins=bins, grayscale=hist_gray.tolist())
    
    r_hist, _ = np.histogram(img[:, :, 0].ravel(), bins=256, range=(0, 256))
    g_hist, _ = np.histogram(img[:, :, 1].ravel(), bins=256, range=(0, 256))
    b_hist, _ = np.histogram(img[:, :, 2].ravel(), bins=256, range=(0, 256))
    
    # Compute ITU-R BT.601 Luminance Y = 0.299R + 0.587G + 0.114B
    gray = (0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2]).astype(np.uint8)
    lum_hist, _ = np.histogram(gray.ravel(), bins=256, range=(0, 256))
    
    return HistogramData(
        bins=bins,
        red=r_hist.tolist(),
        green=g_hist.tolist(),
        blue=b_hist.tolist(),
        grayscale=lum_hist.tolist()
    )

def calculate_entropy(img: np.ndarray) -> float:
    """Calculates Shannon entropy of an image in bits: H = -sum(p * log2(p))."""
    if len(img.shape) == 3:
        # Convert to grayscale for global luminance entropy
        gray = (0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2]).astype(np.uint8)
    else:
        gray = img
        
    hist, _ = np.histogram(gray.ravel(), bins=256, range=(0, 256))
    total_pixels = gray.size
    p = hist / total_pixels
    p = p[p > 0]
    return float(-np.sum(p * np.log2(p)))

def compute_channel_stats(img: np.ndarray) -> Dict[str, ChannelStats]:
    stats = {}
    if len(img.shape) == 2:
        stats["Grayscale"] = ChannelStats(
            min=float(np.min(img)),
            max=float(np.max(img)),
            mean=float(np.round(np.mean(img), 2)),
            std=float(np.round(np.std(img), 2))
        )
    else:
        channels = [("Red", img[:, :, 0]), ("Green", img[:, :, 1]), ("Blue", img[:, :, 2])]
        for name, ch in channels:
            stats[name] = ChannelStats(
                min=float(np.min(ch)),
                max=float(np.max(ch)),
                mean=float(np.round(np.mean(ch), 2)),
                std=float(np.round(np.std(ch), 2))
            )
        gray = (0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2])
        stats["Luminance"] = ChannelStats(
            min=float(np.min(gray)),
            max=float(np.max(gray)),
            mean=float(np.round(np.mean(gray), 2)),
            std=float(np.round(np.std(gray), 2))
        )
    return stats

# --- Procedural Academic Sample Images Generator ---

def generate_sample_images() -> Dict[str, Tuple[np.ndarray, Dict]]:
    samples = {}
    
    # 1. High-Contrast Cameraman / Test Scene
    w, h = 512, 512
    img1 = np.zeros((h, w, 3), dtype=np.uint8)
    # Sky gradient
    for y in range(256):
        val = int(240 - y * 0.4)
        img1[y, :] = [val, val + 5, val + 15]
    # Ground texture
    for y in range(256, h):
        val = int(50 + (y - 256) * 0.3)
        img1[y, :] = [val, val + 10, val - 10]
    # Building silhouette
    img1[120:256, 320:480] = [35, 40, 48]
    # Windows
    for wy in range(140, 240, 25):
        for wx in range(340, 460, 30):
            img1[wy:wy+15, wx:wx+18] = [210, 180, 80]
    # Figure / cameraman silhouette
    cv2.circle(img1, (180, 160), 28, (25, 25, 30), -1)
    cv2.rectangle(img1, (160, 188), (200, 310), (25, 25, 30), -1)
    # Tripod legs
    cv2.line(img1, (180, 240), (130, 410), (35, 35, 40), 6)
    cv2.line(img1, (180, 240), (230, 410), (35, 35, 40), 6)
    cv2.line(img1, (180, 240), (180, 400), (35, 35, 40), 6)
    # Camera box
    cv2.rectangle(img1, (190, 145), (250, 180), (45, 45, 55), -1)
    cv2.rectangle(img1, (250, 150), (275, 175), (60, 60, 70), -1)
    # Resolution test bars at bottom left
    for i in range(10):
        thickness = 1 + i // 2
        x = 40 + i * 8
        cv2.line(img1, (x, 440), (x, 490), (240, 240, 240), thickness)
    
    samples["cameraman"] = (
        img1,
        {
            "id": "cameraman",
            "title": "Cameraman & Detail Target",
            "description": "Standard benchmark with sky gradients, dark silhouette edges, fine details, and resolution test bars.",
            "category": "Edges & Detail",
            "width": w,
            "height": h
        }
    )
    
    # 2. Geometric Frequency Siemens Star & Circles (Ideal for Sampling, Aliasing, FFT)
    img2 = np.zeros((h, w), dtype=np.uint8)
    cy, cx = h // 2, w // 2
    y_coords, x_coords = np.ogrid[:h, :w]
    angles = np.arctan2(y_coords - cy, x_coords - cx)
    radii = np.sqrt((x_coords - cx)**2 + (y_coords - cy)**2)
    # 32 rays
    star = ((np.sin(angles * 32) > 0) * 255).astype(np.uint8)
    # Concentric rings
    rings = ((np.sin(radii / 4.0) > 0) * 255).astype(np.uint8)
    # Blend: inside radius 180 star, outside concentric rings
    mask = radii < 180
    img2[mask] = star[mask]
    img2[~mask] = rings[~mask]
    # Center white disc
    cv2.circle(img2, (cx, cy), 12, 255, -1)
    img2_rgb = cv2.cvtColor(img2, cv2.COLOR_GRAY2RGB)
    
    samples["frequency_star"] = (
        img2_rgb,
        {
            "id": "frequency_star",
            "title": "Siemens Star",
            "description": "High-frequency spokes and circular patterns designed for demonstrating aliasing, sampling, FFT spectra, and filtering.",
            "category": "Frequency Patterns",
            "width": w,
            "height": h
        }
    )
    
    # 3. Low-Contrast Medical Phantom (Ideal for Contrast Stretching & Histogram Equalization)
    img3 = np.zeros((h, w), dtype=np.uint8)
    # Soft background with slight gradient in narrow range [80, 130]
    for y in range(h):
        for x in range(w):
            dist = math.sqrt((x - cx)**2 + (y - cy)**2)
            val = 95 + int(20 * math.sin(dist / 40.0) + 10 * (y / h))
            img3[y, x] = np.clip(val, 75, 135)
    # Phantom anatomical structures (bones and soft tissue with low contrast differences)
    cv2.ellipse(img3, (cx, cy), (140, 180), 0, 0, 360, 118, -1)
    cv2.ellipse(img3, (cx, cy), (110, 150), 0, 0, 360, 102, -1)
    # Rib-like structures
    for r in range(-120, 130, 35):
        cv2.ellipse(img3, (cx, cy + r), (80, 15), 10, 0, 180, 125, 4)
    # Small lesions/nodules with subtle intensity differences of +10 to +15
    cv2.circle(img3, (cx - 40, cy - 30), 16, 126, -1)
    cv2.circle(img3, (cx + 50, cy + 40), 12, 124, -1)
    cv2.circle(img3, (cx - 20, cy + 60), 8, 128, -1)
    # Gaussian blur to mimic analog radiograph softness
    img3 = cv2.GaussianBlur(img3, (9, 9), 2.5)
    img3_rgb = cv2.cvtColor(img3, cv2.COLOR_GRAY2RGB)
    
    samples["medical_phantom"] = (
        img3_rgb,
        {
            "id": "medical_phantom",
            "title": "Low-Contrast Image",
            "description": "Narrow dynamic range [75-135] mimicking soft-tissue radiography. Ideal to test contrast stretching and histogram equalization.",
            "category": "Contrast Recovery",
            "width": w,
            "height": h
        }
    )
    
    # 4. Vibrant Color Spectrum & Geometric Shapes (Ideal for Color Channels & Spatial Filters)
    img4 = np.zeros((h, w, 3), dtype=np.uint8)
    # Color gradients in HSV space converted to RGB
    for y in range(h):
        for x in range(w):
            hue = int((x / w) * 179)
            sat = int(180 + 75 * (y / h))
            val = int(220 - 60 * (y / h))
            img4[y, x] = [hue, sat, val]
    img4 = cv2.cvtColor(img4, cv2.COLOR_HSV2RGB)
    # Overlay high-contrast geometric objects
    cv2.rectangle(img4, (60, 60), (180, 180), (240, 50, 50), -1)
    cv2.circle(img4, (380, 140), 65, (50, 220, 60), -1)
    cv2.ellipse(img4, (256, 360), (100, 50), 30, 0, 360, (50, 100, 240), -1)
    # Text overlay
    cv2.putText(img4, "ImageRevive Studio", (70, 270), cv2.FONT_HERSHEY_DUPLEX, 1.1, (255, 255, 255), 2, cv2.LINE_AA)
    
    samples["color_studio"] = (
        img4,
        {
            "id": "color_studio",
            "title": "Chromatic Color Studio",
            "description": "Multi-channel RGB test image with saturated gradients, sharp geometric shapes, and typography for color-preserving processing.",
            "category": "Color & Channels",
            "width": w,
            "height": h
        }
    )
    
    return samples

# Cache sample images on startup
_INITIALIZED_SAMPLES = None

def get_preloaded_samples() -> Dict[str, Tuple[np.ndarray, Dict]]:
    global _INITIALIZED_SAMPLES
    if _INITIALIZED_SAMPLES is None:
        _INITIALIZED_SAMPLES = generate_sample_images()
    return _INITIALIZED_SAMPLES
