from typing import Tuple
import numpy as np
import cv2

def compute_fft2_spectrum(img: np.ndarray) -> Tuple[np.ndarray, np.ndarray, str]:
    """
    2D Discrete Fourier Transform (Module 3):
    F(u, v) = sum_{x} sum_{y} f(x, y) exp(-j 2*pi * (ux/M + vy/N))
    Returns:
    - Log magnitude spectrum centered at DC: S(u,v) = c * log(1 + |F(u,v)|)
    - Phase angle spectrum: theta(u,v) = arctan2(Im, Re) in [0, 255]
    """
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    else:
        gray = img.copy()
        
    h, w = gray.shape
    f_transform = np.fft.fft2(gray.astype(np.float64))
    f_shift = np.fft.fftshift(f_transform)
    
    # 1. Log Magnitude Spectrum
    magnitude = np.abs(f_shift)
    log_magnitude = np.log1p(magnitude)
    max_log = np.max(log_magnitude)
    if max_log > 0:
        mag_display = (log_magnitude / max_log * 255.0).astype(np.uint8)
    else:
        mag_display = np.zeros_like(gray, dtype=np.uint8)
        
    # 2. Phase Spectrum
    phase = np.angle(f_shift)  # [-pi, pi]
    phase_display = ((phase + np.pi) / (2.0 * np.pi) * 255.0).astype(np.uint8)
    
    mag_rgb = cv2.cvtColor(mag_display, cv2.COLOR_GRAY2RGB)
    phase_rgb = cv2.cvtColor(phase_display, cv2.COLOR_GRAY2RGB)
    
    explanation = (
        "2D Fast Fourier Transform (FFT) centered at DC frequency (0,0). "
        "The centered log-magnitude spectrum visualizes energy distribution: low frequencies reside at the center, "
        "and directional high-frequency spikes perpendicular to spatial edge boundaries radiate outwards. "
        "The phase spectrum encodes structural spatial geometry."
    )
    return mag_rgb, phase_rgb, explanation

def apply_frequency_filter(
    img: np.ndarray,
    filter_type: str = "gaussian_lowpass",
    cutoff: float = 40.0,
    order: int = 2
) -> Tuple[np.ndarray, str]:
    """
    Frequency Domain Filtering:
    G(u, v) = H(u, v) * F(u, v)
    g(x, y) = Real(IFFT(G(u, v)))
    """
    if len(img.shape) == 3:
        # Filter each channel separately or luminance
        channels = []
        for c in range(3):
            ch, exp = _filter_channel_freq(img[:, :, c], filter_type, cutoff, order)
            channels.append(ch)
        result = np.stack(channels, axis=2)
    else:
        result, exp = _filter_channel_freq(img, filter_type, cutoff, order)
        result = cv2.cvtColor(result, cv2.COLOR_GRAY2RGB)
        
    return result, exp

def _filter_channel_freq(channel: np.ndarray, filter_type: str, cutoff: float, order: int) -> Tuple[np.ndarray, str]:
    h, w = channel.shape
    f_transform = np.fft.fft2(channel.astype(np.float64))
    f_shift = np.fft.fftshift(f_transform)
    
    cy, cx = h / 2.0, w / 2.0
    u = np.arange(h)
    v = np.arange(w)
    V, U = np.meshgrid(v, u)
    D = np.sqrt((U - cy)**2 + (V - cx)**2)
    D0 = max(1.0, float(cutoff))
    
    if filter_type == "ideal_lowpass":
        H = (D <= D0).astype(np.float64)
        desc = f"Ideal Lowpass Filter (D0={cutoff:.1f}). Sharp frequency cutoff induces ringing (Gibbs phenomenon)."
    elif filter_type == "ideal_highpass":
        H = (D > D0).astype(np.float64)
        desc = f"Ideal Highpass Filter (D0={cutoff:.1f}). Retains only frequencies above cutoff."
    elif filter_type == "gaussian_lowpass":
        H = np.exp(-(D**2) / (2.0 * (D0**2)))
        desc = f"Gaussian Lowpass Filter (D0={cutoff:.1f}). Smooth frequency attenuation completely eliminates ringing artifacts."
    elif filter_type == "gaussian_highpass":
        H = 1.0 - np.exp(-(D**2) / (2.0 * (D0**2)))
        desc = f"Gaussian Highpass Filter (D0={cutoff:.1f}). Zero DC transmission with smooth transition."
    elif filter_type == "butterworth_lowpass":
        H = 1.0 / (1.0 + (D / D0) ** (2 * order))
        desc = f"Butterworth Lowpass Filter (order n={order}, D0={cutoff:.1f}). Controlled rolloff without severe ringing."
    elif filter_type == "butterworth_highpass":
        # Avoid division by zero
        D_safe = np.where(D == 0, 1e-6, D)
        H = 1.0 / (1.0 + (D0 / D_safe) ** (2 * order))
        desc = f"Butterworth Highpass Filter (order n={order}, D0={cutoff:.1f})."
    else:
        H = np.ones((h, w), dtype=np.float64)
        desc = "Pass-all filter"
        
    G_shift = f_shift * H
    G = np.fft.ifftshift(G_shift)
    spatial_filtered = np.fft.ifft2(G)
    real_img = np.real(spatial_filtered)
    clipped = np.clip(real_img, 0, 255).astype(np.uint8)
    
    return clipped, desc
