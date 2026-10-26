import React, { useState } from 'react';
import { useImage } from '../contexts/ImageContext';
import { api } from '../services/api';
import type { ProcessingResponse } from '../types';
import { ComparisonViewer } from '../components/image/ComparisonViewer';
import { HistogramChart } from '../components/image/HistogramChart';
import { ConceptCard } from '../components/common/ConceptCard';
import {
  Sliders,
  RotateCcw,
  Zap,
  BarChart3
} from 'lucide-react';

export const EnhancementLabPage: React.FC = () => {
  const { activeImage, addHistoryEntry } = useImage();

  // Operation Tab: 'brightness' | 'contrast' | 'stretch' | 'gamma' | 'hist_eq' | 'grayscale'
  const [opType, setOpType] = useState<
    'brightness' | 'contrast' | 'stretch' | 'gamma' | 'hist_eq' | 'grayscale'
  >('stretch');

  // Parameter states
  const [brightnessDelta, setBrightnessDelta] = useState<number>(30);
  const [contrastAlpha, setContrastAlpha] = useState<number>(1.4);
  const [contrastBeta, setContrastBeta] = useState<number>(0);
  const [stretchAuto, setStretchAuto] = useState<boolean>(true);
  const [stretchRMin, setStretchRMin] = useState<number>(50);
  const [stretchRMax, setStretchRMax] = useState<number>(200);
  const [gammaVal, setGammaVal] = useState<number>(0.6);
  const [histEqMethod, setHistEqMethod] = useState<'preserve_color' | 'grayscale'>('preserve_color');
  const [grayFormula, setGrayFormula] = useState<'luminance' | 'average'>('luminance');

  // Processing state
  const [result, setResult] = useState<ProcessingResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showHistograms, setShowHistograms] = useState<boolean>(true);

  if (!activeImage) {
    return (
      <div className="p-12 text-center rounded-2xl border border-border bg-surface text-muted">
        <Sliders className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <h3 className="text-base font-semibold text-primary">No Image Loaded</h3>
        <p className="text-xs mt-1">Please upload an image or choose a sample to use Enhance.</p>
      </div>
    );
  }

  const handleApply = async () => {
    setIsProcessing(true);
    try {
      let res: ProcessingResponse;
      if (opType === 'brightness') {
        res = await api.adjustBrightness(activeImage.id, brightnessDelta);
      } else if (opType === 'contrast') {
        res = await api.adjustContrast(activeImage.id, contrastAlpha, contrastBeta);
      } else if (opType === 'stretch') {
        res = await api.stretchContrast(
          activeImage.id,
          stretchAuto,
          stretchAuto ? undefined : stretchRMin,
          stretchAuto ? undefined : stretchRMax
        );
      } else if (opType === 'gamma') {
        res = await api.applyGamma(activeImage.id, gammaVal);
      } else if (opType === 'hist_eq') {
        res = await api.equalizeHistogram(activeImage.id, histEqMethod);
      } else {
        res = await api.convertToGrayscale(activeImage.id, grayFormula);
      }

      setResult(res);

      // Record in Session History
      addHistoryEntry({
        operationName: res.operation,
        parameters: res.parameters,
        inputImageId: activeImage.id,
        outputImageId: res.image_id,
        outputImageBase64: res.processed_image_base64,
        explanation: res.explanation,
      });
    } catch (err: any) {
      console.error('Enhancement error:', err);
      alert(err.message || 'Operation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setBrightnessDelta(30);
    setContrastAlpha(1.4);
    setContrastBeta(0);
    setStretchAuto(true);
    setGammaVal(0.6);
  };

  return (
    <div className="space-y-6">
      {/* Operation Selection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setOpType('stretch')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              opType === 'stretch'
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            Contrast Stretching
          </button>
          <button
            onClick={() => setOpType('hist_eq')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              opType === 'hist_eq'
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            Histogram Equalization
          </button>
          <button
            onClick={() => setOpType('brightness')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              opType === 'brightness'
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            Brightness Shift
          </button>
          <button
            onClick={() => setOpType('contrast')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              opType === 'contrast'
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            Linear Contrast Scale
          </button>
          <button
            onClick={() => setOpType('gamma')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              opType === 'gamma'
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            Power-Law (Gamma)
          </button>
          <button
            onClick={() => setOpType('grayscale')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              opType === 'grayscale'
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            Grayscale Models
          </button>
        </div>

        <button
          onClick={() => setShowHistograms(!showHistograms)}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors ${
            showHistograms
              ? 'bg-elevated border-accent/40 text-accent font-medium'
              : 'border-border text-muted hover:text-secondary'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>{showHistograms ? 'Hide Histograms' : 'Compare Histograms'}</span>
        </button>
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

          {/* Before & After Dual Histograms */}
          {showHistograms && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HistogramChart
                histogram={activeImage.analysis?.histogram}
                channelStats={activeImage.analysis?.channel_stats}
                title="Before (Histogram)"
              />
              <HistogramChart
                histogram={result?.histogram || activeImage.analysis?.histogram}
                title={result ? "After (Histogram)" : "After (Awaiting Apply)"}
              />
            </div>
          )}
        </div>

        {/* Right Col: Interactive Control Panel & Theory Card */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-accent" />
                <h3 className="text-xs font-semibold text-primary uppercase font-mono tracking-wider">
                  Enhancement Controls
                </h3>
              </div>
              <button
                onClick={handleReset}
                title="Reset parameters"
                className="text-xs font-mono text-muted hover:text-primary flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Dynamic Controls based on selected opType */}
            {opType === 'stretch' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary">Auto Min/Max (1% tail clip):</span>
                  <input
                    type="checkbox"
                    checked={stretchAuto}
                    onChange={(e) => setStretchAuto(e.target.checked)}
                    className="rounded border-border text-accent focus:ring-accent"
                  />
                </div>
                {!stretchAuto && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-muted">Lower Cutoff (r_min):</span>
                        <span className="text-primary font-bold">{stretchRMin}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={stretchRMin}
                        onChange={(e) => setStretchRMin(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-muted">Upper Cutoff (r_max):</span>
                        <span className="text-primary font-bold">{stretchRMax}</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="255"
                        value={stretchRMax}
                        onChange={(e) => setStretchRMax(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {opType === 'hist_eq' && (
              <div className="space-y-3 text-xs">
                <label className="block text-secondary font-mono">Equalization Strategy:</label>
                <div className="space-y-2 font-mono">
                  <label className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-elevated cursor-pointer">
                    <input
                      type="radio"
                      name="eq_method"
                      value="preserve_color"
                      checked={histEqMethod === 'preserve_color'}
                      onChange={() => setHistEqMethod('preserve_color')}
                      className="mt-0.5 text-accent"
                    />
                    <div>
                      <span className="font-semibold text-primary block">Color-Preserving (YCrCb Luminance)</span>
                      <span className="text-[11px] text-muted block leading-tight">
                        Equalizes luminance Y while preserving chrominance color channels.
                      </span>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-elevated cursor-pointer">
                    <input
                      type="radio"
                      name="eq_method"
                      value="grayscale"
                      checked={histEqMethod === 'grayscale'}
                      onChange={() => setHistEqMethod('grayscale')}
                      className="mt-0.5 text-accent"
                    />
                    <div>
                      <span className="font-semibold text-primary block">Grayscale Direct Equalization</span>
                      <span className="text-[11px] text-muted block leading-tight">
                        Converts image to monochrome and flattens cumulative histogram.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {opType === 'brightness' && (
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-secondary">Brightness Offset (Δb):</span>
                  <span className="text-accent font-bold">{brightnessDelta > 0 ? `+${brightnessDelta}` : brightnessDelta}</span>
                </div>
                <input
                  type="range"
                  min="-120"
                  max="120"
                  value={brightnessDelta}
                  onChange={(e) => setBrightnessDelta(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] font-mono text-muted">
                  <span>-120 (Darken)</span>
                  <span>0</span>
                  <span>+120 (Brighten)</span>
                </div>
              </div>
            )}

            {opType === 'contrast' && (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-secondary">Gain Alpha (α):</span>
                    <span className="text-accent font-bold">{contrastAlpha.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.05"
                    value={contrastAlpha}
                    onChange={(e) => setContrastAlpha(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-secondary">Bias Beta (β):</span>
                    <span className="text-primary font-bold">{contrastBeta}</span>
                  </div>
                  <input
                    type="range"
                    min="-80"
                    max="80"
                    value={contrastBeta}
                    onChange={(e) => setContrastBeta(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {opType === 'gamma' && (
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-secondary">Gamma Value (γ):</span>
                  <span className="text-accent font-bold">{gammaVal.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.05"
                  value={gammaVal}
                  onChange={(e) => setGammaVal(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] font-mono text-muted">
                  <span>γ &lt; 1 (Shadows Brightened)</span>
                  <span>γ = 1.0</span>
                  <span>γ &gt; 1 (Highlights Compressed)</span>
                </div>
              </div>
            )}

            {opType === 'grayscale' && (
              <div className="space-y-3 text-xs font-mono">
                <label className="block text-secondary">Weighting Model:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2 rounded bg-elevated border border-border cursor-pointer">
                    <input
                      type="radio"
                      name="gray_formula"
                      value="luminance"
                      checked={grayFormula === 'luminance'}
                      onChange={() => setGrayFormula('luminance')}
                      className="text-accent"
                    />
                    <span>ITU-R BT.601: 0.299R + 0.587G + 0.114B</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded bg-elevated border border-border cursor-pointer">
                    <input
                      type="radio"
                      name="gray_formula"
                      value="average"
                      checked={grayFormula === 'average'}
                      onChange={() => setGrayFormula('average')}
                      className="text-accent"
                    />
                    <span>Unweighted Average: (R + G + B) / 3</span>
                  </label>
                </div>
              </div>
            )}

            {/* Execute Button */}
            <button
              onClick={handleApply}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-lg bg-accent text-surface text-xs font-semibold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                  <span>Computing Pixel Transformation...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Apply Enhancement</span>
                </>
              )}
            </button>
          </div>

          {/* Dynamic Concept Cards */}
          {opType === 'stretch' && (
            <ConceptCard
              category="Contrast"
              title="Contrast Stretching (Min-Max Normalization)"
              formula="s = \frac{r - r_{min}}{r_{max} - r_{min}} \times 255"
              explanation="Contrast stretching is a point-processing transformation that linearly expands the dynamic range of an image whose pixel intensities are compressed into a narrow span. Unlike histogram equalization, it preserves the relative intensity ordering and proportional relationships among pixels."
              insightQuestion="What is the key difference between contrast stretching and histogram equalization?"
              insightAnswer="Contrast stretching is a linear scaling transformation that expands a narrow dynamic range to [0, 255]. Histogram equalization is non-linear and redistributes intensities based on cumulative probability, seeking a flat histogram."
              defaultOpen={true}
            />
          )}

          {opType === 'hist_eq' && (
            <ConceptCard
              category="Histograms"
              title="Histogram Equalization & Cumulative Distribution"
              formula="s_k = T(r_k) = (L - 1) \sum_{j=0}^{k} p_r(r_j) = \frac{(L - 1)}{MN} \sum_{j=0}^{k} n_j"
              explanation="Histogram equalization maps input intensities to output values using the Cumulative Distribution Function (CDF) as a transformation function T(r). For color images, directly equalizing R, G, and B separately distorts color ratios; transforming to YCrCb or LAB and equalizing luminance only maintains natural chromaticity."
              insightQuestion="Why does equalizing R, G, and B channels independently produce unnatural colors?"
              insightAnswer="Independent RGB equalization alters the hue and saturation ratios among channels. Operating in YCrCb or LAB decouples luminance from chrominance, enhancing contrast while keeping color relationships intact."
              defaultOpen={true}
            />
          )}

          {opType === 'gamma' && (
            <ConceptCard
              category="Gamma Correction"
              title="Power-Law (Gamma) Transformations"
              formula="s = c \cdot r^\gamma"
              explanation="Power-law transformations are widely used for display calibration and contrast manipulation. When gamma < 1, the curve bows upward, expanding dark input values into a wider band of output values (brightening shadows). When gamma > 1, the curve bows downward, darkening shadows and midtones."
              insightQuestion="Why are gamma transformations critical in computer graphics and medical imaging?"
              insightAnswer="Human visual perception of brightness is logarithmic rather than linear. Gamma transformations correct for non-linear display phosphor responses and allow selective contrast enhancement in dark radiographic shadows."
              defaultOpen={true}
            />
          )}

          {opType === 'brightness' && (
            <ConceptCard
              category="Point Transform"
              title="Brightness Adjustment (Scalar Translation)"
              formula="g(x, y) = \text{clip}(f(x, y) + \Delta b, \ 0, \ 255)"
              explanation="A simple point transformation that adds or subtracts a scalar constant from every pixel, rigidly shifting the entire intensity histogram along the horizontal axis with clipping at 0 and 255."
              defaultOpen={true}
            />
          )}

          {opType === 'contrast' && (
            <ConceptCard
              category="Linear Scaling"
              title="Linear Intensity Scaling"
              formula="g(x, y) = \text{clip}(\alpha \cdot f(x, y) + \beta, \ 0, \ 255)"
              explanation="Multiplication by alpha controls the slope of the transformation (contrast range), while beta controls the baseline shift (brightness). Values of alpha > 1 expand contrast; values of alpha < 1 compress contrast."
              defaultOpen={true}
            />
          )}

          {opType === 'grayscale' && (
            <ConceptCard
              category="Luminance Model"
              title="Perceptual Luminance vs Average Conversion"
              formula="Y = 0.299R + 0.587G + 0.114B \quad (\text{ITU-R BT.601})"
              explanation="The human retina contains three types of cone photoreceptors with non-uniform spectral sensitivities. Peak sensitivity occurs in the green spectrum (~555 nm), moderate in red, and minimal in blue. The standard ITU-R BT.601 coefficients weight Green at 58.7% and Blue at only 11.4% to match perceived human brightness."
              insightQuestion="Why does green have the highest weight in grayscale luminance conversion?"
              insightAnswer="Because human photopic vision has its maximum luminous efficiency near green wavelengths (555 nm). An unweighted average (R+G+B)/3 produces visually distorted brightness."
              defaultOpen={true}
            />
          )}
        </div>
      </div>
    </div>
  );
};
