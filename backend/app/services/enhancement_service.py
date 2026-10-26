from typing import Tuple, Dict, Any, Optional
import numpy as np
import cv2

def adjust_brightness(img: np.ndarray, delta: int) -> Tuple[np.ndarray, str]:
    """
    Brightness adjustment: g(x, y) = clip(f(x, y) + delta, 0, 255)
    Module 2: Point processing additive intensity shift.
    """
    result = np.clip(img.astype(np.int16) + delta, 0, 255).astype(np.uint8)
    direction = "increased" if delta > 0 else "decreased"
    explanation = (
        f"Brightness {direction} by delta={delta}. Point transformation shifting the entire "
        f"intensity distribution by a constant scalar, clipping at [0, 255]."
    )
    return result, explanation

def adjust_contrast(img: np.ndarray, alpha: float, beta: int) -> Tuple[np.ndarray, str]:
    """
    Contrast and Brightness scaling: g(x, y) = clip(alpha * f(x, y) + beta, 0, 255)
    Module 2: Linear intensity transformation.
    """
    result = np.clip(alpha * img.astype(np.float32) + beta, 0, 255).astype(np.uint8)
    explanation = (
        f"Linear contrast scaling with gain alpha={alpha:.2f} and bias beta={beta}. "
        f"Multiplication scales the dynamic range slope while addition translates intensity."
    )
    return result, explanation

def stretch_contrast(img: np.ndarray, r_min: Optional[int] = None, r_max: Optional[int] = None, auto_percentile: bool = True) -> Tuple[np.ndarray, str]:
    """
    Contrast stretching (Min-Max Normalization):
    s = ((r - r_min) / (r_max - r_min)) * 255
    Module 2: Expands the dynamic range of an image spanning a narrow band to full [0, 255].
    """
    result = img.copy()
    
    if auto_percentile or (r_min is None or r_max is None):
        # Clip top and bottom 1% to prevent single-pixel outlier dominance
        r_min_val = float(np.percentile(img, 1.0))
        r_max_val = float(np.percentile(img, 99.0))
    else:
        r_min_val = float(r_min)
        r_max_val = float(r_max)
        
    if r_max_val <= r_min_val:
        r_max_val = r_min_val + 1.0
        
    diff = r_max_val - r_min_val
    scaled = (np.clip(result.astype(np.float32), r_min_val, r_max_val) - r_min_val) / diff * 255.0
    result = np.clip(scaled, 0, 255).astype(np.uint8)
    
    explanation = (
        f"Contrast stretching linearly mapped input range [{int(r_min_val)}, {int(r_max_val)}] to "
        f"full 8-bit dynamic range [0, 255]. Enhances contrast without non-linear distortion."
    )
    return result, explanation

def apply_gamma(img: np.ndarray, gamma: float) -> Tuple[np.ndarray, str]:
    """
    Power-law (Gamma) transformation: s = c * r^gamma
    Module 2: Standard intensity mapping. 
    Gamma < 1 expands dark tones (curves upward); Gamma > 1 expands light tones (curves downward).
    """
    table = np.array([((i / 255.0) ** gamma) * 255.0 for i in np.arange(0, 256)]).astype(np.uint8)
    result = cv2.LUT(img, table)
    
    effect = "brightened dark regions (shadow expansion)" if gamma < 1.0 else "darkened shadow/midtones (highlight contrast increase)"
    explanation = (
        f"Gamma transformation with exponent gamma={gamma:.2f}. "
        f"Non-linear power-law mapping s = 255 * (r/255)^gamma: {effect}."
    )
    return result, explanation

def equalize_histogram(img: np.ndarray, method: str = "preserve_color") -> Tuple[np.ndarray, str]:
    """
    Histogram Equalization:
    s_k = T(r_k) = (L-1) * sum_{j=0}^k p_r(r_j)
    Transforms intensity distribution to approximate a uniform flat distribution.
    """
    if len(img.shape) == 2:
        result = cv2.equalizeHist(img)
        explanation = (
            "Grayscale histogram equalization applied via Cumulative Distribution Function (CDF). "
            "Linearizes cumulative distribution to maximize global image entropy and contrast."
        )
    elif method == "preserve_color":
        # Convert RGB to YCrCb, equalize luminance Y only, convert back to RGB
        ycrcb = cv2.cvtColor(img, cv2.COLOR_RGB2YCrCb)
        ycrcb[:, :, 0] = cv2.equalizeHist(ycrcb[:, :, 0])
        result = cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2RGB)
        explanation = (
            "Color-preserving histogram equalization in YCrCb color space: only the Y (luminance) "
            "channel was equalized. Preserves chrominance (Cr, Cb) ratios to avoid severe color artifacts."
        )
    else:
        # Convert to Grayscale first then equalize
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        eq_gray = cv2.equalizeHist(gray)
        result = cv2.cvtColor(eq_gray, cv2.COLOR_GRAY2RGB)
        explanation = (
            "Converted to grayscale and equalized cumulative distribution across [0, 255]."
        )
        
    return result, explanation

