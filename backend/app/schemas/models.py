from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ChannelStats(BaseModel):
    min: float
    max: float
    mean: float
    std: float

class HistogramData(BaseModel):
    bins: List[int]
    red: Optional[List[int]] = None
    green: Optional[List[int]] = None
    blue: Optional[List[int]] = None
    grayscale: Optional[List[int]] = None

class ImageAnalysisResult(BaseModel):
    image_id: str
    width: int
    height: int
    aspect_ratio: str
    channels: int
    color_mode: str
    format: str
    file_size_bytes: int
    file_size_kb: float
    entropy: float
    channel_stats: Dict[str, ChannelStats]
    histogram: HistogramData

class PixelInspectionResult(BaseModel):
    x: int
    y: int
    rgb: List[int]
    hex: str
    normalized: List[float]
    neighborhood_size: int
    neighborhood: List[List[List[int]]] # [row][col][channel]
    neighborhood_coords: List[List[Dict[str, int]]] # [row][col] -> {x, y}

class ProcessingResponse(BaseModel):
    image_id: str
    processed_image_base64: str
    width: int
    height: int
    color_mode: str
    operation: str
    parameters: Dict[str, Any]
    histogram: Optional[HistogramData] = None
    metrics: Optional[Dict[str, float]] = None
    explanation: Optional[str] = None

class SampleImageInfo(BaseModel):
    id: str
    title: str
    description: str
    category: str
    width: int
    height: int
    data_url: str

# --- Transform Requests ---

class BrightnessRequest(BaseModel):
    image_id: Optional[str] = None
    image_base64: Optional[str] = None
    delta: int = Field(default=0, ge=-255, le=255, description="Brightness offset delta added to pixel values")

class ContrastRequest(BaseModel):
    image_id: Optional[str] = None
    image_base64: Optional[str] = None
    alpha: float = Field(default=1.0, ge=0.1, le=5.0, description="Contrast scaling factor (gain)")
    beta: int = Field(default=0, ge=-255, le=255, description="Brightness bias offset")

class ContrastStretchRequest(BaseModel):
    image_id: Optional[str] = None
    image_base64: Optional[str] = None
    r_min: Optional[int] = Field(default=None, ge=0, le=255)
    r_max: Optional[int] = Field(default=None, ge=0, le=255)
    auto_percentile: bool = Field(default=True, description="Clip extreme 1% tails to enhance stretching")

class GammaRequest(BaseModel):
    image_id: Optional[str] = None
    image_base64: Optional[str] = None
    gamma: float = Field(default=1.0, ge=0.05, le=5.0, description="Gamma value: <1 brightens dark regions, >1 darkens bright regions")

class HistogramEqualizationRequest(BaseModel):
    image_id: Optional[str] = None
    image_base64: Optional[str] = None
    method: str = Field(default="preserve_color", description="preserve_color (YCrCb luminance) or grayscale")

class GrayscaleRequest(BaseModel):
    image_id: Optional[str] = None
    image_base64: Optional[str] = None
    formula: str = Field(default="luminance", description="luminance (0.299R + 0.587G + 0.114B) or average")

class SamplingRequest(BaseModel):
    image_id: Optional[str] = None
    image_base64: Optional[str] = None
    factor: int = Field(default=4, ge=1, le=64, description="Downsampling factor (e.g. 2, 4, 8, 16)")
    interpolation: str = Field(default="nearest", description="Interpolation for reconstruction display: nearest, bilinear, bicubic, lanczos")

class UpsamplingRequest(BaseModel):
    image_id: Optional[str] = None
    image_base64: Optional[str] = None
    scale: float = Field(default=2.0, ge=1.1, le=8.0, description="Upsampling magnification scale (e.g. 1.5, 2.0, 3.0, 4.0)")
    interpolation: str = Field(default="bicubic", description="Interpolation kernel: nearest, bilinear, bicubic, lanczos")

class QuantizationRequest(BaseModel):
    image_id: Optional[str] = None
    image_base64: Optional[str] = None
    bits: int = Field(default=4, ge=1, le=8, description="Number of bits per channel (1 to 8 bits, 2^bits levels)")

# --- Filtering Requests ---

