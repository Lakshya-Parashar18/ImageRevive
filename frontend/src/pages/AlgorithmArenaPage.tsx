import React, { useState } from 'react';
import { useImage } from '../contexts/ImageContext';
import { api } from '../services/api';
import type { ProcessingResponse, MetricsEvaluation } from '../types';
import { ComparisonViewer } from '../components/image/ComparisonViewer';
import { HistogramChart } from '../components/image/HistogramChart';
import {
  Layers,
  Scale,
} from 'lucide-react';

interface AlgorithmConfig {
  id: string;
  name: string;
  category: string;
  defaultParams: Record<string, any>;
  run: (imageId: string, params: Record<string, any>) => Promise<ProcessingResponse>;
}

const ALGORITHMS: AlgorithmConfig[] = [
  {
    id: 'stretch',
    name: 'Contrast Stretching (Min-Max)',
    category: 'Enhancement',
    defaultParams: { auto: true },
    run: (id) => api.stretchContrast(id, true),
  },
  {
    id: 'hist_eq',
    name: 'Histogram Equalization (YCrCb)',
    category: 'Enhancement',
    defaultParams: { method: 'preserve_color' },
    run: (id) => api.equalizeHistogram(id, 'preserve_color'),
  },
  {
    id: 'gamma',
    name: 'Power-Law Gamma (γ = 0.5)',
    category: 'Enhancement',
    defaultParams: { gamma: 0.5 },
    run: (id, p) => api.applyGamma(id, p.gamma || 0.5),
  },
  {
    id: 'gaussian_blur',
    name: 'Gaussian Smoothing (5×5, σ=1.5)',
    category: 'Filtering',
    defaultParams: { ksize: 5, sigma: 1.5 },
    run: (id, p) => api.applySmoothing(id, 'gaussian', p.ksize || 5, p.sigma || 1.5),
  },
  {
    id: 'mean_blur',
    name: 'Box Mean Smoothing (5×5)',
    category: 'Filtering',
    defaultParams: { ksize: 5 },
    run: (id, p) => api.applySmoothing(id, 'mean', p.ksize || 5),
  },
  {
    id: 'unsharp',
    name: 'Unsharp Masking (k = 1.5)',
    category: 'Filtering',
    defaultParams: { strength: 1.5 },
    run: (id, p) => api.applySharpening(id, 'unsharp_mask', p.strength || 1.5),
  },
  {
    id: 'laplacian',
    name: 'Laplacian Sharpening',
    category: 'Filtering',
    defaultParams: { strength: 1.0 },
    run: (id, p) => api.applyLaplacian(id, '8_neighbor', 'sharpened', p.strength || 1.0),
  },
  {
    id: 'sobel',
    name: 'Sobel Gradient Magnitude',
    category: 'Edge Detection',
    defaultParams: { dir: 'magnitude' },
    run: (id) => api.applyGradient(id, 'sobel', 'magnitude'),
  },
  {
    id: 'median',
    name: 'Median Filter (3×3)',
    category: 'Restoration',
    defaultParams: { ksize: 3 },
    run: (id, p) => api.applyRestoration(id, 'median', p.ksize || 3),
  },
];