def convert_to_grayscale(img: np.ndarray, formula: str = "luminance") -> Tuple[np.ndarray, str]:
    """
    Grayscale conversion:
    Module 1 & 2: Color model reduction.
    Luminance: Y = 0.299R + 0.587G + 0.114B (perceptual human sensitivity)
    Average: Y = (R + G + B) / 3
    """
    if len(img.shape) == 2:
        return img.copy(), "Image is already a single-channel grayscale image."
        
    if formula == "average":
        gray = np.mean(img.astype(np.float32), axis=2).astype(np.uint8)
        result = cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)
        explanation = (
            "Grayscale conversion using Unweighted Arithmetic Average: Y = (R + G + B) / 3. "
            "Weights all three RGB spectral bands equally."
        )
    else:
        # Standard ITU-R BT.601 perceptual luminance weights
        gray = (0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2]).astype(np.uint8)
        result = cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)
        explanation = (
            "Grayscale conversion using standard ITU-R BT.601 Perceptual Luminance: "
            "Y = 0.299R + 0.587G + 0.114B, reflecting the human eye's peak spectral sensitivity to green photons."
        )
        
    return result, explanation

def reduce_sampling(img: np.ndarray, factor: int, interpolation: str = "nearest") -> Tuple[np.ndarray, str]:
    """
    Spatial Sampling Demonstration:
    Demonstrates sampling rate Nyquist criterion and spatial resolution loss.
    Downsamples by factor K, then reconstructs for display using chosen interpolation kernel.
    """
    h, w = img.shape[:2]
    new_w = max(1, w // factor)
    new_h = max(1, h // factor)
    
    interp_map = {
        "nearest": cv2.INTER_NEAREST,
        "bilinear": cv2.INTER_LINEAR,
        "bicubic": cv2.INTER_CUBIC,
        "lanczos": cv2.INTER_LANCZOS4,
    }
    cv_interp = interp_map.get(interpolation.lower(), cv2.INTER_NEAREST)
    
    # Downsample using area averaging
    small = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    # Re-scale back to original dimensions for comparison
    result = cv2.resize(small, (w, h), interpolation=cv_interp)
    
    explanation = (
        f"Spatial sampling downscaled by {factor}x (effective grid {new_w}×{new_h} px) "
        f"and reconstructed using {interpolation.capitalize()} interpolation. "
        f"Illustrates spatial aliasing, pixelation, and how interpolation kernels affect boundary reconstruction."
    )
    return result, explanation

def upsample_image(img: np.ndarray, scale: float, interpolation: str = "bicubic") -> Tuple[np.ndarray, str]:
    """
    Spatial Upsampling / Interpolation Demonstration:
    Enlarges the spatial image grid by scale factor S using chosen interpolation kernel.
    """
    h, w = img.shape[:2]
    new_w = int(round(w * scale))
    new_h = int(round(h * scale))
    
    interp_map = {
        "nearest": cv2.INTER_NEAREST,
        "bilinear": cv2.INTER_LINEAR,
        "bicubic": cv2.INTER_CUBIC,
        "lanczos": cv2.INTER_LANCZOS4,
    }
    cv_interp = interp_map.get(interpolation.lower(), cv2.INTER_CUBIC)
    
    result = cv2.resize(img, (new_w, new_h), interpolation=cv_interp)
    
    interp_descriptions = {
        "nearest": "Nearest-Neighbor (0th-order hold): Replicates nearest pixel value without blending; maintains sharp pixel boundaries at the cost of blockiness.",
        "bilinear": "Bilinear (1st-order linear): 2×2 neighbor linear interpolation; produces smooth gradients but slightly softens sharp edges.",
        "bicubic": "Bicubic (3rd-order cubic spline): 4×4 neighbor polynomial interpolation; balances edge sharpness and smooth continuous gradients.",
        "lanczos": "Lanczos-4 (8×8 sinc window): 8×8 sinc-windowed interpolation; delivers high edge acuity and fine detail fidelity with minimal aliasing.",
    }
    desc = interp_descriptions.get(interpolation.lower(), f"{interpolation.capitalize()} interpolation.")
    
    explanation = (
        f"Upsampled image by {scale}x from {w}×{h} to {new_w}×{new_h} px using {interpolation.capitalize()} interpolation. "
        f"{desc}"
    )
    return result, explanation

def reduce_quantization(img: np.ndarray, bits: int) -> Tuple[np.ndarray, str]:
    """
    Intensity Quantization Demonstration:
    Module 1: Demonstrates intensity resolution and false contouring.
    Reduces 8-bit depth (256 levels) to B bits (2^B levels).
    """
    levels = 2 ** bits
    step = 256.0 / levels
    
    # Quantize: floor(val / step) * (255 / (levels - 1))
    quantized = np.floor(img.astype(np.float32) / step) * (255.0 / (levels - 1))
    result = np.clip(quantized, 0, 255).astype(np.uint8)
    
    explanation = (
        f"Intensity quantization reduced from 8-bit (256 levels) to {bits}-bit ({levels} discrete gray levels). "
        f"Demonstrates false contouring (banding artifacts in smooth gradients) caused by coarse quantization."
    )
    return result, explanation
