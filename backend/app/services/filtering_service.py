from typing import Tuple, List, Optional
import numpy as np
import cv2

def apply_smoothing(img: np.ndarray, filter_type: str = "gaussian", kernel_size: int = 5, sigma: float = 1.0) -> Tuple[np.ndarray, str]:
    """
    Spatial Domain Smoothing (Lowpass Filtering):
    Module 2: Attenuates high-frequency spatial components (noise, sharp edges) by local neighborhood averaging.
    """
    if kernel_size % 2 == 0:
        kernel_size += 1
        
    if filter_type.lower() == "gaussian":
        result = cv2.GaussianBlur(img, (kernel_size, kernel_size), sigmaX=sigma, sigmaY=sigma)
        explanation = (
            f"Gaussian Smoothing ({kernel_size}x{kernel_size}, sigma={sigma:.2f}). Weights pixels using a 2D "
            f"Gaussian distribution G(x, y) = (1/(2*pi*sigma^2)) * exp(-(x^2+y^2)/(2*sigma^2)). Preserves edges better than box filter."
        )
    elif filter_type.lower() in ("mean", "box"):
        result = cv2.blur(img, (kernel_size, kernel_size))
        explanation = (
            f"Box / Arithmetic Mean Smoothing ({kernel_size}x{kernel_size}). Each output pixel is the equal-weighted "
            f"average of its {kernel_size * kernel_size} neighbors (kernel coefficients = 1/{kernel_size * kernel_size})."
        )
    else:
        result = cv2.medianBlur(img, kernel_size)
        explanation = f"Median Smoothing ({kernel_size}x{kernel_size}). Non-linear order-statistics filter."
        
    return result, explanation

def apply_sharpening(img: np.ndarray, method: str = "unsharp_mask", strength: float = 1.5, kernel_size: int = 5) -> Tuple[np.ndarray, str]:
    """
    Spatial Domain Sharpening (Highpass / High-boost):
    Module 2: Enhances edges and fine details by adding high-frequency spatial derivatives back to the original image.
    """
    if kernel_size % 2 == 0:
        kernel_size += 1
        
    if method == "unsharp_mask":
        # 1. Blur the original
        blurred = cv2.GaussianBlur(img, (kernel_size, kernel_size), 1.5)
        # 2. Subtract to get unsharp mask
        mask = img.astype(np.float32) - blurred.astype(np.float32)
        # 3. Add weighted mask back
        sharpened = img.astype(np.float32) + strength * mask
        result = np.clip(sharpened, 0, 255).astype(np.uint8)
        explanation = (
            f"Unsharp Masking (kernel={kernel_size}x{kernel_size}, weight k={strength:.2f}). "
            f"f_sharp = f + k * (f - f_blur). The mask isolates high-frequency transitions, which are scaled and added back."
        )
    else:
        # Laplacian sharpening: f_sharp = f - c * Laplacian
        kernel = np.array([
            [0, -1, 0],
            [-1, 4 + strength, -1],
            [0, -1, 0]
        ], dtype=np.float32)
        result = np.clip(cv2.filter2D(img.astype(np.float32), -1, kernel), 0, 255).astype(np.uint8)
        explanation = (
            f"Laplacian Sharpening (strength={strength:.2f}). Uses the isotropic second-order spatial derivative "
            f"del^2(f) to accentuate intensity discontinuities."
        )
        
    return result, explanation

def apply_custom_convolution(
    img: np.ndarray,
    kernel_matrix: List[List[float]],
    operation: str = "convolution",
    padding_mode: str = "replicate",
    normalize: bool = False
) -> Tuple[np.ndarray, str]:
    """
    Custom 2D Convolution vs Correlation:
    Module 2: Fundamental spatial filtering operation.
    In convolution, the kernel is flipped 180 degrees (both horizontally and vertically) prior to neighborhood multiplication.
    In correlation, the kernel is applied without flipping.
    """
    kernel = np.array(kernel_matrix, dtype=np.float32)
    rows, cols = kernel.shape
    if rows % 2 == 0 or cols % 2 == 0:
        raise ValueError(f"Kernel dimensions must be odd numbers (got {rows}x{cols}).")
        
    if normalize:
        k_sum = np.sum(kernel)
        if abs(k_sum) > 1e-6:
            kernel = kernel / k_sum
            
    # Convolution flips kernel 180 degrees
    flipped = False
    if operation.lower() == "convolution":
        kernel = np.flipud(np.fliplr(kernel))
        flipped = True
        
    border_type = cv2.BORDER_REPLICATE
    if padding_mode == "reflect":
        border_type = cv2.BORDER_REFLECT
    elif padding_mode == "constant":
        border_type = cv2.BORDER_CONSTANT
        
    filtered = cv2.filter2D(img.astype(np.float32), -1, kernel, borderType=border_type)
    result = np.clip(filtered, 0, 255).astype(np.uint8)
    
    op_name = "2D Spatial Convolution (kernel flipped 180°)" if flipped else "2D Spatial Correlation (unflipped kernel)"
    explanation = (
        f"{op_name} with {rows}x{cols} matrix. Padding strategy: '{padding_mode}'. "
        f"Each output pixel g(x,y) = sum_(s,t) w(s,t)*f(x+s, y+t)."
    )
    return result, explanation

