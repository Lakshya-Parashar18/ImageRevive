import React, { useState, useRef, useEffect } from 'react';
import { useImage } from '../contexts/ImageContext';
import { api } from '../services/api';
import type { PixelInspectionResult, ProcessingResponse } from '../types';
import { HistogramChart } from '../components/image/HistogramChart';
import { PixelLoupe } from '../components/image/PixelLoupe';
import { ComparisonViewer } from '../components/image/ComparisonViewer';
import { SurfaceMeshViewer } from '../components/image/SurfaceMeshViewer';
import { ConceptCard } from '../components/common/ConceptCard';
import {
  Search,
  Sliders,
  Info,
  Zap,
  Box,
  Scissors,
  X,
  Minimize2,
  Maximize2,
} from 'lucide-react';

export const InspectorPage: React.FC = () => {
  const { activeImage } = useImage();

  const [inspection, setInspection] = useState<PixelInspectionResult | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'inspect' | 'mesh3d' | 'sampling' | 'quantization'>('inspect');

  // Interactive Intensity Level Slicing states
  const [sliceRange, setSliceRange] = useState<[number, number] | null>(null);
  const [sliceMode, setSliceMode] = useState<'overlay' | 'binary' | 'preserve'>('overlay');
  const [sliceColor, setSliceColor] = useState<'amber' | 'emerald' | 'cyan' | 'magenta'>('amber');
  const sliceCanvasRef = useRef<HTMLCanvasElement>(null);

  // Sampling, Upsampling & Quantization Demo States
  const [resampleMode, setResampleMode] = useState<'downsample' | 'upsample'>('downsample');
  const [samplingFactor, setSamplingFactor] = useState<number>(4);
  const [downsampleInterpolation, setDownsampleInterpolation] = useState<'nearest' | 'bilinear' | 'bicubic' | 'lanczos'>('nearest');
  const [upsampleScale, setUpsampleScale] = useState<number>(2.0);
  const [upsampleInterpolation, setUpsampleInterpolation] = useState<'nearest' | 'bilinear' | 'bicubic' | 'lanczos'>('bicubic');
  const [quantBits, setQuantBits] = useState<number>(3);
  const [demoResult, setDemoResult] = useState<ProcessingResponse | null>(null);
  const [isProcessingDemo, setIsProcessingDemo] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);

  // Trigger initial pixel inspection at center of image
  useEffect(() => {
    if (activeImage && activeImage.width && activeImage.height) {
      const centerX = Math.floor(activeImage.width / 2);
      const centerY = Math.floor(activeImage.height / 2);
      handleInspectAt(centerX, centerY);
    }
  }, [activeImage?.id]);

  const handleInspectAt = async (x: number, y: number) => {
    if (!activeImage) return;
    try {
      setInspecting(true);
      const res = await api.inspectPixel(activeImage.id, x, y, 2);
      setInspection(res);
    } catch (err) {
      console.error('Pixel inspection error:', err);
    } finally {
      setInspecting(false);
    }
  };

  const handleImageClickOrMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current || !activeImage) return;
    const rect = imgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Scale to original image coordinates
    const scaleX = activeImage.width / rect.width;
    const scaleY = activeImage.height / rect.height;

    const imgX = Math.round(clickX * scaleX);
    const imgY = Math.round(clickY * scaleY);

    handleInspectAt(imgX, imgY);
  };

  // Render Intensity Level Slicing highlight canvas in real-time
  useEffect(() => {
    if (!sliceCanvasRef.current || !activeImage) return;
    const canvas = sliceCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!sliceRange) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const [rMin, rMax] = sliceRange;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const offCanvas = document.createElement('canvas');
      offCanvas.width = img.naturalWidth;
      offCanvas.height = img.naturalHeight;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return;
      offCtx.drawImage(img, 0, 0);

      const srcData = offCtx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
      const outData = ctx.createImageData(img.naturalWidth, img.naturalHeight);
      const src = srcData.data;
      const out = outData.data;

      // Color selection
      let hlR = 245, hlG = 158, hlB = 11; // amber default
      if (sliceColor === 'emerald') { hlR = 52; hlG = 211; hlB = 153; }
      else if (sliceColor === 'cyan') { hlR = 34; hlG = 211; hlB = 238; }
      else if (sliceColor === 'magenta') { hlR = 236; hlG = 72; hlB = 153; }

      for (let i = 0; i < src.length; i += 4) {
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

        const inSlice = lum >= rMin && lum <= rMax;

        if (sliceMode === 'overlay') {
          if (inSlice) {
            out[i] = hlR;
            out[i + 1] = hlG;
            out[i + 2] = hlB;
            out[i + 3] = 220; // visible neon highlight
          } else {
            // dimmed shadow
            out[i] = 0;
            out[i + 1] = 0;
            out[i + 2] = 0;
            out[i + 3] = 120;
          }
        } else if (sliceMode === 'binary') {
          // Gonzalez & Woods Fig 3.11(b): All in-slice pixels white, rest black
          const v = inSlice ? 255 : 0;
          out[i] = v;
          out[i + 1] = v;
          out[i + 2] = v;
          out[i + 3] = 255;
        } else if (sliceMode === 'preserve') {
          // Gonzalez & Woods Fig 3.11(a): In-slice pixels highlighted, background preserved
          if (inSlice) {
            out[i] = hlR;
            out[i + 1] = hlG;
            out[i + 2] = hlB;
            out[i + 3] = 255;
          } else {
            out[i] = r;
            out[i + 1] = g;
            out[i + 2] = b;
            out[i + 3] = 255;
          }
        }
      }

      ctx.putImageData(outData, 0, 0);
    };
    img.src = activeImage.dataUrl;
  }, [activeImage, sliceRange, sliceMode, sliceColor]);

  // Run Spatial Resampling Demo (Downsampling or Upsampling)
  const handleApplySampling = async () => {
    if (!activeImage) return;
    setIsProcessingDemo(true);
    try {
      if (resampleMode === 'downsample') {
        const res = await api.reduceSampling(activeImage.id, samplingFactor, downsampleInterpolation);
        setDemoResult(res);
      } else {
        const res = await api.upsampleImage(activeImage.id, upsampleScale, upsampleInterpolation);
        setDemoResult(res);
      }
    } catch (err) {
      console.error('Resampling demo failed:', err);
    } finally {
      setIsProcessingDemo(false);
    }
  };

  // Run Quantization Demo
  const handleApplyQuantization = async () => {
    if (!activeImage) return;
    setIsProcessingDemo(true);
    try {
      const res = await api.reduceQuantization(activeImage.id, quantBits);
      setDemoResult(res);
    } catch (err) {
      console.error('Quantization demo failed:', err);
    } finally {
      setIsProcessingDemo(false);
    }
  };

  if (!activeImage) {
    return (
      <div className="p-12 text-center rounded-2xl border border-border bg-surface text-muted">
        <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <h3 className="text-base font-semibold text-primary">No Image Loaded</h3>
        <p className="text-xs mt-1">Please upload an image from the Overview page to inspect properties.</p>
      </div>
    );
  }

  const analysis = activeImage.analysis;

  return (
    <div className="space-y-6">
      {/* Tab Switcher: Property Inspector vs 3D Mesh vs Spatial Resampling vs Quantization Lab */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('inspect');
              setDemoResult(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'inspect'
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            Pixel & Property Inspector
          </button>
          <button
            onClick={() => {
              setActiveTab('mesh3d');
              setDemoResult(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              activeTab === 'mesh3d'
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Topography Mesh</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('sampling');
              setDemoResult(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'sampling'
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            Spatial Resampling
          </button>
          <button
            onClick={() => {
              setActiveTab('quantization');
              setDemoResult(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'quantization'
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            Intensity Quantization
          </button>
        </div>

        <span className="text-xs font-mono text-muted hidden sm:inline">Resolution & Bit-Depth Analysis</span>
      </div>

      {activeTab === 'inspect' ? (
        /* TAB 1: Pixel & Image Inspector with Realtime Slicing */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Central Interactive Image Preview */}
          <div className="lg:col-span-2 flex flex-col rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-border bg-elevated/70 flex items-center justify-between text-xs">
              <span className="font-mono text-primary font-medium flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-accent" />
                <span>Interactive Pixel Coordinate Inspector</span>
              </span>
              <span className="font-mono text-[11px] text-muted">Click or probe pixels • Use Histogram to Slice</span>
            </div>

            {/* Slicing Active Header Toolbar */}
            {sliceRange && (
              <div className="px-4 py-2 border-b border-accent/30 bg-accent/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Scissors className="w-3.5 h-3.5 text-accent" />
                  <span className="font-semibold text-primary">
                    Intensity Slice: [{sliceRange[0]}, {sliceRange[1]}]
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    {(['overlay', 'binary', 'preserve'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setSliceMode(mode)}
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border transition-colors ${
                          sliceMode === mode
                            ? 'bg-accent text-surface border-accent'
                            : 'bg-surface border-border text-muted hover:text-primary'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  {sliceMode === 'overlay' && (
                    <div className="flex items-center gap-1.5 ml-2">
                      {(['amber', 'emerald', 'cyan', 'magenta'] as const).map((col) => (
                        <button
                          key={col}
                          onClick={() => setSliceColor(col)}
                          className={`w-3.5 h-3.5 rounded-full border transition-transform ${
                            sliceColor === col
                              ? 'scale-125 ring-2 ring-primary ring-offset-1'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor:
                              col === 'amber'
                                ? '#f59e0b'
                                : col === 'emerald'
                                ? '#10b981'
                                : col === 'cyan'
                                ? '#06b6d4'
                                : '#ec4899',
                          }}
                          title={`Color: ${col}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSliceRange(null)}
                  className="text-[11px] text-muted hover:text-primary flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-border"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Slice</span>
                </button>
              </div>
            )}

            <div className="flex-1 p-4 flex items-center justify-center bg-main/50 technical-grid min-h-[400px] overflow-auto">
              <div className="relative inline-block border border-border rounded shadow-md bg-black/40">
                <img
                  ref={imgRef}
                  src={activeImage.dataUrl}
                  alt="Inspect Target"
                  onClick={handleImageClickOrMove}
                  onMouseMove={(e) => {
                    if (e.buttons === 1) handleImageClickOrMove(e);
                  }}
                  className="max-h-[60vh] max-w-full object-contain cursor-crosshair select-none"
                />

                {/* Slicing Highlight Canvas Overlay */}
                {sliceRange && (
                  <canvas
                    ref={sliceCanvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none object-contain rounded z-10"
                  />
                )}

                {/* Crosshair Marker */}
                {inspection && imgRef.current && (
                  <div
                    className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none ring-2 ring-accent rounded-full animate-pulse z-20"
                    style={{
                      left: `${(inspection.x / activeImage.width) * 100}%`,
                      top: `${(inspection.y / activeImage.height) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Coordinate Convention Footer Banner */}
            <div className="px-4 py-2 border-t border-border bg-elevated/50 text-[11px] text-muted flex items-center justify-between font-mono">
              <span>Coordinate Origin: (0, 0) Top-Left</span>
              <span>
                Selected: X={inspection?.x ?? '-'}, Y={inspection?.y ?? '-'}
              </span>
            </div>
          </div>

          {/* Right Col: Loupe & Image Metadata */}
          <div className="space-y-6">
            <PixelLoupe inspection={inspection} isLoading={inspecting} />

            {/* Properties Card */}
            <div className="rounded-xl border border-border bg-surface p-4 shadow-xs space-y-2 text-xs font-mono">
              <div className="flex items-center gap-2 pb-2 border-b border-border text-primary font-semibold font-heading uppercase text-xs">
                <Info className="w-4 h-4 text-accent" />
                <span>Image Metrics</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted">Width × Height:</span>
                <span className="text-primary font-medium">{activeImage.width} × {activeImage.height} px</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted">Aspect Ratio:</span>
                <span className="text-primary">{analysis?.aspect_ratio || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted">Color Mode:</span>
                <span className="text-primary">{analysis?.color_mode || 'RGB'} ({analysis?.channels || 3} channels)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted">Payload Size:</span>
                <span className="text-primary">{analysis?.file_size_kb || '-'} KB</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Shannon Entropy:</span>
                <span className="text-accent font-bold">{analysis?.entropy || '-'} bits/pixel</span>
              </div>
            </div>
          </div>

          {/* Full Width Bottom: Histogram Chart with Slicing */}
          <div className="lg:col-span-3 space-y-4">
            <HistogramChart
              histogram={analysis?.histogram}
              channelStats={analysis?.channel_stats}
              entropy={analysis?.entropy}
              title="Global Intensity Distribution & Intensity Slicing"
              enableSlicing={true}
              activeSlice={sliceRange}
              onSliceChange={setSliceRange}
            />

            {/* Intensity Slicing Academic Theory Card */}
            <ConceptCard
              category="Point Processing"
              title="Intensity Level Slicing (Gray-Level Slicing)"
              formula="s = \begin{cases} L-1 & \text{if } A \le r \le B \\ 0 & \text{otherwise} \end{cases} \quad \text{or} \quad s = \begin{cases} \text{Highlight} & \text{if } A \le r \le B \\ r & \text{otherwise} \end{cases}"
              explanation="Intensity slicing highlights a designated band of gray levels [A, B] to isolate visual features of interest—such as micro-calcifications in mammograms, bone structures in radiographs, or water reservoirs in satellite imagery. In the binary threshold variant (Fig 3.11b), all intensities within [A, B] map to max luminance while all others map to black. In the background-preserving variant (Fig 3.11a), the slice is tinted while preserving the surrounding structural context."
              insightQuestion="How does intensity slicing differ from global thresholding?"
              insightAnswer="Global thresholding partitions intensities into two half-spaces using a single boundary (r >= T). Intensity slicing isolates a bounded closed interval [A, B], enabling selective segmentation of midtones without affecting either deep shadows or specular highlights."
              defaultOpen={Boolean(sliceRange)}
            />
          </div>
        </div>
      ) : activeTab === 'mesh3d' ? (
        /* TAB 2: 3D Surface Topography Mesh Viewer */
        <div className="space-y-6">
          <SurfaceMeshViewer
            imageUrl={activeImage.dataUrl}
            width={activeImage.width}
            height={activeImage.height}
            title="3D Intensity Topography Mesh • z = I(x, y)"
          />

          <ConceptCard
            category="3D Topography"
            title="Spatial Intensity Fields & Surface Topography"
            formula="z = I(x, y) = 0.299R + 0.587G + 0.114B, \quad 0 \le z \le 255"
            explanation="A digital image is mathematically a discrete 2D scalar field z = f(x, y), where (x, y) defines the horizontal pixel lattice and z defines elevation (luminance). Under 3D surface topography, uniform regions form flat plateaus, smooth illumination gradients form gentle ramps, sharp edges manifest as steep geometric cliffs, and high-frequency noise creates jagged spires and pits."
            insightQuestion="Why do edge gradients appear as steep cliffs in 3D surface topography?"
            insightAnswer="The spatial gradient magnitude ||grad f|| = sqrt((df/dx)^2 + (df/dy)^2) measures the rate of intensity change per unit spatial distance. High gradient values correspond directly to high geometric slopes (cliffs) on the 3D intensity surface."
            defaultOpen={true}
          />
        </div>
      ) : activeTab === 'sampling' ? (
        /* TAB 2: Spatial Resampling Demonstration (Downsampling & Upsampling) */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Comparison Viewer */}
            <div className="lg:col-span-2">
              <ComparisonViewer
                originalUrl={activeImage.dataUrl}
                processedUrl={demoResult?.processed_image_base64}
                originalLabel={
                  resampleMode === 'downsample'
                    ? 'Original Spatial Grid'
                    : `Original (${activeImage.width}×${activeImage.height} px)`
                }
                processedLabel={
                  demoResult
                    ? resampleMode === 'downsample'
                      ? `Downsampled ${samplingFactor}x (${downsampleInterpolation.toUpperCase()})`
                      : `Upsampled ${upsampleScale}x (${upsampleInterpolation.toUpperCase()} — ${Math.round(activeImage.width * upsampleScale)}×${Math.round(activeImage.height * upsampleScale)} px)`
                    : resampleMode === 'downsample'
                    ? `Downsampled ${samplingFactor}x`
                    : `Upsampled ${upsampleScale}x`
                }
                width={
                  demoResult && resampleMode === 'upsample'
                    ? Math.round(activeImage.width * upsampleScale)
                    : activeImage.width
                }
                height={
                  demoResult && resampleMode === 'upsample'
                    ? Math.round(activeImage.height * upsampleScale)
                    : activeImage.height
                }
                isProcessing={isProcessingDemo}
              />
            </div>

            {/* Right Col: Parameter Controls & Explanation */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-border">
                  <Sliders className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-semibold text-primary uppercase font-mono tracking-wider">
                    Spatial Resampling Controls
                  </h3>
                </div>

                {/* Sub-Mode Toggle: Downsampling vs Upsampling */}
                <div className="flex rounded-lg bg-elevated p-1 border border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setResampleMode('downsample');
                      setDemoResult(null);
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      resampleMode === 'downsample'
                        ? 'bg-accent text-surface shadow-xs'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Downsample</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResampleMode('upsample');
                      setDemoResult(null);
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      resampleMode === 'upsample'
                        ? 'bg-accent text-surface shadow-xs'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Upsample</span>
                  </button>
                </div>

                {resampleMode === 'downsample' ? (
                  /* DOWNSAMPLING CONTROLS */
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-2">
                        <span className="text-secondary">Downsampling Factor:</span>
                        <span className="text-accent font-bold">{samplingFactor}x</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="32"
                        step="2"
                        value={samplingFactor}
                        onChange={(e) => setSamplingFactor(Number(e.target.value))}
                        className="w-full accent-accent"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-muted mt-1">
                        <span>2x (Mild)</span>
                        <span>8x</span>
                        <span>16x</span>
                        <span>32x (Blocky)</span>
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5">
                      {[2, 4, 8, 16].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setSamplingFactor(f)}
                          className={`flex-1 py-1 rounded text-[11px] font-mono border transition-colors ${
                            samplingFactor === f
                              ? 'bg-accent/15 border-accent text-accent font-bold'
                              : 'bg-elevated border-border text-secondary hover:text-primary'
                          }`}
                        >
                          {f}x
                        </button>
                      ))}
                    </div>

                    {/* Reconstruction Kernel */}
                    <div>
                      <label className="block text-xs font-mono text-secondary mb-1.5">
                        Display Interpolation Kernel:
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'nearest', label: 'Nearest (Pixelated)' },
                          { id: 'bilinear', label: 'Bilinear (Smooth)' },
                          { id: 'bicubic', label: 'Bicubic (Spline)' },
                          { id: 'lanczos', label: 'Lanczos (Sinc)' },
                        ].map((k) => (
                          <button
                            key={k.id}
                            type="button"
                            onClick={() => setDownsampleInterpolation(k.id as any)}
                            className={`py-1.5 px-2 rounded text-[11px] font-mono border text-left transition-colors ${
                              downsampleInterpolation === k.id
                                ? 'bg-accent/15 border-accent text-accent font-semibold'
                                : 'bg-elevated border-border text-secondary hover:text-primary'
                            }`}
                          >
                            {k.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-elevated border border-border text-xs font-mono space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted">Subsampled Grid:</span>
                        <span className="text-primary">
                          {Math.max(1, Math.floor(activeImage.width / samplingFactor))} × {Math.max(1, Math.floor(activeImage.height / samplingFactor))} px
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Information Retention:</span>
                        <span className="text-accent font-semibold">
                          {((1 / (samplingFactor * samplingFactor)) * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Aliasing Effect:</span>
                        <span className="text-secondary">Spatial frequency foldover</span>
                      </div>
                    </div>

                    <button
                      onClick={handleApplySampling}
                      disabled={isProcessingDemo}
                      className="w-full py-2.5 rounded-lg bg-accent text-surface text-xs font-semibold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isProcessingDemo ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                          <span>Downsampling Grid...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>Apply Spatial Downsampling</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* UPSAMPLING CONTROLS */
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-2">
                        <span className="text-secondary">Upscaling Scale Factor:</span>
                        <span className="text-accent font-bold">{upsampleScale}x</span>
                      </div>
                      <input
                        type="range"
                        min="1.25"
                        max="4.0"
                        step="0.25"
                        value={upsampleScale}
                        onChange={(e) => setUpsampleScale(Number(e.target.value))}
                        className="w-full accent-accent"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-muted mt-1">
                        <span>1.25x</span>
                        <span>2.0x (Standard)</span>
                        <span>3.0x</span>
                        <span>4.0x (Max)</span>
                      </div>
                    </div>

                    {/* Scale Presets */}
                    <div className="flex items-center gap-1.5">
                      {[1.5, 2.0, 3.0, 4.0].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setUpsampleScale(s)}
                          className={`flex-1 py-1 rounded text-[11px] font-mono border transition-colors ${
                            upsampleScale === s
                              ? 'bg-accent/15 border-accent text-accent font-bold'
                              : 'bg-elevated border-border text-secondary hover:text-primary'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>

                    {/* Interpolation Kernel Selector */}
                    <div>
                      <label className="block text-xs font-mono text-secondary mb-1.5">
                        Interpolation Kernel (Algorithm):
                      </label>
                      <div className="space-y-1.5">
                        {[
                          {
                            id: 'nearest',
                            name: 'Nearest Neighbor',
                            desc: 'Zero-order hold. Duplicates nearest pixel. Sharp grid, blocky edges.',
                          },
                          {
                            id: 'bilinear',
                            name: 'Bilinear',
                            desc: '1st-order 2×2 linear average. Smooth transitions, mild edge blur.',
                          },
                          {
                            id: 'bicubic',
                            name: 'Bicubic (Spline)',
                            desc: '3rd-order 4×4 cubic spline. Photographic standard with smooth curves.',
                          },
                          {
                            id: 'lanczos',
                            name: 'Lanczos-4',
                            desc: '8×8 sinc-windowed filter. Highest spatial sharpness & edge acuity.',
                          },
                        ].map((k) => (
                          <button
                            key={k.id}
                            type="button"
                            onClick={() => setUpsampleInterpolation(k.id as any)}
                            className={`w-full p-2 rounded-lg border text-left transition-all ${
                              upsampleInterpolation === k.id
                                ? 'bg-accent/15 border-accent text-accent'
                                : 'bg-elevated border-border text-secondary hover:text-primary'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-semibold text-primary">
                                {k.name}
                              </span>
                              {upsampleInterpolation === k.id && (
                                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-accent text-surface font-bold">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted mt-0.5 leading-snug">
                              {k.desc}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Calculated Metrics Box */}
                    <div className="p-3 rounded-lg bg-elevated border border-border text-xs font-mono space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted">Input Resolution:</span>
                        <span className="text-primary">{activeImage.width} × {activeImage.height} px</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Target Resolution:</span>
                        <span className="text-accent font-bold">
                          {Math.round(activeImage.width * upsampleScale)} × {Math.round(activeImage.height * upsampleScale)} px
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Pixel Multiplier:</span>
                        <span className="text-primary font-medium">
                          {(upsampleScale * upsampleScale).toFixed(2)}x total pixels (+{Math.round(((upsampleScale * upsampleScale) - 1) * 100)}%)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Target Megapixels:</span>
                        <span className="text-secondary">
                          {((Math.round(activeImage.width * upsampleScale) * Math.round(activeImage.height * upsampleScale)) / 1000000).toFixed(2)} MP
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleApplySampling}
                      disabled={isProcessingDemo}
                      className="w-full py-2.5 rounded-lg bg-accent text-surface text-xs font-semibold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isProcessingDemo ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                          <span>Upsampling Image Matrix...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>Apply Spatial Upsampling</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Dynamic Concept Card */}
              {resampleMode === 'downsample' ? (
                <ConceptCard
                  category="Spatial Resolution"
                  title="Spatial Sampling & Nyquist Criterion"
                  formula="f_s \ge 2 \cdot f_{max} \quad (\text{Nyquist Sampling Rate})"
                  explanation="Digitizing an analog scene requires sampling continuous spatial coordinates (x, y) into a discrete grid of pixels. When the sampling frequency falls below twice the highest spatial frequency component, high-frequency textures fold into false low-frequency patterns—producing pixelation and Moiré aliasing artifacts."
                  insightQuestion="What happens when an image is spatially undersampled?"
                  insightAnswer="Undersampling introduces aliasing and blockiness. High-frequency details like sharp edges, fine lines, and textures are lost and cannot be reconstructed without interpolation blur."
                  defaultOpen={true}
                />
              ) : (
                <ConceptCard
                  category="Spatial Resolution"
                  title="2D Spatial Interpolation & Reconstruction Kernels"
                  formula="f(x, y) = \sum_{i} \sum_{j} f(i, j) \cdot K(x - i) \cdot K(y - j)"
                  explanation="Upsampling estimates continuous sub-pixel values using 2D separable convolution with an interpolation kernel K(u). Nearest-neighbor creates zero-order step discontinuities (blocky pixel grid). Bilinear provides smooth C^0 linear ramps over 2x2 neighbors. Bicubic fits 3rd-order polynomials across a 4x4 neighborhood for smooth C^1 continuous photographic curves. Lanczos-4 uses an 8x8 sinc-windowed kernel to preserve maximum edge acuity."
                  insightQuestion="Can spatial upsampling recover lost high-frequency details?"
                  insightAnswer="No. Interpolation reconstructs continuous transitions between existing discrete samples, but cannot synthesize authentic sub-pixel information that was never recorded by the optical sensor."
                  defaultOpen={true}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        /* TAB 3: Intensity Quantization Demonstration */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Comparison Viewer */}
            <div className="lg:col-span-2">
              <ComparisonViewer
                originalUrl={activeImage.dataUrl}
                processedUrl={demoResult?.processed_image_base64}
                originalLabel="8-Bit Depth (256 Intensity Levels)"
                processedLabel={`${quantBits}-Bit Quantized (${Math.pow(2, quantBits)} Levels)`}
                width={activeImage.width}
                height={activeImage.height}
                isProcessing={isProcessingDemo}
              />
            </div>

            {/* Right Col: Quantization Slider & Theory */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-border">
                  <Sliders className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-semibold text-primary uppercase font-mono tracking-wider">
                    Intensity Quantization Controls
                  </h3>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <span className="text-secondary">Quantization Bit Depth:</span>
                    <span className="text-accent font-bold">{quantBits} bits ({Math.pow(2, quantBits)} levels)</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="7"
                    step="1"
                    value={quantBits}
                    onChange={(e) => setQuantBits(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-muted mt-1">
                    <span>1 bit (Binary: 2 levels)</span>
                    <span>3 bits (8 levels)</span>
                    <span>7 bits (128 levels)</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-elevated border border-border text-xs font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted">Discrete Gray Levels L:</span>
                    <span className="text-primary font-semibold">{Math.pow(2, quantBits)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Visual Artifact:</span>
                    <span className="text-accent">
                      {quantBits <= 3 ? 'Prominent False Contouring' : 'Subtle Banding'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleApplyQuantization}
                  disabled={isProcessingDemo}
                  className="w-full py-2.5 rounded-lg bg-accent text-surface text-xs font-semibold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessingDemo ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                      <span>Quantizing Bit Depth...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Apply Quantization Reduction</span>
                    </>
                  )}
                </button>
              </div>

              {/* Concept Card */}
              <ConceptCard
                category="Bit Depth"
                title="Intensity Quantization & False Contouring"
                formula="L = 2^k, \quad \Delta = \frac{256}{L} \quad (\text{Quantization Step Size})"
                explanation="Quantization maps continuous photon intensities into discrete numerical integers. Standard digital displays use 8 bits per channel (256 levels). When bit depth is reduced to 1–4 bits, smooth continuous gradients degrade into distinct stepped bands of constant shade—a phenomenon known as false contouring."
                insightQuestion="What is false contouring and how does it relate to quantization?"
                insightAnswer="False contouring is the emergence of artificial ridges or boundaries in regions of smooth intensity transitions caused by insufficient quantization levels (coarse quantization step size Delta)."
                defaultOpen={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
