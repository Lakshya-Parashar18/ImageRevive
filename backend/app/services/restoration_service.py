from typing import Tuple, Dict
import numpy as np
import cv2

def add_noise(
    img: np.ndarray,
    noise_type: str = "gaussian",
    amount: float = 0.05,
    mean: float = 0.0,
    std: float = 25.0
) -> Tuple[np.ndarray, str]:
    """
    Simulated Image Degradation (Noise Models):
    Module 4: Mathematical modeling of degradation processes.
    - Gaussian: additive electronic / sensor thermal noise.
    - Salt & Pepper: bipolar impulse noise from faulty bit transmission / dead sensor elements.
    - Speckle: multiplicative coherent scattering noise (e.g. ultrasound, radar).
    """
    h, w = img.shape[:2]
    noisy = img.astype(np.float32).copy()
    
    if noise_type.lower() == "gaussian":
        gauss = np.random.normal(mean, std, img.shape).astype(np.float32)
        noisy = np.clip(noisy + gauss, 0, 255).astype(np.uint8)
        explanation = (
            f"Simulated Gaussian Noise (mu={mean:.1f}, sigma={std:.1f}). "
            f"Modeled as additive independent zero-mean Gaussian random variable at each spatial coordinate."
        )
    elif noise_type.lower() in ("salt_and_pepper", "salt_pepper", "impulse"):
        # Bipolar impulse noise
        num_noisy = int(amount * h * w)
        # Salt (255)
        num_salt = num_noisy // 2
        salt_y = np.random.randint(0, h, num_salt)
        salt_x = np.random.randint(0, w, num_salt)
        noisy[salt_y, salt_x] = 255
        
        # Pepper (0)
        num_pepper = num_noisy - num_salt
        pep_y = np.random.randint(0, h, num_pepper)
        pep_x = np.random.randint(0, w, num_pepper)
        noisy[pep_y, pep_x] = 0
        
        noisy = noisy.astype(np.uint8)
        explanation = (
            f"Simulated Salt-and-Pepper (Bipolar Impulse) Noise with corruption probability p={amount:.3f}. "
            f"Corrupted pixels are randomly replaced by extreme values: maximum (salt=255) or minimum (pepper=0)."
        )
    elif noise_type.lower() == "speckle":
        # Multiplicative noise: g = f + f * n
        noise = np.random.normal(0, std / 100.0, img.shape).astype(np.float32)
        noisy = np.clip(noisy + noisy * noise, 0, 255).astype(np.uint8)
        explanation = (
            f"Simulated Speckle (Multiplicative) Noise with variance {(std/100.0)**2:.3f}. "
            f"Modeled as g(x,y) = f(x,y) + f(x,y)*n(x,y), characteristic of coherent imaging (SAR, ultrasound)."
        )
    else:
        noisy = img.copy()
        explanation = "Unknown noise model; returned original image."
        
    return noisy, explanation

def apply_restoration(
    img: np.ndarray,
    filter_type: str = "median",
    kernel_size: int = 3,
    sigma_color: float = 75.0,
    sigma_space: float = 75.0
) -> Tuple[np.ndarray, str]:
    """
    Noise Restoration Filters:
    Module 4: Spatial domain filtering for noise removal.
    - Median: Non-linear order statistics filter.
    - Arithmetic Mean: Standard box averaging.
    - Gaussian: Linear spatial lowpass filter.
    - Bilateral: Edge-preserving non-linear spatial and range filter.
    """
    if kernel_size % 2 == 0:
        kernel_size += 1
        
    if filter_type.lower() == "median":
        result = cv2.medianBlur(img, kernel_size)
        explanation = (
            f"Median Filter ({kernel_size}x{kernel_size}). Non-linear order-statistics filter that replaces each "
            f"pixel with the median value of its neighborhood. Completely removes salt & pepper impulse spikes "
            f"without blurring sharp step edges (since isolated extreme values never equal the median)."
        )
    elif filter_type.lower() in ("arithmetic_mean", "mean", "box"):
        result = cv2.blur(img, (kernel_size, kernel_size))
        explanation = (
            f"Arithmetic Mean Filter ({kernel_size}x{kernel_size}). Computes local average. "
            f"Optimal minimum variance estimator for zero-mean additive Gaussian noise, but blurs sharp boundaries "
            f"and spreads isolated impulse spikes into visible gray smudges."
        )
    elif filter_type.lower() == "gaussian":
        result = cv2.GaussianBlur(img, (kernel_size, kernel_size), sigmaX=1.5, sigmaY=1.5)
        explanation = (
            f"Gaussian Filter ({kernel_size}x{kernel_size}, sigma=1.5). Weight decays radially with distance. "
            f"Provides smoother lowpass attenuation than arithmetic mean."
        )
    elif filter_type.lower() == "bilateral":
        result = cv2.bilateralFilter(img, d=kernel_size, sigmaColor=sigma_color, sigmaSpace=sigma_space)
        explanation = (
            f"Bilateral Filter (d={kernel_size}, sigmaColor={sigma_color:.1f}, sigmaSpace={sigma_space:.1f}). "
            f"Dual-kernel filter considering both geometric closeness and photometric similarity. "
            f"Smooths noise in uniform regions while refusing to cross high-gradient edge boundaries."
        )
    else:
        result = cv2.medianBlur(img, 3)
        explanation = "Default median filter applied."
        
    return result, explanation

