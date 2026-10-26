import math
from typing import Dict, Any, List, Optional
import numpy as np

from app.schemas.models import (
    ImageAnalysisResult,
    PixelInspectionResult,
    HistogramData,
    ChannelStats
)
from app.utils.image_io import (
    compute_histogram,
    compute_channel_stats,
    calculate_entropy
)

def analyze_image(img: np.ndarray, image_id: str, format_name: str = "PNG", file_size_bytes: int = 0) -> ImageAnalysisResult:
    height, width = img.shape[:2]
    channels = 1 if len(img.shape) == 2 else img.shape[2]
    color_mode = "Grayscale" if channels == 1 else ("RGB" if channels == 3 else "RGBA")
    
    # Calculate aspect ratio
    gcd_val = math.gcd(width, height)
    aspect_ratio = f"{width // gcd_val}:{height // gcd_val}" if gcd_val > 0 else f"{width}:{height}"
    
    # Approximate file size if not provided
    if file_size_bytes <= 0:
        file_size_bytes = img.nbytes
        
    file_size_kb = round(file_size_bytes / 1024, 2)
    entropy = round(calculate_entropy(img), 3)
    channel_stats = compute_channel_stats(img)
    histogram = compute_histogram(img)
    
    return ImageAnalysisResult(
        image_id=image_id,
        width=width,
        height=height,
        aspect_ratio=aspect_ratio,
        channels=channels,
        color_mode=color_mode,
        format=format_name,
        file_size_bytes=file_size_bytes,
        file_size_kb=file_size_kb,
        entropy=entropy,
        channel_stats=channel_stats,
        histogram=histogram
    )

def inspect_pixel(img: np.ndarray, x: int, y: int, radius: int = 2, neighborhood_radius: Optional[int] = None) -> PixelInspectionResult:
    if neighborhood_radius is not None:
        radius = neighborhood_radius
    height, width = img.shape[:2]
    
    # Clamp coordinates safely
    x = max(0, min(width - 1, x))
    y = max(0, min(height - 1, y))
    
    # Get center pixel value
    if len(img.shape) == 2:
        gray_val = int(img[y, x])
        rgb = [gray_val, gray_val, gray_val]
    else:
        rgb = [int(img[y, x, 0]), int(img[y, x, 1]), int(img[y, x, 2])]
        
    hex_code = f"#{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}"
    normalized = [round(c / 255.0, 3) for c in rgb]
    
    # Extract neighborhood grid (e.g., 5x5 when radius=2)
    neighborhood_size = 2 * radius + 1
    neighborhood: List[List[List[int]]] = []
    neighborhood_coords: List[List[Dict[str, int]]] = []
    
    for dy in range(-radius, radius + 1):
        row_vals: List[List[int]] = []
        row_coords: List[Dict[str, int]] = []
        cur_y = np.clip(y + dy, 0, height - 1)
        
        for dx in range(-radius, radius + 1):
            cur_x = np.clip(x + dx, 0, width - 1)
            row_coords.append({"x": int(cur_x), "y": int(cur_y)})
            
            if len(img.shape) == 2:
                v = int(img[cur_y, cur_x])
                row_vals.append([v, v, v])
            else:
                row_vals.append([
                    int(img[cur_y, cur_x, 0]),
                    int(img[cur_y, cur_x, 1]),
                    int(img[cur_y, cur_x, 2])
                ])
                
        neighborhood.append(row_vals)
        neighborhood_coords.append(row_coords)
        
    return PixelInspectionResult(
        x=x,
        y=y,
        rgb=rgb,
        hex=hex_code,
        normalized=normalized,
        neighborhood_size=neighborhood_size,
        neighborhood=neighborhood,
        neighborhood_coords=neighborhood_coords
    )
