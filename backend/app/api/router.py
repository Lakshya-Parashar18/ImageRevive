import time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
import numpy as np
from PIL import Image
import io

from app.schemas.models import (
    ImageAnalysisResult,
    PixelInspectionResult,
    ProcessingResponse,
    SampleImageInfo,
    BrightnessRequest,
    ContrastRequest,
    ContrastStretchRequest,
    GammaRequest,
    HistogramEqualizationRequest,
    GrayscaleRequest,
    SamplingRequest,
    UpsamplingRequest,
    QuantizationRequest,
    SmoothingFilterRequest,
    SharpeningFilterRequest,
    ConvolutionRequest,
    GradientRequest,
    LaplacianRequest,
    NoiseSimulationRequest,
    DenoiseRequest,
    MetricsEvaluationRequest,
    MetricsEvaluationResponse,
    FFTRequest,
    FFTResponse,
    FrequencyFilterRequest
)
from app.utils.image_io import (
    store_image_in_cache,
    get_image_from_cache,
    numpy_to_base64,
    base64_to_numpy,
    compute_histogram,
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
    evaluate_metrics,
    get_metrics_interpretation
)
from app.services.frequency_service import (
    compute_fft2_spectrum,
    apply_frequency_filter
)

router = APIRouter()
START_TIME = time.time()

def resolve_image(image_id: Optional[str], image_base64: Optional[str]) -> tuple[np.ndarray, str]:
    if image_id:
        img = get_image_from_cache(image_id)
        if img is not None:
            return img, image_id
            
        # Also check preloaded samples
        samples = get_preloaded_samples()
        if image_id in samples:
            img_arr, _ = samples[image_id]
            store_image_in_cache(img_arr, filename=f"{image_id}.png", custom_id=image_id)
            return img_arr, image_id
            
    if image_base64:
        try:
            img, _ = base64_to_numpy(image_base64)
            new_id = store_image_in_cache(img)
            return img, new_id
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to decode image data: {str(e)}")
            
    raise HTTPException(status_code=400, detail="Missing image: provide either a valid 'image_id' or 'image_base64'.")

def build_response(processed_img: np.ndarray, operation: str, parameters: Dict[str, Any], explanation: str) -> ProcessingResponse:
    new_id = store_image_in_cache(processed_img)
    base64_url = numpy_to_base64(processed_img)
    histogram = compute_histogram(processed_img)
    h, w = processed_img.shape[:2]
    channels = 1 if len(processed_img.shape) == 2 else processed_img.shape[2]
    mode = "Grayscale" if channels == 1 else "RGB"
    
    return ProcessingResponse(
        image_id=new_id,
        processed_image_base64=base64_url,
        width=w,
        height=h,
        color_mode=mode,
        operation=operation,
        parameters=parameters,
        histogram=histogram,
        explanation=explanation
    )

# --- System Health & Samples ---

@router.get("/health", summary="System Health Check")
def health_check():
    return {
        "status": "healthy",
        "app_name": "ImageRevive DIP Studio",
        "version": "1.0.0",
        "uptime_seconds": round(time.time() - START_TIME, 1),
        "opencv_version": "5.0.0",
        "modules_aligned": ["Module 1", "Module 2", "Module 3", "Module 4", "Module 6"]
    }

@router.get("/samples", response_model=List[SampleImageInfo], summary="Get preloaded academic benchmark images")
def get_samples():
    samples = get_preloaded_samples()
    result = []
    for s_id, (img_arr, meta) in samples.items():
        data_url = numpy_to_base64(img_arr)
        # Store in cache so user can reference by id immediately
        store_image_in_cache(img_arr, filename=f"{s_id}.png", custom_id=s_id)
        result.append(SampleImageInfo(
            id=s_id,
            title=meta["title"],
            description=meta["description"],
            category=meta["category"],
            width=meta["width"],
            height=meta["height"],
            data_url=data_url
        ))
    return result

