import React, { useState } from 'react';
import { useImage } from '../contexts/ImageContext';
import { api } from '../services/api';
import type { ProcessingResponse, FFTResponse } from '../types';
import { ComparisonViewer } from '../components/image/ComparisonViewer';
import { KernelGrid } from '../components/image/KernelGrid';
import { ConceptCard } from '../components/common/ConceptCard';
import {
  Filter,
  Sliders,
  Zap,
} from 'lucide-react';

export const FilteringPlaygroundPage: React.FC = () => {
  const { activeImage, addHistoryEntry } = useImage();

  // Mode: 'smoothing' | 'sharpening' | 'kernel' | 'gradient' | 'laplacian' | 'frequency'
  const [filterMode, setFilterMode] = useState<
    'smoothing' | 'sharpening' | 'kernel' | 'gradient' | 'laplacian' | 'frequency'
  >('kernel');

  // Smoothing params
  const [smoothType, setSmoothType] = useState<'gaussian' | 'mean'>('gaussian');
  const [smoothKSize, setSmoothKSize] = useState<number>(5);
  const [smoothSigma, setSmoothSigma] = useState<number>(1.5);

  // Sharpening params
  const [sharpMethod, setSharpMethod] = useState<'unsharp_mask' | 'laplacian'>('unsharp_mask');
  const [sharpStrength, setSharpStrength] = useState<number>(1.5);
  const [sharpKSize, setSharpKSize] = useState<number>(5);

  // Custom Kernel params
  const [customKernel, setCustomKernel] = useState<number[][]>([
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0],
  ]);
  const [kernelOp, setKernelOp] = useState<'convolution' | 'correlation'>('convolution');
  const [kernelPad, setKernelPad] = useState<'replicate' | 'reflect' | 'constant'>('replicate');
  const [kernelNorm, setKernelNorm] = useState<boolean>(false);

  // Gradient params
  const [gradOp, setGradOp] = useState<'sobel' | 'scharr' | 'prewitt'>('sobel');
  const [gradDir, setGradDir] = useState<'magnitude' | 'x' | 'y'>('magnitude');
  const [gradThreshold, setGradThreshold] = useState<number | undefined>(undefined);

  // Laplacian params
  const [lapKernel, setLapKernel] = useState<'4_neighbor' | '8_neighbor'>('8_neighbor');
  const [lapMode, setLapMode] = useState<'sharpened' | 'raw'>('sharpened');
  const [lapStrength, setLapStrength] = useState<number>(1.0);

  // Frequency Domain params
  const [freqFilterType, setFreqFilterType] = useState<string>('gaussian_lowpass');
  const [freqCutoff, setFreqCutoff] = useState<number>(40);
  const [fftData, setFftData] = useState<FFTResponse | null>(null);

  // Processing state
  const [result, setResult] = useState<ProcessingResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!activeImage) {
    return (
      <div className="p-12 text-center rounded-2xl border border-border bg-surface text-muted">
        <Filter className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <h3 className="text-base font-semibold text-primary">No Image Loaded</h3>
        <p className="text-xs mt-1">Please upload an image or choose a sample to use Filters.</p>
      </div>
    );
  }

  const handleApplyFilter = async () => {
    setIsProcessing(true);
    try {
      let res: ProcessingResponse;

      if (filterMode === 'smoothing') {
        res = await api.applySmoothing(activeImage.id, smoothType, smoothKSize, smoothSigma);
      } else if (filterMode === 'sharpening') {
        res = await api.applySharpening(activeImage.id, sharpMethod, sharpStrength, sharpKSize);
      } else if (filterMode === 'kernel') {
        res = await api.applyConvolution(activeImage.id, customKernel, kernelOp, kernelPad, kernelNorm);
      } else if (filterMode === 'gradient') {
        res = await api.applyGradient(activeImage.id, gradOp, gradDir, gradThreshold);
      } else if (filterMode === 'laplacian') {
        res = await api.applyLaplacian(activeImage.id, lapKernel, lapMode, lapStrength);
      } else {
        // Frequency domain
        res = await api.filterFrequency(activeImage.id, freqFilterType, freqCutoff, 2);
      }

      setResult(res);

      addHistoryEntry({
        operationName: res.operation,
        parameters: res.parameters,
        inputImageId: activeImage.id,
        outputImageId: res.image_id,
        outputImageBase64: res.processed_image_base64,
        explanation: res.explanation,
      });
    } catch (err: any) {
      console.error('Filtering error:', err);
      alert(err.message || 'Operation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComputeFFT = async () => {
    setIsProcessing(true);
    try {
      const data = await api.computeFFT(activeImage.id);
      setFftData(data);
    } catch (err: any) {
      console.error('FFT calculation failed:', err);
      alert(err.message || 'FFT calculation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtering Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilterMode('kernel')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              filterMode === 'kernel'
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            Kernel Explorer
          </button>
          <button
            onClick={() => setFilterMode('smoothing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              filterMode === 'smoothing'
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            Smoothing (Lowpass)
          </button>
          <button
            onClick={() => setFilterMode('sharpening')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              filterMode === 'sharpening'
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            Sharpening (Highpass)
          </button>
          <button
            onClick={() => setFilterMode('gradient')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              filterMode === 'gradient'
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            Sobel Gradient (1st Deriv)
          </button>
          <button
            onClick={() => setFilterMode('laplacian')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              filterMode === 'laplacian'
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            Laplacian (2nd Deriv)
          </button>
          <button
            onClick={() => {
              setFilterMode('frequency');
              if (!fftData) handleComputeFFT();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              filterMode === 'frequency'
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            2D Frequency Domain
          </button>
        </div>

        <span className="text-xs font-mono text-muted hidden sm:inline">Spatial & Frequency Filters</span>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Comparison Viewer */}
        <div className="lg:col-span-2 space-y-4">
          <ComparisonViewer
            originalUrl={activeImage.dataUrl}
            processedUrl={result?.processed_image_base64}
            originalLabel="Before"
            processedLabel={result ? result.operation : 'After'}
            width={activeImage.width}
            height={activeImage.height}
            isProcessing={isProcessing}
          />

          {/* Frequency Spectrum Card when in frequency mode */}
          {filterMode === 'frequency' && fftData && (
            <div className="p-4 rounded-xl border border-border bg-surface shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border text-xs">
                <span className="font-mono text-primary font-semibold uppercase">2D FFT Spectra Visualizer</span>
                <span className="font-mono text-[11px] text-muted">Centered at DC (u=0, v=0)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 text-center">
                  <span className="text-xs font-mono text-secondary">Log Magnitude Spectrum |F(u,v)|</span>
                  <div className="rounded border border-border overflow-hidden bg-black/40 p-1 flex items-center justify-center min-h-[180px]">
                    <img
                      src={fftData.magnitude_spectrum_base64}
                      alt="Log Magnitude Spectrum"
                      className="max-h-48 object-contain"
                    />
                  </div>
                </div>
                <div className="space-y-1 text-center">
                  <span className="text-xs font-mono text-secondary">Phase Angle Spectrum θ(u,v)</span>
                  <div className="rounded border border-border overflow-hidden bg-black/40 p-1 flex items-center justify-center min-h-[180px]">
                    <img
                      src={fftData.phase_spectrum_base64}
                      alt="Phase Angle Spectrum"
                      className="max-h-48 object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Controls & Concept Explanations */}
        <div className="space-y-4">
          {filterMode === 'kernel' ? (
            /* Custom Kernel Grid Control */
            <KernelGrid
              kernel={customKernel}
              onChange={setCustomKernel}
              operation={kernelOp}
              onOperationChange={setKernelOp}
              paddingMode={kernelPad}
              onPaddingModeChange={setKernelPad}
              normalize={kernelNorm}
              onNormalizeChange={setKernelNorm}
              onApply={handleApplyFilter}
              isLoading={isProcessing}
            />
          ) : (
            /* Dedicated Parameter Panel for other filters */
            <div className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-semibold text-primary uppercase font-mono tracking-wider">
                    {filterMode.toUpperCase()} Parameters
                  </h3>
                </div>
              </div>

              {filterMode === 'smoothing' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-mono text-secondary mb-1">Filter Algorithm:</label>
                    <select
                      value={smoothType}
                      onChange={(e) => setSmoothType(e.target.value as any)}
                      className="w-full text-xs font-mono bg-elevated border border-border rounded px-2.5 py-1.5 text-primary"
                    >
                      <option value="gaussian">Gaussian Filter (Radial decay)</option>
                      <option value="mean">Box / Arithmetic Mean Filter</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-secondary">Kernel Size (Odd NxN):</span>
                      <span className="text-accent font-bold">{smoothKSize}×{smoothKSize}</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="15"
                      step="2"
                      value={smoothKSize}
                      onChange={(e) => setSmoothKSize(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  {smoothType === 'gaussian' && (
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-secondary">Sigma (σ):</span>
                        <span className="text-accent font-bold">{smoothSigma.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="5.0"
                        step="0.1"
                        value={smoothSigma}
                        onChange={(e) => setSmoothSigma(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}

              {filterMode === 'sharpening' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-mono text-secondary mb-1">Sharpening Technique:</label>
                    <select
                      value={sharpMethod}
                      onChange={(e) => setSharpMethod(e.target.value as any)}
                      className="w-full text-xs font-mono bg-elevated border border-border rounded px-2.5 py-1.5 text-primary"
                    >
                      <option value="unsharp_mask">Unsharp Masking: f + k*(f - f_blur)</option>
                      <option value="laplacian">Laplacian High-Boost Sharpening</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-secondary">Weight Strength (k):</span>
                      <span className="text-accent font-bold">{sharpStrength.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="4.0"
                      step="0.1"
                      value={sharpStrength}
                      onChange={(e) => setSharpStrength(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  {sharpMethod === 'unsharp_mask' && (
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-secondary">Blur Mask Kernel Size:</span>
                        <span className="text-primary font-bold">{sharpKSize}×{sharpKSize}</span>
                      </div>
                      <input
                        type="range"
                        min="3"
                        max="11"
                        step="2"
                        value={sharpKSize}
                        onChange={(e) => setSharpKSize(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}

              {filterMode === 'gradient' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-mono text-secondary mb-1">Gradient Operator:</label>
                    <select
                      value={gradOp}
                      onChange={(e) => setGradOp(e.target.value as any)}
                      className="w-full text-xs font-mono bg-elevated border border-border rounded px-2.5 py-1.5 text-primary"
                    >
                      <option value="sobel">Sobel Operator (3x3 weighted)</option>
                      <option value="prewitt">Prewitt Operator (3x3 uniform)</option>
                      <option value="scharr">Scharr Operator (Angular accuracy)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-secondary mb-1">Direction:</label>
                    <div className="grid grid-cols-3 gap-1 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => setGradDir('magnitude')}
                        className={`py-1 rounded border transition-colors ${
                          gradDir === 'magnitude'
                            ? 'bg-accent text-surface border-accent font-bold'
                            : 'bg-elevated border-border text-muted'
                        }`}
                      >
                        |∇f| Mag
                      </button>
                      <button
                        type="button"
                        onClick={() => setGradDir('x')}
                        className={`py-1 rounded border transition-colors ${
                          gradDir === 'x'
                            ? 'bg-accent text-surface border-accent font-bold'
                            : 'bg-elevated border-border text-muted'
                        }`}
                      >
                        Gx (Horiz)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGradDir('y')}
                        className={`py-1 rounded border transition-colors ${
                          gradDir === 'y'
                            ? 'bg-accent text-surface border-accent font-bold'
                            : 'bg-elevated border-border text-muted'
                        }`}
                      >
                        Gy (Vert)
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-secondary">Threshold Binarization:</span>
                      <span className="text-primary">{gradThreshold !== undefined ? `${gradThreshold}` : 'Off (Full Range)'}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="5"
                      value={gradThreshold ?? 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setGradThreshold(val > 0 ? val : undefined);
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {filterMode === 'laplacian' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-mono text-secondary mb-1">Kernel Neighborhood:</label>
                    <select
                      value={lapKernel}
                      onChange={(e) => setLapKernel(e.target.value as any)}
                      className="w-full text-xs font-mono bg-elevated border border-border rounded px-2.5 py-1.5 text-primary"
                    >
                      <option value="8_neighbor">8-Neighbor (Isotropic with diagonals)</option>
                      <option value="4_neighbor">4-Neighbor (Cross operator)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-secondary mb-1">Output Mode:</label>
                    <div className="grid grid-cols-2 gap-1 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => setLapMode('sharpened')}
                        className={`py-1 rounded border transition-colors ${
                          lapMode === 'sharpened'
                            ? 'bg-accent text-surface border-accent font-bold'
                            : 'bg-elevated border-border text-muted'
                        }`}
                      >
                        Sharpened (f - ∇²f)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLapMode('raw')}
                        className={`py-1 rounded border transition-colors ${
                          lapMode === 'raw'
                            ? 'bg-accent text-surface border-accent font-bold'
                            : 'bg-elevated border-border text-muted'
                        }`}
                      >
                        Raw ∇²f (Zero=128)
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-secondary">Operator Strength:</span>
                      <span className="text-accent font-bold">{lapStrength.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.1"
                      value={lapStrength}
                      onChange={(e) => setLapStrength(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {filterMode === 'frequency' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-mono text-secondary mb-1">Frequency Filter Model:</label>
                    <select
                      value={freqFilterType}
                      onChange={(e) => setFreqFilterType(e.target.value)}
                      className="w-full text-xs font-mono bg-elevated border border-border rounded px-2.5 py-1.5 text-primary"
                    >
                      <option value="gaussian_lowpass">Gaussian Lowpass (Smooth attenuation)</option>
                      <option value="gaussian_highpass">Gaussian Highpass (Edge extraction)</option>
                      <option value="ideal_lowpass">Ideal Lowpass (Sharp cutoff / Ringing)</option>
                      <option value="butterworth_lowpass">Butterworth Lowpass (Order n=2)</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-secondary">Cutoff Radius (D0):</span>
                      <span className="text-accent font-bold">{freqCutoff} px</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="150"
                      value={freqCutoff}
                      onChange={(e) => setFreqCutoff(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleApplyFilter}
                disabled={isProcessing}
                className="w-full py-2.5 rounded-lg bg-accent text-surface text-xs font-semibold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                    <span>Processing Filtering...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Apply Filter</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Technical Concept Cards */}
          {filterMode === 'kernel' && (
            <ConceptCard
              category="Convolution"
              title="Convolution vs Correlation & Padding"
              formula="g(x, y) = \sum_{s=-a}^{a} \sum_{t=-b}^{b} w(s, t) f(x - s, y - t)"
              explanation="In 2D spatial convolution, the kernel matrix w is rotated 180° prior to sliding across the image. In correlation, the kernel is applied directly without rotation. When the kernel is symmetric (e.g. Gaussian or Box blur), convolution and correlation yield identical results."
              insightQuestion="What is the mathematical difference between convolution and correlation?"
              insightAnswer="Convolution involves flipping the filter mask 180 degrees (both horizontally and vertically) before computing the inner product sum. Correlation slides the mask without flipping."
              defaultOpen={true}
            />
          )}

          {filterMode === 'smoothing' && (
            <ConceptCard
              category="Smoothing"
              title="Spatial Domain Smoothing Filters"
              formula="G(x, y) = \frac{1}{2\pi\sigma^2} \exp\left(-\frac{x^2 + y^2}{2\sigma^2}\right)"
              explanation="Smoothing attenuates high-frequency spatial transitions (fine noise and sharp edges) by replacing each pixel with a weighted neighborhood average. Gaussian smoothing provides a radially symmetric frequency response without sharp corners."
              defaultOpen={true}
            />
          )}

          {filterMode === 'sharpening' && (
            <ConceptCard
              category="Sharpening"
              title="Unsharp Masking & High-Boost Filtering"
              formula="g_{mask}(x, y) = f(x, y) - \bar{f}(x, y) \implies f_{sharp} = f + k \cdot g_{mask}"
              explanation="Unsharp masking subtracts a smoothed version of the image from the original to generate an unsharp mask isolating high-frequency detail. The mask is multiplied by strength factor k and added back to restore crisp edge transitions."
              defaultOpen={true}
            />
          )}

          {filterMode === 'gradient' && (
            <ConceptCard
              category="Edge Gradients"
              title="First-Order Gradient & Sobel Operators"
              formula="\nabla f = \begin{bmatrix} G_x \\ G_y \end{bmatrix}, \quad M(x, y) = \sqrt{G_x^2 + G_y^2}, \quad \alpha(x, y) = \arctan(G_y / G_x)"
              explanation="The gradient vector points in the direction of maximum intensity increase. The magnitude M(x, y) indicates edge strength, while alpha(x, y) gives the edge normal angle. Sobel operators incorporate a weight of 2 on center pixels for noise suppression."
              defaultOpen={true}
            />
          )}

          {filterMode === 'laplacian' && (
            <ConceptCard
              category="Derivatives"
              title="Second-Order Derivative (Laplacian)"
              formula="\nabla^2 f = \frac{\partial^2 f}{\partial x^2} + \frac{\partial^2 f}{\partial y^2}"
              explanation="The Laplacian is an isotropic (rotation-invariant) linear operator. Its zero-crossings locate edges precisely with double-response transitions. Raw Laplacian outputs are centered at baseline 128 to visualize both positive concavity and negative transitions."
              defaultOpen={true}
            />
          )}

          {filterMode === 'frequency' && (
            <ConceptCard
              category="Frequency Domain"
              title="2D Fast Fourier Transform & Frequency Filtering"
              formula="G(u, v) = H(u, v) \cdot F(u, v) \iff g(x, y) = h(x, y) * f(x, y)"
              explanation="By the Convolution Theorem, spatial convolution corresponds to pointwise multiplication in the frequency domain. Centered FFT magnitude spectra place low frequencies at the center and high frequencies radiating outward. Ideal filters produce Gibbs ringing, whereas Gaussian filters exhibit smooth, ringing-free rolloff."
              insightQuestion="What causes the ringing artifacts in ideal frequency filters?"
              insightAnswer="The sharp discontinuity of the ideal rectangular frequency cutoff. In the spatial domain, its inverse Fourier transform is a 2D sinc function J1(r)/r with oscillating sidelobes (Gibbs phenomenon)."
              defaultOpen={true}
            />
          )}
        </div>
      </div>
    </div>
  );
};