class SmoothingFilterRequest(BaseModel):
    image_id: Optional[str] = None
    image_base64: Optional[str] = None
    filter_type: str = Field(default="gaussian", description="gaussian, box, mean")
    kernel_size: int = Field(default=5, ge=3, le=31, description="Odd kernel size (3, 5, 7, ...)")
    sigma: float = Field(default=1.0, ge=0.1, le=10.0, description="Standard deviation for Gaussian blur")

class SharpeningFilterRequest(BaseModel):
    image_id: Optional[str] = None
    image_base64: Optional[str] = None
    method: str = Field(default="unsharp_mask", description="unsharp_mask or laplacian")
    strength: float = Field(default=1.5, ge=0.1, le=5.0)
    kernel_size: int = Field(default=5, ge=3, le=15)

class ConvolutionRequest(BaseModel):
    image_id: Optional[str] = None
    image_base64: Optional[str] = None
    kernel: List[List[float]] = Field(..., description="2D matrix of kernel coefficients (odd dimensions)")
    operation: str = Field(default="convolution", description="convolution (flipped 180) or correlation")
    padding_mode: str = Field(default="replicate", description="replicate, reflect, or constant")
    normalize: bool = Field(default=False, description="Whether to divide by kernel sum if sum > 0")

class GradientRequest(BaseModel):
    image_id: Optional[str] = None
    image_base64: Optional[str] = None
    operator: str = Field(default="sobel", description="sobel, prewitt, or scharr")
    direction: str = Field(default="magnitude", description="magnitude, x, or y")
    threshold: Optional[int] = Field(default=None, ge=0, le=255, description="Optional binarization threshold")

class LaplacianRequest(BaseModel):
    image_id: Optional[str] = None
    image_base64: Optional[str] = None
    kernel_type: str = Field(default="8_neighbor", description="4_neighbor or 8_neighbor")
    mode: str = Field(default="sharpened", description="raw (zero-centered derivative) or sharpened (f - c*laplacian)")
    strength: float = Field(default=1.0, ge=0.1, le=3.0)

# --- Restoration Requests ---

class NoiseSimulationRequest(BaseModel):
    image_id: Optional[str] = None
    image_base64: Optional[str] = None
    noise_type: str = Field(default="gaussian", description="gaussian, salt_and_pepper, speckle")
    amount: float = Field(default=0.05, ge=0.001, le=0.5, description="Noise density or probability")
    mean: float = Field(default=0.0, ge=-50.0, le=50.0)
    std: float = Field(default=25.0, ge=1.0, le=100.0)

class DenoiseRequest(BaseModel):
    image_id: Optional[str] = None
    image_base64: Optional[str] = None
    filter_type: str = Field(default="median", description="median, arithmetic_mean, gaussian, bilateral")
    kernel_size: int = Field(default=3, ge=3, le=15)
    sigma_color: Optional[float] = Field(default=75.0, ge=10.0, le=200.0)
    sigma_space: Optional[float] = Field(default=75.0, ge=10.0, le=200.0)

class MetricsEvaluationRequest(BaseModel):
    reference_image_id: Optional[str] = None
    reference_image_base64: Optional[str] = None
    target_image_id: Optional[str] = None
    target_image_base64: Optional[str] = None

class MetricsEvaluationResponse(BaseModel):
    mse: float
    psnr: float
    ssim: float
    mae: float
    interpretation: str

# --- Frequency Domain Requests ---

class FFTRequest(BaseModel):
    image_id: Optional[str] = None
    image_base64: Optional[str] = None

class FFTResponse(BaseModel):
    image_id: str
    magnitude_spectrum_base64: str
    phase_spectrum_base64: str
    width: int
    height: int
    explanation: str

class FrequencyFilterRequest(BaseModel):
    image_id: Optional[str] = None
    image_base64: Optional[str] = None
    filter_type: str = Field(default="gaussian_lowpass", description="ideal_lowpass, ideal_highpass, gaussian_lowpass, gaussian_highpass, butterworth_lowpass, butterworth_highpass")
    cutoff_frequency: float = Field(default=30.0, ge=1.0, le=300.0)
    butterworth_order: int = Field(default=2, ge=1, le=10)