@router.get("/samples/{sample_id}", response_model=SampleImageInfo, summary="Get a specific sample image")
def get_sample_by_id(sample_id: str):
    samples = get_preloaded_samples()
    if sample_id not in samples:
        raise HTTPException(status_code=404, detail=f"Sample '{sample_id}' not found.")
    img_arr, meta = samples[sample_id]
    data_url = numpy_to_base64(img_arr)
    return SampleImageInfo(
        id=sample_id,
        title=meta["title"],
        description=meta["description"],
        category=meta["category"],
        width=meta["width"],
        height=meta["height"],
        data_url=data_url
    )

# --- Image Upload & Analysis ---

@router.post("/upload", summary="Upload an image file (JPEG, PNG, WebP)")
async def upload_image(file: UploadFile = File(...)):
    # Validate content type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{file.content_type}'. Please upload JPEG, PNG, or WebP images."
        )
        
    contents = await file.read()
    if len(contents) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds the 15 MB limit.")
        
    try:
        pil_img = Image.open(io.BytesIO(contents))
        if pil_img.width > 4096 or pil_img.height > 4096:
            raise HTTPException(status_code=400, detail="Image dimensions exceed maximum 4096x4096px.")
            
        if pil_img.mode == 'RGBA':
            background = Image.new("RGB", pil_img.size, (255, 255, 255))
            background.paste(pil_img, mask=pil_img.split()[3])
            np_arr = np.array(background)
        elif pil_img.mode == 'L':
            np_arr = np.array(pil_img)
        else:
            np_arr = np.array(pil_img.convert('RGB'))
            
        image_id = store_image_in_cache(np_arr, filename=file.filename or "uploaded.png", content_type=file.content_type)
        data_url = numpy_to_base64(np_arr)
        analysis = analyze_image(np_arr, image_id, pil_img.format or "PNG", len(contents))
        
        return {
            "image_id": image_id,
            "filename": file.filename,
            "data_url": data_url,
            "analysis": analysis
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid or corrupted image file: {str(e)}")

@router.post("/analyze", response_model=ImageAnalysisResult, summary="Analyze image properties and compute histograms")
def analyze_endpoint(payload: Dict[str, Any]):
    image_id = payload.get("image_id")
    image_base64 = payload.get("image_base64")
    img, active_id = resolve_image(image_id, image_base64)
    return analyze_image(img, active_id)

@router.get("/inspect/pixel", response_model=PixelInspectionResult, summary="Inspect pixel values and neighborhood loupe")
def inspect_pixel_endpoint(
    image_id: Optional[str] = Query(None),
    x: int = Query(..., ge=0),
    y: int = Query(..., ge=0),
    radius: int = Query(2, ge=1, le=5)
):
    if not image_id:
        raise HTTPException(status_code=400, detail="Parameter 'image_id' is required.")
    img = get_image_from_cache(image_id)
    if img is None:
        raise HTTPException(status_code=404, detail="Image not found in session cache.")
    return inspect_pixel(img, x, y, radius)

# --- Module 2: Spatial Domain Point Transformations ---

@router.post("/transform/brightness", response_model=ProcessingResponse)
def brightness_endpoint(req: BrightnessRequest):
    img, _ = resolve_image(req.image_id, req.image_base64)
    processed, exp = adjust_brightness(img, req.delta)
    return build_response(processed, "Brightness Adjustment", {"delta": req.delta}, exp)

@router.post("/transform/contrast", response_model=ProcessingResponse)
def contrast_endpoint(req: ContrastRequest):
    img, _ = resolve_image(req.image_id, req.image_base64)
    processed, exp = adjust_contrast(img, req.alpha, req.beta)
    return build_response(processed, "Contrast & Bias Scaling", {"alpha": req.alpha, "beta": req.beta}, exp)

@router.post("/transform/contrast-stretch", response_model=ProcessingResponse)
def contrast_stretch_endpoint(req: ContrastStretchRequest):
    img, _ = resolve_image(req.image_id, req.image_base64)
    processed, exp = stretch_contrast(img, req.r_min, req.r_max, req.auto_percentile)
    return build_response(
        processed,
        "Contrast Stretching (Min-Max Normalization)",
        {"r_min": req.r_min, "r_max": req.r_max, "auto_percentile": req.auto_percentile},
        exp
    )

@router.post("/transform/gamma", response_model=ProcessingResponse)
def gamma_endpoint(req: GammaRequest):
    img, _ = resolve_image(req.image_id, req.image_base64)
    processed, exp = apply_gamma(img, req.gamma)
    return build_response(processed, "Power-law (Gamma) Transform", {"gamma": req.gamma}, exp)

@router.post("/transform/histogram-equalization", response_model=ProcessingResponse)
def hist_eq_endpoint(req: HistogramEqualizationRequest):
    img, _ = resolve_image(req.image_id, req.image_base64)
    processed, exp = equalize_histogram(img, req.method)
    return build_response(processed, "Histogram Equalization", {"method": req.method}, exp)

@router.post("/transform/grayscale", response_model=ProcessingResponse)
def grayscale_endpoint(req: GrayscaleRequest):
    img, _ = resolve_image(req.image_id, req.image_base64)
    processed, exp = convert_to_grayscale(img, req.formula)
    return build_response(processed, "Grayscale Conversion", {"formula": req.formula}, exp)

@router.post("/transform/sampling", response_model=ProcessingResponse)
def sampling_endpoint(req: SamplingRequest):
    img, _ = resolve_image(req.image_id, req.image_base64)
    processed, exp = reduce_sampling(img, req.factor, req.interpolation)
    return build_response(
        processed,
        f"Spatial Downsampling ({req.factor}x, {req.interpolation})",
        {"factor": req.factor, "interpolation": req.interpolation},
        exp
    )

@router.post("/transform/upsampling", response_model=ProcessingResponse)
def upsampling_endpoint(req: UpsamplingRequest):
    img, _ = resolve_image(req.image_id, req.image_base64)
    processed, exp = upsample_image(img, req.scale, req.interpolation)
    return build_response(
        processed,
        f"{req.interpolation.capitalize()} Upsampling ({req.scale}x)",
        {"scale": req.scale, "interpolation": req.interpolation},
        exp
    )

@router.post("/transform/quantization", response_model=ProcessingResponse)
def quantization_endpoint(req: QuantizationRequest):
    img, _ = resolve_image(req.image_id, req.image_base64)
    processed, exp = reduce_quantization(img, req.bits)
    return build_response(processed, "Intensity Quantization Reduction", {"bits": req.bits}, exp)

# --- Module 2: Spatial Domain Filtering ---

@router.post("/filter/smoothing", response_model=ProcessingResponse)
def smoothing_endpoint(req: SmoothingFilterRequest):
    img, _ = resolve_image(req.image_id, req.image_base64)
    processed, exp = apply_smoothing(img, req.filter_type, req.kernel_size, req.sigma)
    return build_response(
        processed,
        f"{req.filter_type.capitalize()} Smoothing Filter",
        {"filter_type": req.filter_type, "kernel_size": req.kernel_size, "sigma": req.sigma},
        exp
    )

@router.post("/filter/sharpening", response_model=ProcessingResponse)
def sharpening_endpoint(req: SharpeningFilterRequest):
    img, _ = resolve_image(req.image_id, req.image_base64)
    processed, exp = apply_sharpening(img, req.method, req.strength, req.kernel_size)
    return build_response(
        processed,
        "Spatial Sharpening Filter",
        {"method": req.method, "strength": req.strength, "kernel_size": req.kernel_size},
        exp
    )

@router.post("/filter/convolution", response_model=ProcessingResponse)
def convolution_endpoint(req: ConvolutionRequest):
    img, _ = resolve_image(req.image_id, req.image_base64)
    processed, exp = apply_custom_convolution(
        img,
        req.kernel,
        req.operation,
        req.padding_mode,
        req.normalize
    )
    return build_response(
        processed,
        f"2D {req.operation.capitalize()}",
        {
            "operation": req.operation,
            "padding_mode": req.padding_mode,
            "kernel_rows": len(req.kernel),
            "kernel_cols": len(req.kernel[0]) if req.kernel else 0,
            "normalized": req.normalize
        },
        exp
    )

@router.post("/filter/gradient", response_model=ProcessingResponse)
def gradient_endpoint(req: GradientRequest):
    img, _ = resolve_image(req.image_id, req.image_base64)
    processed, exp = apply_gradient(img, req.operator, req.direction, req.threshold)
    return build_response(
        processed,
        f"{req.operator.capitalize()} Gradient Filter",
        {"operator": req.operator, "direction": req.direction, "threshold": req.threshold},
        exp
    )

@router.post("/filter/laplacian", response_model=ProcessingResponse)
def laplacian_endpoint(req: LaplacianRequest):
    img, _ = resolve_image(req.image_id, req.image_base64)
    processed, exp = apply_laplacian(img, req.kernel_type, req.mode, req.strength)
    return build_response(
        processed,
        f"Laplacian Filter ({req.mode})",
        {"kernel_type": req.kernel_type, "mode": req.mode, "strength": req.strength},
        exp
    )

# --- Module 4: Image Degradation & Restoration ---

@router.post("/restore/noise", response_model=ProcessingResponse)
def noise_simulation_endpoint(req: NoiseSimulationRequest):
    img, _ = resolve_image(req.image_id, req.image_base64)
    processed, exp = add_noise(img, req.noise_type, req.amount, req.mean, req.std)
    return build_response(
        processed,
        f"Noise Degradation ({req.noise_type})",
        {"noise_type": req.noise_type, "amount": req.amount, "mean": req.mean, "std": req.std},
        exp
    )

@router.post("/restore/denoise", response_model=ProcessingResponse)
def denoise_endpoint(req: DenoiseRequest):
    img, _ = resolve_image(req.image_id, req.image_base64)
    processed, exp = apply_restoration(img, req.filter_type, req.kernel_size, req.sigma_color, req.sigma_space)
    return build_response(
        processed,
        f"Restoration ({req.filter_type})",
        {"filter_type": req.filter_type, "kernel_size": req.kernel_size},
        exp
    )

@router.post("/restore/evaluate", response_model=MetricsEvaluationResponse)
def evaluate_endpoint(req: MetricsEvaluationRequest):
    clean_img, _ = resolve_image(req.reference_image_id, req.reference_image_base64)
    target_img, _ = resolve_image(req.target_image_id, req.target_image_base64)
    metrics = evaluate_metrics(clean_img, target_img)
    interp = get_metrics_interpretation(metrics)
    return MetricsEvaluationResponse(
        mse=metrics["mse"],
        psnr=metrics["psnr"],
        ssim=metrics["ssim"],
        mae=metrics["mae"],
        interpretation=interp
    )

# --- Module 3: Frequency Domain Filtering ---

@router.post("/frequency/fft", response_model=FFTResponse)
def fft_endpoint(req: FFTRequest):
    img, active_id = resolve_image(req.image_id, req.image_base64)
    mag_rgb, phase_rgb, exp = compute_fft2_spectrum(img)
    mag_b64 = numpy_to_base64(mag_rgb)
    phase_b64 = numpy_to_base64(phase_rgb)
    h, w = img.shape[:2]
    return FFTResponse(
        image_id=active_id,
        magnitude_spectrum_base64=mag_b64,
        phase_spectrum_base64=phase_b64,
        width=w,
        height=h,
        explanation=exp
    )

@router.post("/frequency/filter", response_model=ProcessingResponse)
def frequency_filter_endpoint(req: FrequencyFilterRequest):
    img, _ = resolve_image(req.image_id, req.image_base64)
    processed, exp = apply_frequency_filter(img, req.filter_type, req.cutoff_frequency, req.butterworth_order)
    return build_response(
        processed,
        f"Frequency Filter ({req.filter_type})",
        {"filter_type": req.filter_type, "cutoff": req.cutoff_frequency, "order": req.butterworth_order},
        exp
    )