def apply_gradient(
    img: np.ndarray,
    operator: str = "sobel",
    direction: str = "magnitude",
    threshold: Optional[int] = None
) -> Tuple[np.ndarray, str]:
    """
    First-Order Derivative / Gradient Filters:
    Module 2 & Module 6: Sobel, Prewitt, Scharr edge detection.
    Gradient vector points in the direction of maximum intensity increase:
    Magnitude = sqrt(Gx^2 + Gy^2), Angle = arctan(Gy / Gx).
    """
    # Convert to grayscale for gradient calculation
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    else:
        gray = img.copy()
        
    if operator.lower() == "sobel":
        gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        op_label = "Sobel (3x3 first-order derivative)"
    elif operator.lower() == "scharr":
        gx = cv2.Scharr(gray, cv2.CV_32F, 1, 0)
        gy = cv2.Scharr(gray, cv2.CV_32F, 0, 1)
        op_label = "Scharr (high-frequency angular accuracy)"
    else:
        # Prewitt kernels
        prewitt_x = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], dtype=np.float32)
        prewitt_y = np.array([[-1, -1, -1], [0, 0, 0], [1, 1, 1]], dtype=np.float32)
        gx = cv2.filter2D(gray.astype(np.float32), cv2.CV_32F, prewitt_x)
        gy = cv2.filter2D(gray.astype(np.float32), cv2.CV_32F, prewitt_y)
        op_label = "Prewitt (unweighted difference operator)"
        
    if direction == "x":
        grad = np.abs(gx)
        desc = "Horizontal rate of change (vertical edge detector)"
    elif direction == "y":
        grad = np.abs(gy)
        desc = "Vertical rate of change (horizontal edge detector)"
    else:
        grad = np.sqrt(gx**2 + gy**2)
        desc = "Total gradient magnitude sqrt(Gx^2 + Gy^2)"
        
    # Scale to 0-255
    max_val = np.max(grad)
    if max_val > 0:
        grad_norm = (grad / max_val * 255.0).astype(np.uint8)
    else:
        grad_norm = grad.astype(np.uint8)
        
    if threshold is not None:
        _, grad_norm = cv2.threshold(grad_norm, threshold, 255, cv2.THRESH_BINARY)
        desc += f" with binarization threshold at T={threshold}"
        
    result_rgb = cv2.cvtColor(grad_norm, cv2.COLOR_GRAY2RGB)
    explanation = f"{op_label} computing {desc}. Highlights boundaries with high intensity derivatives."
    return result_rgb, explanation

def apply_laplacian(
    img: np.ndarray,
    kernel_type: str = "8_neighbor",
    mode: str = "sharpened",
    strength: float = 1.0
) -> Tuple[np.ndarray, str]:
    """
    Second-Order Derivative / Laplacian Filter:
    Module 2: Isotropic 2nd derivative operator del^2(f) = d^2f/dx^2 + d^2f/dy^2.
    Raw mode: zero-crossing centered around 128 (gray).
    Sharpened mode: f(x, y) - c * del^2(f).
    """
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    else:
        gray = img.copy()
        
    # Define discrete Laplacian kernels
    if kernel_type == "4_neighbor":
        # 4-neighbor cross
        k = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float32)
    else:
        # 8-neighbor isotropic (including diagonals)
        k = np.array([[1, 1, 1], [1, -8, 1], [1, 1, 1]], dtype=np.float32)
        
    lap = cv2.filter2D(gray.astype(np.float32), cv2.CV_32F, k)
    
    if mode == "raw":
        # Center at 128 so negative second derivatives are <128 and positive are >128
        scaled_lap = np.clip(128.0 + lap * strength * 0.5, 0, 255).astype(np.uint8)
        result = cv2.cvtColor(scaled_lap, cv2.COLOR_GRAY2RGB)
        explanation = (
            f"Raw Laplacian response ({kernel_type}) centered at baseline 128. "
            f"Zero-crossings (transitions across 128) pinpoint true edge locations. "
            f"Positive values represent dark-to-light concavity, negative values represent light-to-dark."
        )
    else:
        # Sharpening: f(x, y) - c * laplacian (since center coefficient is negative)
        if len(img.shape) == 3:
            # Apply to each channel
            sharpened_channels = []
            for c in range(3):
                lap_c = cv2.filter2D(img[:, :, c].astype(np.float32), cv2.CV_32F, k)
                ch = img[:, :, c].astype(np.float32) - strength * lap_c
                sharpened_channels.append(np.clip(ch, 0, 255).astype(np.uint8))
            result = np.stack(sharpened_channels, axis=2)
        else:
            sharpened = gray.astype(np.float32) - strength * lap
            result = np.clip(sharpened, 0, 255).astype(np.uint8)
            result = cv2.cvtColor(result, cv2.COLOR_GRAY2RGB)
            
        explanation = (
            f"Laplacian Edge Sharpening ({kernel_type}, strength={strength:.2f}). "
            f"Composite result subtracting the second derivative: f_enhanced = f - c * del^2(f)."
        )
        
    return result, explanation
