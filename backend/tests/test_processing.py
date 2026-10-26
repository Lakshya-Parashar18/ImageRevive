import pytest
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.utils.image_io import (
    store_image_in_cache,
    get_image_from_cache,
    numpy_to_base64,
    base64_to_numpy,
    compute_histogram,
    calculate_entropy,
    get_preloaded_samples
)
from app.services.analysis_service import analyze_image, inspect_pixel
from app.services.enhancement_service import (
    adjust_brightness,
    adjust_contrast,
    stretch_contrast,
    apply_gamma,
    equalize_histogram,
    convert_to_grayscale,
    reduce_sampling,
    upsample_image,
    reduce_quantization
)
from app.services.filtering_service import (
    apply_smoothing,
    apply_sharpening,
    apply_custom_convolution,
    apply_gradient,
    apply_laplacian
)
from app.services.restoration_service import (
    add_noise,
    apply_restoration,
    evaluate_metrics
)
from app.services.frequency_service import (
    compute_fft2_spectrum,
    apply_frequency_filter
)

client = TestClient(app)

@pytest.fixture
def synthetic_rgb_image():
    # 64x64 synthetic image with gradient and test patch
    img = np.zeros((64, 64, 3), dtype=np.uint8)
    for y in range(64):
        for x in range(64):
            img[y, x] = [x * 4, y * 4, (x + y) * 2]
    img[20:44, 20:44] = [200, 50, 50]
    return img

@pytest.fixture
def synthetic_gray_image():
    img = np.zeros((64, 64), dtype=np.uint8)
    for y in range(64):
        img[y, :] = y * 4
    img[20:44, 20:44] = 220
    return img

def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data

def test_samples_endpoint():
    response = client.get("/api/samples")
    assert response.status_code == 200
    samples = response.json()
    assert len(samples) >= 4
    assert any(s["id"] == "cameraman" for s in samples)

def test_image_analysis(synthetic_rgb_image):
    result = analyze_image(synthetic_rgb_image, "test_id", "PNG", 4096)
    assert result.width == 64
    assert result.height == 64
    assert result.channels == 3
    assert result.color_mode == "RGB"
    assert len(result.histogram.bins) == 256
    assert len(result.histogram.red) == 256
    assert result.entropy > 0

def test_pixel_inspection(synthetic_rgb_image):
    # Center patch at (30, 30) has RGB [200, 50, 50]
    result = inspect_pixel(synthetic_rgb_image, 30, 30, radius=2)
    assert result.x == 30
    assert result.y == 30
    assert result.rgb == [200, 50, 50]
    assert result.hex == "#C83232"
    assert result.neighborhood_size == 5
    assert len(result.neighborhood) == 5
    assert len(result.neighborhood[0]) == 5

def test_brightness_adjustment(synthetic_gray_image):
    original_val = int(synthetic_gray_image[10, 10])
    brightened, exp = adjust_brightness(synthetic_gray_image, 30)
    assert int(brightened[10, 10]) == min(255, original_val + 30)
    
    darkened, _ = adjust_brightness(synthetic_gray_image, -50)
    assert int(darkened[10, 10]) == max(0, original_val - 50)

def test_contrast_stretching():
    # Narrow-band image with values in [80, 120]
    narrow = np.full((32, 32), 100, dtype=np.uint8)
    narrow[0:16, 0:16] = 80
    narrow[16:32, 16:32] = 120
    
    stretched, _ = stretch_contrast(narrow, r_min=80, r_max=120, auto_percentile=False)
    assert np.min(stretched) == 0
    assert np.max(stretched) == 255

def test_gamma_transformation(synthetic_gray_image):
    dark_val = 50
    test_img = np.full((16, 16), dark_val, dtype=np.uint8)
    # Gamma < 1 should brighten dark tones
    gamma_low, _ = apply_gamma(test_img, 0.5)
    assert gamma_low[0, 0] > dark_val
    # Gamma > 1 should darken mid/dark tones
    gamma_high, _ = apply_gamma(test_img, 2.0)
    assert gamma_high[0, 0] < dark_val

def test_histogram_equalization(synthetic_rgb_image, synthetic_gray_image):
    # Grayscale
    eq_gray, _ = equalize_histogram(synthetic_gray_image)
    assert eq_gray.shape == synthetic_gray_image.shape
    
    # Color-preserving YCrCb
    eq_color, _ = equalize_histogram(synthetic_rgb_image, method="preserve_color")
    assert eq_color.shape == synthetic_rgb_image.shape

