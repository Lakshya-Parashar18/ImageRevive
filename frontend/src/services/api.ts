import type {
  ImageAnalysisResult,
  PixelInspectionResult,
  ProcessingResponse,
  SampleImageInfo,
  MetricsEvaluation,
  FFTResponse,
} from '../types';

const rawBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const cleanBase = rawBase.replace(/\/+$/, '');
const API_BASE = cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) {
        errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

export const api = {
  // Health
  async checkHealth(): Promise<{ status: string; version: string; uptime_seconds: number }> {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  // Samples
  async getSamples(): Promise<SampleImageInfo[]> {
    const res = await fetch(`${API_BASE}/samples`);
    return handleResponse(res);
  },

  async getSampleById(id: string): Promise<SampleImageInfo> {
    const res = await fetch(`${API_BASE}/samples/${id}`);
    return handleResponse(res);
  },

  // Upload
  async uploadImage(file: File): Promise<{
    image_id: string;
    filename: string;
    data_url: string;
    analysis: ImageAnalysisResult;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },

  // Analysis
  async analyzeImage(imageId?: string, imageBase64?: string): Promise<ImageAnalysisResult> {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_id: imageId, image_base64: imageBase64 }),
    });
    return handleResponse(res);
  },

  // Pixel Inspection
  async inspectPixel(imageId: string, x: number, y: number, radius = 2): Promise<PixelInspectionResult> {
    const res = await fetch(`${API_BASE}/inspect/pixel?image_id=${encodeURIComponent(imageId)}&x=${x}&y=${y}&radius=${radius}`);
    return handleResponse(res);
  },

  // --- Transformations ---
  async adjustBrightness(imageId: string, delta: number): Promise<ProcessingResponse> {
    const res = await fetch(`${API_BASE}/transform/brightness`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_id: imageId, delta }),
    });
    return handleResponse(res);
  },

  async adjustContrast(imageId: string, alpha: number, beta: number): Promise<ProcessingResponse> {
    const res = await fetch(`${API_BASE}/transform/contrast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_id: imageId, alpha, beta }),
    });
    return handleResponse(res);
  },

  async stretchContrast(
    imageId: string,
    autoPercentile = true,
    rMin?: number,
    rMax?: number
  ): Promise<ProcessingResponse> {
    const res = await fetch(`${API_BASE}/transform/contrast-stretch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_id: imageId,
        auto_percentile: autoPercentile,
        r_min: rMin,
        r_max: rMax,
      }),
    });
    return handleResponse(res);
  },

  async applyGamma(imageId: string, gamma: number): Promise<ProcessingResponse> {
    const res = await fetch(`${API_BASE}/transform/gamma`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_id: imageId, gamma }),
    });
    return handleResponse(res);
  },

  async equalizeHistogram(imageId: string, method: 'preserve_color' | 'grayscale' = 'preserve_color'): Promise<ProcessingResponse> {
    const res = await fetch(`${API_BASE}/transform/histogram-equalization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_id: imageId, method }),
    });
    return handleResponse(res);
  },

  async convertToGrayscale(imageId: string, formula: 'luminance' | 'average' = 'luminance'): Promise<ProcessingResponse> {
    const res = await fetch(`${API_BASE}/transform/grayscale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_id: imageId, formula }),
    });
    return handleResponse(res);
  },

  async reduceSampling(imageId: string, factor: number, interpolation: string = 'nearest'): Promise<ProcessingResponse> {
    const res = await fetch(`${API_BASE}/transform/sampling`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_id: imageId, factor, interpolation }),
    });
    return handleResponse(res);
  },

  async upsampleImage(
    imageId: string,
    scale: number,
    interpolation: 'nearest' | 'bilinear' | 'bicubic' | 'lanczos' = 'bicubic'
  ): Promise<ProcessingResponse> {
    const res = await fetch(`${API_BASE}/transform/upsampling`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_id: imageId, scale, interpolation }),
    });
    return handleResponse(res);
  },

  async reduceQuantization(imageId: string, bits: number): Promise<ProcessingResponse> {
    const res = await fetch(`${API_BASE}/transform/quantization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_id: imageId, bits }),
    });
    return handleResponse(res);
  },

  // --- Filtering Playground ---
  async applySmoothing(
    imageId: string,
    filterType: 'gaussian' | 'mean' | 'box',
    kernelSize: number,
    sigma = 1.0
  ): Promise<ProcessingResponse> {
    const res = await fetch(`${API_BASE}/filter/smoothing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_id: imageId,
        filter_type: filterType,
        kernel_size: kernelSize,
        sigma,
      }),
    });
    return handleResponse(res);
  },

  async applySharpening(
    imageId: string,
    method: 'unsharp_mask' | 'laplacian',
    strength: number,
    kernelSize = 5
  ): Promise<ProcessingResponse> {
    const res = await fetch(`${API_BASE}/filter/sharpening`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_id: imageId,
        method,
        strength,
        kernel_size: kernelSize,
      }),
    });
    return handleResponse(res);
  },

  async applyConvolution(
    imageId: string,
    kernel: number[][],
    operation: 'convolution' | 'correlation' = 'convolution',
    paddingMode: 'replicate' | 'reflect' | 'constant' = 'replicate',
    normalize = false
  ): Promise<ProcessingResponse> {
    const res = await fetch(`${API_BASE}/filter/convolution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_id: imageId,
        kernel,
        operation,
        padding_mode: paddingMode,
        normalize,
      }),
    });
    return handleResponse(res);
  },

  async applyGradient(
    imageId: string,
    operator: 'sobel' | 'scharr' | 'prewitt',
    direction: 'magnitude' | 'x' | 'y',
    threshold?: number
  ): Promise<ProcessingResponse> {
    const res = await fetch(`${API_BASE}/filter/gradient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_id: imageId,
        operator,
        direction,
        threshold,
      }),
    });
    return handleResponse(res);
  },

  async applyLaplacian(
    imageId: string,
    kernelType: '4_neighbor' | '8_neighbor',
    mode: 'raw' | 'sharpened',
    strength = 1.0
  ): Promise<ProcessingResponse> {
    const res = await fetch(`${API_BASE}/filter/laplacian`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_id: imageId,
        kernel_type: kernelType,
        mode,
        strength,
      }),
    });
    return handleResponse(res);
  },

  // --- Restoration Lab ---
  async addNoise(
    imageId: string,
    noiseType: 'gaussian' | 'salt_and_pepper' | 'speckle',
    amount = 0.05,
    mean = 0,
    std = 25
  ): Promise<ProcessingResponse> {
    const res = await fetch(`${API_BASE}/restore/noise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_id: imageId,
        noise_type: noiseType,
        amount,
        mean,
        std,
      }),
    });
    return handleResponse(res);
  },

  async applyRestoration(
    imageId: string,
    filterType: 'median' | 'arithmetic_mean' | 'gaussian' | 'bilateral',
    kernelSize = 3,
    sigmaColor = 75,
    sigmaSpace = 75
  ): Promise<ProcessingResponse> {
    const res = await fetch(`${API_BASE}/restore/denoise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_id: imageId,
        filter_type: filterType,
        kernel_size: kernelSize,
        sigma_color: sigmaColor,
        sigma_space: sigmaSpace,
      }),
    });
    return handleResponse(res);
  },

  async evaluateMetrics(
    referenceImageId: string,
    targetImageId: string
  ): Promise<MetricsEvaluation> {
    const res = await fetch(`${API_BASE}/restore/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference_image_id: referenceImageId,
        target_image_id: targetImageId,
      }),
    });
    return handleResponse(res);
  },

  // --- Frequency Domain Lab ---
  async computeFFT(imageId: string): Promise<FFTResponse> {
    const res = await fetch(`${API_BASE}/frequency/fft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_id: imageId }),
    });
    return handleResponse(res);
  },

  async filterFrequency(
    imageId: string,
    filterType: string,
    cutoffFrequency: number,
    butterworthOrder = 2
  ): Promise<ProcessingResponse> {
    const res = await fetch(`${API_BASE}/frequency/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_id: imageId,
        filter_type: filterType,
        cutoff_frequency: cutoffFrequency,
        butterworth_order: butterworthOrder,
      }),
    });
    return handleResponse(res);
  },
};