def evaluate_metrics(clean_img: np.ndarray, test_img: np.ndarray) -> Dict[str, float]:
    """
    Quantitative Image Quality Evaluation:
    Module 4: Objective fidelity criteria comparing restored output with original ground truth.
    - MSE: Mean Squared Error
    - PSNR: Peak Signal-to-Noise Ratio (dB)
    - SSIM: Structural Similarity Index
    - MAE: Mean Absolute Error
    """
    # Resize test_img to match clean_img if dimensions differ
    if clean_img.shape != test_img.shape:
        test_img = cv2.resize(test_img, (clean_img.shape[1], clean_img.shape[0]))
        
    clean = clean_img.astype(np.float64)
    test = test_img.astype(np.float64)
    
    # 1. MSE
    mse = float(np.mean((clean - test) ** 2))
    
    # 2. PSNR
    if mse == 0:
        psnr = 100.0  # Perfect identical image
    else:
        psnr = float(10.0 * np.log10((255.0 ** 2) / mse))
        
    # 3. MAE
    mae = float(np.mean(np.abs(clean - test)))
    
    # 4. SSIM (approximate multi-scale / windowed calculation)
    # Convert to grayscale luminance for standard SSIM
    if len(clean_img.shape) == 3:
        c_gray = cv2.cvtColor(clean_img, cv2.COLOR_RGB2GRAY).astype(np.float64)
        t_gray = cv2.cvtColor(test_img, cv2.COLOR_RGB2GRAY).astype(np.float64)
    else:
        c_gray = clean
        t_gray = test
        
    c1 = (0.01 * 255) ** 2
    c2 = (0.03 * 255) ** 2
    
    mu1 = cv2.GaussianBlur(c_gray, (11, 11), 1.5)
    mu2 = cv2.GaussianBlur(t_gray, (11, 11), 1.5)
    
    mu1_sq = mu1 ** 2
    mu2_sq = mu2 ** 2
    mu1_mu2 = mu1 * mu2
    
    sigma1_sq = cv2.GaussianBlur(c_gray ** 2, (11, 11), 1.5) - mu1_sq
    sigma2_sq = cv2.GaussianBlur(t_gray ** 2, (11, 11), 1.5) - mu2_sq
    sigma12 = cv2.GaussianBlur(c_gray * t_gray, (11, 11), 1.5) - mu1_mu2
    
    ssim_map = ((2 * mu1_mu2 + c1) * (2 * sigma12 + c2)) / ((mu1_sq + mu2_sq + c1) * (sigma1_sq + sigma2_sq + c2))
    ssim = float(np.clip(np.mean(ssim_map), 0.0, 1.0))
    
    return {
        "mse": round(mse, 3),
        "psnr": round(psnr, 2),
        "ssim": round(ssim, 4),
        "mae": round(mae, 3)
    }

def get_metrics_interpretation(metrics: Dict[str, float]) -> str:
    psnr = metrics.get("psnr", 0)
    ssim = metrics.get("ssim", 0)
    if psnr >= 35 and ssim >= 0.95:
        return "Excellent fidelity: Imperceptible distortion relative to the ground truth."
    elif psnr >= 28 and ssim >= 0.85:
        return "Good restoration: Minor residual artifacts; structural edges and textures largely preserved."
    elif psnr >= 22 and ssim >= 0.70:
        return "Moderate restoration: Discernible noise or slight blurring of fine features."
    else:
        return "Low fidelity: Significant deviation from the ground truth due to severe degradation or aggressive filtering."
