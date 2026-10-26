export type ThemeMode = 'light' | 'dark' | 'system';

export interface ChannelStats {
  min: number;
  max: number;
  mean: number;
  std: number;
}

export interface HistogramData {
  bins: number[];
  red?: number[];
  green?: number[];
  blue?: number[];
  grayscale?: number[];
}

export interface ImageAnalysisResult {
  image_id: string;
  width: number;
  height: number;
  aspect_ratio: string;
  channels: number;
  color_mode: string;
  format: string;
  file_size_bytes: number;
  file_size_kb: number;
  entropy: number;
  channel_stats: Record<string, ChannelStats>;
  histogram: HistogramData;
}

export interface PixelInspectionResult {
  x: number;
  y: number;
  rgb: [number, number, number];
  hex: string;
  normalized: [number, number, number];
  neighborhood_size: number;
  neighborhood: number[][][]; // [row][col][channel]
  neighborhood_coords: Array<Array<{ x: number; y: number }>>;
}

export interface ProcessingResponse {
  image_id: string;
  processed_image_base64: string;
  width: number;
  height: number;
  color_mode: string;
  operation: string;
  parameters: Record<string, any>;
  histogram?: HistogramData;
  metrics?: Record<string, number>;
  explanation?: string;
}

export interface SampleImageInfo {
  id: string;
  title: string;
  description: string;
  category: string;
  width: number;
  height: number;
  data_url: string;
}

export interface ActiveImage {
  id: string;
  dataUrl: string;
  filename: string;
  width: number;
  height: number;
  analysis?: ImageAnalysisResult;
}

export interface HistoryEntry {
  id: string;
  operationName: string;
  timestamp: string;
  parameters: Record<string, any>;
  inputImageId: string;
  inputImagePreview?: string;
  outputImageId: string;
  outputImageBase64: string;
  explanation?: string;
  metrics?: Record<string, number>;
}

export interface MetricsEvaluation {
  mse: number;
  psnr: number;
  ssim: number;
  mae: number;
  interpretation: string;
}

export interface FFTResponse {
  image_id: string;
  magnitude_spectrum_base64: string;
  phase_spectrum_base64: string;
  width: number;
  height: number;
  explanation: string;
}
