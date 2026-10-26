import React, { useState } from 'react';
import { useImage } from '../contexts/ImageContext';
import { api } from '../services/api';
import type { ProcessingResponse, MetricsEvaluation } from '../types';
import { ComparisonViewer } from '../components/image/ComparisonViewer';
import { ConceptCard } from '../components/common/ConceptCard';
import {
  Wrench,
  AlertTriangle,
  RotateCcw,
  Zap,
  CheckCircle,
} from 'lucide-react';

export const RestorationLabPage: React.FC = () => {
  const { activeImage, addHistoryEntry } = useImage();

  // Mode: 'degrade' (Add Noise) or 'restore' (Denoise)
  const [activeStep, setActiveStep] = useState<'degrade' | 'restore'>('degrade');

  // Noise simulation state
  const [noiseType, setNoiseType] = useState<'salt_and_pepper' | 'gaussian' | 'speckle'>('salt_and_pepper');
  const [noiseAmount, setNoiseAmount] = useState<number>(0.08); // 8% for salt & pepper
  const [noiseStd, setNoiseStd] = useState<number>(25.0); // for gaussian/speckle

  // Restoration filter state
  const [filterType, setFilterType] = useState<'median' | 'arithmetic_mean' | 'gaussian' | 'bilateral'>('median');
  const [kernelSize, setKernelSize] = useState<number>(3);

  // Images state
  const [degradedImage, setDegradedImage] = useState<ProcessingResponse | null>(null);
  const [restoredImage, setRestoredImage] = useState<ProcessingResponse | null>(null);

  // Metrics state
  const [noisyMetrics, setNoisyMetrics] = useState<MetricsEvaluation | null>(null);
  const [restoredMetrics, setRestoredMetrics] = useState<MetricsEvaluation | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!activeImage) {
    return (
      <div className="p-12 text-center rounded-2xl border border-border bg-surface text-muted">
        <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <h3 className="text-base font-semibold text-primary">No Image Loaded</h3>
        <p className="text-xs mt-1">Please upload an image or choose a sample to use Restore.</p>
      </div>
    );
  }

  // Step 1: Inject simulated noise
  const handleSimulateNoise = async () => {
    setIsProcessing(true);
    try {
      const res = await api.addNoise(
        activeImage.id,
        noiseType,
        noiseAmount,
        0,
        noiseStd
      );
      setDegradedImage(res);
      setRestoredImage(null);
      setRestoredMetrics(null);

      // Compute noisy metrics against original
      const metrics = await api.evaluateMetrics(activeImage.id, res.image_id);
      setNoisyMetrics(metrics);
      setActiveStep('restore');

      addHistoryEntry({
        operationName: res.operation,
        parameters: res.parameters,
        inputImageId: activeImage.id,
        outputImageId: res.image_id,
        outputImageBase64: res.processed_image_base64,
        explanation: res.explanation,
        metrics: { mse: metrics.mse, psnr: metrics.psnr, ssim: metrics.ssim },
      });
    } catch (err: any) {
      console.error('Noise simulation error:', err);
      alert(err.message || 'Noise simulation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 2: Apply restoration filter to the degraded image
  const handleApplyRestoration = async () => {
    const targetInputId = degradedImage ? degradedImage.image_id : activeImage.id;
    setIsProcessing(true);
    try {
      const res = await api.applyRestoration(targetInputId, filterType, kernelSize);
      setRestoredImage(res);

      // Evaluate restored image against clean ground truth
      const metrics = await api.evaluateMetrics(activeImage.id, res.image_id);
      setRestoredMetrics(metrics);

      addHistoryEntry({
        operationName: res.operation,
        parameters: res.parameters,
        inputImageId: targetInputId,
        outputImageId: res.image_id,
        outputImageBase64: res.processed_image_base64,
        explanation: res.explanation,
        metrics: { mse: metrics.mse, psnr: metrics.psnr, ssim: metrics.ssim },
      });
    } catch (err: any) {
      console.error('Restoration error:', err);
      alert(err.message || 'Restoration failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetLab = () => {
    setDegradedImage(null);
    setRestoredImage(null);
    setNoisyMetrics(null);
    setRestoredMetrics(null);
    setActiveStep('degrade');
  };

  return (
    <div className="space-y-6">
      {/* Workflow Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveStep('degrade')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeStep === 'degrade'
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            Step 1: Degradation (Noise Model)
          </button>
          <button
            onClick={() => setActiveStep('restore')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeStep === 'restore'
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            Step 2: Restoration & Denoise
          </button>
        </div>

        <button
          onClick={handleResetLab}
          className="text-xs font-mono text-muted hover:text-primary flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset State</span>
        </button>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Comparison Viewer */}
        <div className="lg:col-span-2 space-y-4">
          <ComparisonViewer
            originalUrl={
              activeStep === 'restore' && degradedImage
                ? degradedImage.processed_image_base64
                : activeImage.dataUrl
            }
            processedUrl={
              activeStep === 'restore' && restoredImage
                ? restoredImage.processed_image_base64
                : degradedImage?.processed_image_base64
            }
            originalLabel={
              activeStep === 'restore' && degradedImage
                ? 'Before (Noisy)'
                : 'Original Image'
            }
            processedLabel={
              activeStep === 'restore' && restoredImage
                ? `After (${filterType})`
                : degradedImage
                ? `Simulated Noise (${noiseType})`
                : 'Noisy Simulation'
            }
            width={activeImage.width}
            height={activeImage.height}
            isProcessing={isProcessing}
          />

          {/* Quantitative Fidelity Metrics Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-border bg-surface shadow-xs">
            {/* MSE Metric */}
            <div className="p-3 rounded-lg bg-elevated border border-border">
              <span className="text-[10px] font-mono text-muted uppercase block">Mean Squared Error</span>
              <span className="text-base font-bold font-mono text-primary mt-1 block">
                {restoredMetrics ? restoredMetrics.mse : noisyMetrics ? noisyMetrics.mse : '0.00'}
              </span>
              <span className="text-[10px] text-muted block mt-0.5">
                {restoredMetrics ? 'vs Clean Reference' : 'Baseline'}
              </span>
            </div>

            {/* PSNR Metric */}
            <div className="p-3 rounded-lg bg-elevated border border-border">
              <span className="text-[10px] font-mono text-muted uppercase block">Peak SNR (PSNR)</span>
              <span className="text-base font-bold font-mono text-accent mt-1 block">
                {restoredMetrics ? `${restoredMetrics.psnr} dB` : noisyMetrics ? `${noisyMetrics.psnr} dB` : '∞ dB'}
              </span>
              <span className="text-[10px] text-muted block mt-0.5">Higher = Superior Fidelity</span>
            </div>

            {/* SSIM Metric */}
            <div className="p-3 rounded-lg bg-elevated border border-border">
              <span className="text-[10px] font-mono text-muted uppercase block">Structural Index (SSIM)</span>
              <span className="text-base font-bold font-mono text-success mt-1 block">
                {restoredMetrics ? restoredMetrics.ssim : noisyMetrics ? noisyMetrics.ssim : '1.000'}
              </span>
              <span className="text-[10px] text-muted block mt-0.5">Range [0, 1]</span>
            </div>

            {/* MAE Metric */}
            <div className="p-3 rounded-lg bg-elevated border border-border">
              <span className="text-[10px] font-mono text-muted uppercase block">Mean Absolute Error</span>
              <span className="text-base font-bold font-mono text-primary mt-1 block">
                {restoredMetrics ? restoredMetrics.mae : noisyMetrics ? noisyMetrics.mae : '0.00'}
              </span>
              <span className="text-[10px] text-muted block mt-0.5">Average pixel deviation</span>
            </div>

            {/* Interpretation Banner */}
            {(restoredMetrics || noisyMetrics) && (
              <div className="col-span-2 sm:col-span-4 p-2.5 rounded-lg bg-accent/10 border border-accent/25 text-xs text-primary flex items-center justify-between">
                <span className="font-medium">
                  {restoredMetrics
                    ? restoredMetrics.interpretation
                    : 'Degraded noise injected. Apply a restoration filter to evaluate error reduction.'}
                </span>
                {restoredMetrics && noisyMetrics && (
                  <span className="font-mono text-[11px] text-accent font-semibold ml-2">
                    Δ PSNR: +{(restoredMetrics.psnr - noisyMetrics.psnr).toFixed(2)} dB
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Controls & Theory */}
        <div className="space-y-4">
          {activeStep === 'degrade' ? (
            /* Step 1: Noise Injection Panel */
            <div className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <AlertTriangle className="w-4 h-4 text-accent" />
                <h3 className="text-xs font-semibold text-primary uppercase font-mono tracking-wider">
                  Step 1: Noise Degradation Model
                </h3>
              </div>

              <div>
                <label className="block text-xs font-mono text-secondary mb-1">Noise Distribution:</label>
                <select
                  value={noiseType}
                  onChange={(e) => setNoiseType(e.target.value as any)}
                  className="w-full text-xs font-mono bg-elevated border border-border rounded px-2.5 py-1.5 text-primary"
                >
                  <option value="salt_and_pepper">Salt & Pepper (Bipolar Impulse Noise)</option>
                  <option value="gaussian">Gaussian Noise (Additive Thermal/Sensor)</option>
                  <option value="speckle">Speckle Noise (Multiplicative Scattering)</option>
                </select>
              </div>

              {noiseType === 'salt_and_pepper' ? (
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-secondary">Impulse Probability (p):</span>
                    <span className="text-accent font-bold">{(noiseAmount * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.30"
                    step="0.01"
                    value={noiseAmount}
                    onChange={(e) => setNoiseAmount(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-muted mt-1">
                    <span>1% (Sparse)</span>
                    <span>10%</span>
                    <span>30% (Dense corruption)</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-secondary">Standard Deviation (σ):</span>
                    <span className="text-accent font-bold">{noiseStd.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="1"
                    value={noiseStd}
                    onChange={(e) => setNoiseStd(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              <button
                onClick={handleSimulateNoise}
                disabled={isProcessing}
                className="w-full py-2.5 rounded-lg bg-accent text-surface text-xs font-semibold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                    <span>Corrupting Image Matrix...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Inject Simulated Noise</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Step 2: Denoising Restoration Panel */
            <div className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <Wrench className="w-4 h-4 text-accent" />
                <h3 className="text-xs font-semibold text-primary uppercase font-mono tracking-wider">
                  Step 2: Restoration Filter
                </h3>
              </div>

              <div>
                <label className="block text-xs font-mono text-secondary mb-1">Restoration Filter:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full text-xs font-mono bg-elevated border border-border rounded px-2.5 py-1.5 text-primary"
                >
                  <option value="median">Median Filter (Order-statistics - Best for Salt & Pepper)</option>
                  <option value="arithmetic_mean">Arithmetic Mean Filter (Linear Box)</option>
                  <option value="gaussian">Gaussian Filter (Radial smoothing)</option>
                  <option value="bilateral">Bilateral Filter (Edge-preserving)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-secondary">Window Size (NxN):</span>
                  <span className="text-accent font-bold">{kernelSize}×{kernelSize}</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="11"
                  step="2"
                  value={kernelSize}
                  onChange={(e) => setKernelSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <button
                onClick={handleApplyRestoration}
                disabled={isProcessing}
                className="w-full py-2.5 rounded-lg bg-accent text-surface text-xs font-semibold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                    <span>Applying Restoration Filter...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Apply Restoration</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Technical Principles & Insights */}
          <ConceptCard
            category="Degradation Model"
            title="Image Degradation Framework & Noise Modeling"
            formula="g(x, y) = f(x, y) * h(x, y) + \eta(x, y) \iff G(u, v) = F(u, v)H(u, v) + N(u, v)"
            explanation="Image restoration attempts to reconstruct an approximation of an original image f from a degraded observation g. Unlike image enhancement (which is heuristic and subjective), restoration models the degradation function h (PSF) and noise distribution eta mathematically to minimize objective error criteria."
            defaultOpen={true}
          />

          <ConceptCard
            category="Noise Reduction"
            title="Median vs Linear Mean Filter"
            formula="\hat{f}(x, y) = \text{median}_{(s,t) \in S_{xy}} \{g(s, t)\}"
            explanation="The median filter is a non-linear order-statistics filter. For impulse (salt & pepper) noise, corrupted pixels take isolated extreme values (0 or 255). When neighborhood pixels are ranked in ascending order, extreme outliers are pushed to the extremes of the sorted list and are virtually never selected as the median."
            insightQuestion="Why does an arithmetic mean filter fail on salt-and-pepper noise?"
            insightAnswer="Linear averaging computes sum(pixels)/N. An isolated impulse spike (e.g. value 255) pulls the entire average upward, converting sharp black/white dots into blurred gray smudges. The median filter eliminates outliers completely while preserving sharp boundaries."
            defaultOpen={true}
          />

          <ConceptCard
            category="Fidelity Metrics"
            title="Objective Quality Criteria: MSE and PSNR"
            formula="\text{MSE} = \frac{1}{MN}\sum_{x=0}^{M-1}\sum_{y=0}^{N-1}[f(x, y) - \hat{f}(x, y)]^2, \quad \text{PSNR} = 10\log_{10}\left(\frac{255^2}{\text{MSE}}\right)"
            explanation="Peak Signal-to-Noise Ratio (PSNR) measures reconstruction fidelity in decibels (dB). While high PSNR generally correlates with lower error, it assesses pixel-by-pixel squared differences and can fail to capture perceptual structural fidelity (which is why SSIM is also measured)."
            insightQuestion="What are the limitations of MSE and PSNR in evaluating restored image quality?"
            insightAnswer="MSE and PSNR compute pixel-wise intensity differences without considering human visual perception (HVS) factors such as structural correlation, luminance masking, or contrast sensitivity. This is why Structural Similarity Index (SSIM) is used alongside PSNR."
            defaultOpen={false}
          />
        </div>
      </div>
    </div>
  );
};