export const AlgorithmArenaPage: React.FC = () => {
  const { activeImage, addHistoryEntry } = useImage();

  const [algoAId, setAlgoAId] = useState<string>('stretch');
  const [algoBId, setAlgoBId] = useState<string>('hist_eq');

  const [resultA, setResultA] = useState<ProcessingResponse | null>(null);
  const [resultB, setResultB] = useState<ProcessingResponse | null>(null);
  const [metricsA, setMetricsA] = useState<MetricsEvaluation | null>(null);
  const [metricsB, setMetricsB] = useState<MetricsEvaluation | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!activeImage) {
    return (
      <div className="p-12 text-center rounded-2xl border border-border bg-surface text-muted">
        <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <h3 className="text-base font-semibold text-primary">No Image Loaded</h3>
        <p className="text-xs mt-1">Please upload an image or choose a sample to use Compare.</p>
      </div>
    );
  }

  const algoA = ALGORITHMS.find((a) => a.id === algoAId) || ALGORITHMS[0];
  const algoB = ALGORITHMS.find((a) => a.id === algoBId) || ALGORITHMS[1];

  const handleRunMatchup = async () => {
    setIsProcessing(true);
    try {
      const [resA, resB] = await Promise.all([
        algoA.run(activeImage.id, algoA.defaultParams),
        algoB.run(activeImage.id, algoB.defaultParams),
      ]);

      const [mA, mB] = await Promise.all([
        api.evaluateMetrics(activeImage.id, resA.image_id),
        api.evaluateMetrics(activeImage.id, resB.image_id),
      ]);

      setResultA(resA);
      setResultB(resB);
      setMetricsA(mA);
      setMetricsB(mB);

      addHistoryEntry({
        operationName: `Compare: ${algoA.name} vs ${algoB.name}`,
        parameters: { algoA: algoA.id, algoB: algoB.id },
        inputImageId: activeImage.id,
        outputImageId: resA.image_id,
        outputImageBase64: resA.processed_image_base64,
        explanation: `Compared ${algoA.name} against ${algoB.name}.`,
      });
    } catch (err: any) {
      console.error('Arena matchup failed:', err);
      alert(err.message || 'Comparison failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Matchup Selector Bar */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center rounded-xl border border-border bg-surface p-4 shadow-xs">
        {/* Method A Selector */}
        <div className="md:col-span-3 space-y-1">
          <label className="block text-[11px] font-mono text-muted uppercase">Method A (Left)</label>
          <select
            value={algoAId}
            onChange={(e) => setAlgoAId(e.target.value)}
            className="w-full text-xs font-mono bg-elevated border border-border rounded-lg px-2.5 py-2 text-primary focus:outline-none focus:border-accent"
          >
            {ALGORITHMS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.category})
              </option>
            ))}
          </select>
        </div>

        {/* Center VS Badge */}
        <div className="md:col-span-1 flex flex-col items-center justify-center">
          <button
            onClick={handleRunMatchup}
            disabled={isProcessing}
            title="Compare Methods"
            className="w-10 h-10 rounded-full bg-accent text-surface hover:bg-accent-hover flex items-center justify-center shadow-md transition-all hover:scale-105 disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
            ) : (
              <Scale className="w-5 h-5" />
            )}
          </button>
          <span className="text-[10px] font-mono text-accent font-bold mt-1">VS</span>
        </div>

        {/* Method B Selector */}
        <div className="md:col-span-3 space-y-1">
          <label className="block text-[11px] font-mono text-muted uppercase">Method B (Right)</label>
          <select
            value={algoBId}
            onChange={(e) => setAlgoBId(e.target.value)}
            className="w-full text-xs font-mono bg-elevated border border-border rounded-lg px-2.5 py-2 text-primary focus:outline-none focus:border-accent"
          >
            {ALGORITHMS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Arena Comparison View */}
      {resultA && resultB ? (
        <div className="space-y-6">
          {/* Direct Split Comparison between Contender A and Contender B */}
          <ComparisonViewer
            originalUrl={resultA.processed_image_base64}
            processedUrl={resultB.processed_image_base64}
            originalLabel={`A: ${algoA.name}`}
            processedLabel={`B: ${algoB.name}`}
            width={activeImage.width}
            height={activeImage.height}
          />

          {/* Comparative Metrics & Trade-off Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contender A Summary Card */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="font-heading font-bold text-sm text-primary">{algoA.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent/15 text-accent font-semibold">
                  Algorithm A
                </span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">{resultA.explanation}</p>

              <div className="grid grid-cols-3 gap-2 pt-2 text-center font-mono text-xs">
                <div className="p-2 rounded bg-elevated border border-border">
                  <span className="text-[10px] text-muted block">PSNR</span>
                  <span className="font-bold text-accent">{metricsA?.psnr} dB</span>
                </div>
                <div className="p-2 rounded bg-elevated border border-border">
                  <span className="text-[10px] text-muted block">SSIM</span>
                  <span className="font-bold text-success">{metricsA?.ssim}</span>
                </div>
                <div className="p-2 rounded bg-elevated border border-border">
                  <span className="text-[10px] text-muted block">MSE</span>
                  <span className="font-bold text-primary">{metricsA?.mse}</span>
                </div>
              </div>
            </div>

            {/* Contender B Summary Card */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="font-heading font-bold text-sm text-primary">{algoB.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent/15 text-accent font-semibold">
                  Algorithm B
                </span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">{resultB.explanation}</p>

              <div className="grid grid-cols-3 gap-2 pt-2 text-center font-mono text-xs">
                <div className="p-2 rounded bg-elevated border border-border">
                  <span className="text-[10px] text-muted block">PSNR</span>
                  <span className="font-bold text-accent">{metricsB?.psnr} dB</span>
                </div>
                <div className="p-2 rounded bg-elevated border border-border">
                  <span className="text-[10px] text-muted block">SSIM</span>
                  <span className="font-bold text-success">{metricsB?.ssim}</span>
                </div>
                <div className="p-2 rounded bg-elevated border border-border">
                  <span className="text-[10px] text-muted block">MSE</span>
                  <span className="font-bold text-primary">{metricsB?.mse}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Histograms Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HistogramChart histogram={resultA.histogram} title={`Histogram: ${algoA.name}`} />
            <HistogramChart histogram={resultB.histogram} title={`Histogram: ${algoB.name}`} />
          </div>
        </div>
      ) : (
        /* Empty State with Call to Action */
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-surface/50 text-muted space-y-3">
          <Scale className="w-12 h-12 mx-auto opacity-30 text-accent" />
          <h3 className="text-base font-semibold text-primary font-heading">Ready for Dual Algorithm Comparison</h3>
          <p className="text-xs max-w-md mx-auto">
            Select Contender A and Contender B above, then click the central VS icon or the button below to compute both transformations on real image data.
          </p>
          <button
            onClick={handleRunMatchup}
            disabled={isProcessing}
            className="px-5 py-2.5 rounded-lg bg-accent text-surface text-xs font-semibold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-xs"
          >
            Launch Arena Benchmark
          </button>
        </div>
      )}
    </div>
  );
};