def test_grayscale_conversion(synthetic_rgb_image):
    gray_lum, _ = convert_to_grayscale(synthetic_rgb_image, formula="luminance")
    assert gray_lum.shape == synthetic_rgb_image.shape  # Returned as 3-channel for frontend display
    # Check that channels are identical (monochrome)
    assert np.array_equal(gray_lum[:, :, 0], gray_lum[:, :, 1])
    assert np.array_equal(gray_lum[:, :, 1], gray_lum[:, :, 2])

def test_sampling_and_quantization(synthetic_rgb_image):
    # Downsampling with different reconstruction kernels
    down_nearest, _ = reduce_sampling(synthetic_rgb_image, factor=4, interpolation="nearest")
    assert down_nearest.shape == synthetic_rgb_image.shape
    
    down_bicubic, _ = reduce_sampling(synthetic_rgb_image, factor=4, interpolation="bicubic")
    assert down_bicubic.shape == synthetic_rgb_image.shape
    
    # Upsampling by 2x
    upsampled_bicubic, _ = upsample_image(synthetic_rgb_image, scale=2.0, interpolation="bicubic")
    h, w = synthetic_rgb_image.shape[:2]
    assert upsampled_bicubic.shape == (h * 2, w * 2, 3)
    
    upsampled_lanczos, _ = upsample_image(synthetic_rgb_image, scale=1.5, interpolation="lanczos")
    assert upsampled_lanczos.shape == (int(round(h * 1.5)), int(round(w * 1.5)), 3)
    
    # Quantization to 2 bits (4 levels)
    quantized, _ = reduce_quantization(synthetic_rgb_image, bits=2)
    unique_levels = np.unique(quantized)
    assert len(unique_levels) <= 4

def test_smoothing_filters(synthetic_rgb_image):
    blurred_gauss, _ = apply_smoothing(synthetic_rgb_image, "gaussian", kernel_size=5, sigma=1.2)
    assert blurred_gauss.shape == synthetic_rgb_image.shape
    blurred_mean, _ = apply_smoothing(synthetic_rgb_image, "mean", kernel_size=5)
    assert blurred_mean.shape == synthetic_rgb_image.shape

def test_sharpening_filters(synthetic_rgb_image):
    sharp_unsharp, _ = apply_sharpening(synthetic_rgb_image, "unsharp_mask", strength=1.5)
    assert sharp_unsharp.shape == synthetic_rgb_image.shape
    sharp_lap, _ = apply_sharpening(synthetic_rgb_image, "laplacian", strength=1.0)
    assert sharp_lap.shape == synthetic_rgb_image.shape

def test_custom_convolution(synthetic_rgb_image):
    # Horizontal edge detector kernel
    kernel = [
        [-1.0, -1.0, -1.0],
        [ 0.0,  0.0,  0.0],
        [ 1.0,  1.0,  1.0]
    ]
    conv_res, _ = apply_custom_convolution(synthetic_rgb_image, kernel, "convolution", "replicate")
    assert conv_res.shape == synthetic_rgb_image.shape
    
    corr_res, _ = apply_custom_convolution(synthetic_rgb_image, kernel, "correlation", "replicate")
    assert corr_res.shape == synthetic_rgb_image.shape

def test_gradient_and_laplacian(synthetic_rgb_image):
    sobel_res, _ = apply_gradient(synthetic_rgb_image, "sobel", "magnitude")
    assert sobel_res.shape == synthetic_rgb_image.shape
    
    lap_raw, _ = apply_laplacian(synthetic_rgb_image, "8_neighbor", "raw")
    assert lap_raw.shape == synthetic_rgb_image.shape

def test_noise_and_restoration(synthetic_rgb_image):
    # Add salt and pepper noise
    noisy, _ = add_noise(synthetic_rgb_image, "salt_and_pepper", amount=0.1)
    assert noisy.shape == synthetic_rgb_image.shape
    
    # Restore with median filter
    restored, _ = apply_restoration(noisy, "median", kernel_size=3)
    assert restored.shape == synthetic_rgb_image.shape
    
    # Compare metrics: restored should have lower MSE than noisy
    metrics_noisy = evaluate_metrics(synthetic_rgb_image, noisy)
    metrics_restored = evaluate_metrics(synthetic_rgb_image, restored)
    assert metrics_restored["mse"] < metrics_noisy["mse"]
    assert metrics_restored["psnr"] > metrics_noisy["psnr"]

def test_frequency_domain_processing(synthetic_rgb_image):
    mag, phase, _ = compute_fft2_spectrum(synthetic_rgb_image)
    assert mag.shape == synthetic_rgb_image.shape
    assert phase.shape == synthetic_rgb_image.shape
    
    filtered, _ = apply_frequency_filter(synthetic_rgb_image, "gaussian_lowpass", cutoff=20.0)
    assert filtered.shape == synthetic_rgb_image.shape
