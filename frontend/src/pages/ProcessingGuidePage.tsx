import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MathFormula } from '../components/common/MathFormula';

interface GuideTopic {
  id: string;
  category: string;
  title: string;
  whatItDoes: string;
  whenUseful: string;
  howItWorks: string;
  mathModel: string;
  limitations: string;
}

const GUIDE_TOPICS: GuideTopic[] = [
  {
    id: 'brightness-contrast',
    category: 'Brightness & Contrast',
    title: 'Linear Scaling & Gamma Transformations',
    whatItDoes:
      'Adjusts overall image luminance and stretches or compresses dynamic range across highlights, midtones, and shadows.',
    whenUseful:
      'Fixing underexposed or overexposed photography, enhancing faint low-contrast medical radiographs, and calibrating imagery for non-linear displays.',
    howItWorks:
      'Point operations compute a new output intensity s = T(r) independently for each pixel. Linear scaling scales pixels by alpha and adds beta (g = alpha*f + beta). Power-law gamma transformation computes s = c * r^gamma, bowing the curve upward (gamma < 1) to reveal dark shadow details without blowing out specular highlights.',
    mathModel:
      '\\text{Linear: } s = \\text{clip}(\\alpha \\cdot r + \\beta, \\ 0, \\ 255) \\\\\n\\text{Gamma: } s = 255 \\cdot \\left(\\frac{r}{255}\\right)^\\gamma',
    limitations:
      'Linear brightness shifts cause hard clipping (saturation at 0 and 255). Aggressive gamma brightening can elevate sensor noise in dark shadows into visible grain.',
  },
  {
    id: 'histograms',
    category: 'Histograms',
    title: 'Contrast Stretching & Histogram Equalization',
    whatItDoes:
      'Redistributes intensity distributions across the full 8-bit dynamic range [0, 255] to maximize perceptual contrast and information entropy.',
    whenUseful:
      'Recovering visual detail from narrow-range low-contrast images such as medical scans, foggy outdoor imagery, or microscopy.',
    howItWorks:
      'Min-Max contrast stretching performs linear interpolation between the minimum (r_min) and maximum (r_max) observed intensities. Histogram Equalization uses the empirical Cumulative Distribution Function (CDF) as a transformation mapping T(r), spreading crowded pixel values across underutilized bins. In color images, equalizing luminance (Y in YCrCb) preserves natural color ratios.',
    mathModel:
      '\\text{Contrast Stretch: } s = \\frac{r - r_{min}}{r_{max} - r_{min}} \\times 255 \\\\\n\\text{Equalization CDF: } s_k = \\frac{L - 1}{MN} \\sum_{j=0}^{k} n_j',
    limitations:
      'Histogram equalization may over-enhance large homogeneous areas (such as clear sky or solid backgrounds), amplifying high-frequency sensor noise and creating harsh, unnatural gradients.',
  },
  {
    id: 'smoothing',
    category: 'Smoothing',
    title: 'Box Mean Blur & Gaussian Spatial Filtering',
    whatItDoes:
      'Attenuates high-frequency spatial fluctuations to smooth grain, reduce noise, and soften sharp edges.',
    whenUseful:
      'Pre-processing before edge detection, suppressing high-frequency sensor noise, and creating blurred depth-of-field effects.',
    howItWorks:
      'A sliding 2D kernel matrix computes a weighted average of neighbor pixels. The Box filter assigns uniform 1/N weights to every neighbor. The Gaussian filter weights neighbors using a 2D Gaussian bell curve G(x, y), giving greatest weight to the center pixel and decaying smoothly with radial distance sigma.',
    mathModel:
      '\\text{Box Kernel: } w = \\frac{1}{k^2} \\begin{bmatrix} 1 & \\dots & 1 \\\\ \\vdots & \\ddots & \\vdots \\\\ 1 & \\dots & 1 \\end{bmatrix} \\\\\n\\text{Gaussian: } G(x, y) = \\frac{1}{2\\pi\\sigma^2} \\exp\\left(-\\frac{x^2 + y^2}{2\\sigma^2}\\right)',
    limitations:
      'Linear smoothing filters cannot differentiate between high-frequency noise and genuine structural edges, causing edge blur and loss of fine texture.',
  },
  {
    id: 'sharpening',
    category: 'Sharpening',
    title: 'Unsharp Masking & High-Boost Enhancement',
    whatItDoes:
      'Enhances high-frequency edge transitions to make images look crisper, punchier, and more detailed.',
    whenUseful:
      'Counteracting lens softness, restoring sharpness lost during spatial downsampling, and preparing images for print or web publication.',
    howItWorks:
      'Unsharp masking computes an unsharp mask by subtracting a Gaussian-smoothed version from the original image (g_mask = f - f_smooth). This mask contains only edge gradients. Multiplying the mask by scaling factor k and adding it back to the original image (f_sharp = f + k * g_mask) accentuates boundary contrast.',
    mathModel:
      'g_{mask}(x, y) = f(x, y) - f_{smooth}(x, y) \\\\\nf_{sharp}(x, y) = f(x, y) + k \\cdot g_{mask}(x, y) \\quad (k \\ge 1)',
    limitations:
      'Excessive sharpening strength (k > 2) produces visible halo artifacts around dark-to-light boundaries and amplifies underlying sensor noise.',
  },
  {
    id: 'spatial-filters',
    category: 'Spatial Filters',
    title: '2D Convolution, Correlation & Custom Kernels',
    whatItDoes:
      'Applies linear spatial transformations through user-defined matrix operators, enabling custom embossing, blurring, and edge detection.',
    whenUseful:
      'Computer vision feature extraction, texture analysis, custom creative filters, and structural kernel design.',
    howItWorks:
      'The kernel slides pixel by pixel across the input matrix. At each position, an element-wise product sum is computed. In mathematical convolution, the kernel is flipped 180 degrees before summation; in correlation, it is applied directly. Border padding (replicate, reflect, or zero) prevents boundary shrinkage.',
    mathModel:
      '\\text{Convolution: } g(x, y) = \\sum_{s=-a}^{a} \\sum_{t=-b}^{b} w(s, t) f(x - s, y - t) \\\\\n\\text{Correlation: } g(x, y) = \\sum_{s=-a}^{a} \\sum_{t=-b}^{b} w(s, t) f(x + s, y + t)',
    limitations:
      'Kernel operations require careful weight normalization. Non-normalized kernels that sum to values other than 1 will inadvertently shift overall image brightness.',
  },
  {
    id: 'edge-detection',
    category: 'Edge Detection',
    title: 'First-Order Gradients & Second-Order Laplacian',
    whatItDoes:
      'Locates spatial boundaries, object outlines, and significant luminance discontinuities.',
    whenUseful:
      'Object recognition, document boundary extraction, optical inspection, and segmentation preprocessing.',
    howItWorks:
      'First-order derivative filters (Sobel, Prewitt, Scharr) calculate directional gradients G_x and G_y. The gradient magnitude M = sqrt(G_x^2 + G_y^2) indicates edge strength, while the angle alpha = arctan(G_y / G_x) gives the edge orientation. Second-order Laplacian filters compute divergence of gradient, identifying edges by zero-crossings.',
    mathModel:
      '\\nabla f = \\begin{bmatrix} G_x \\\\ G_y \\end{bmatrix}, \\quad M(x, y) = \\sqrt{G_x^2 + G_y^2} \\\\\n\\nabla^2 f = \\frac{\\partial^2 f}{\\partial x^2} + \\frac{\\partial^2 f}{\\partial y^2} \\approx f(x+1,y) + f(x-1,y) + f(x,y+1) + f(x,y-1) - 4f(x,y)',
    limitations:
      'Second-order derivatives are extremely sensitive to noise because they multiply high-frequency components by omega^2. Pre-smoothing with a Gaussian filter (LoG) is recommended.',
  },
  {
    id: 'noise-reduction',
    category: 'Noise Reduction',
    title: 'Order-Statistics Median & Bilateral Filtering',
    whatItDoes:
      'Eliminates impulse (salt & pepper) and additive Gaussian noise while maintaining edge sharpness.',
    whenUseful:
      'Cleaning sensor noise in low-light photography, transmission corrupted images, and medical CT/MRI imaging.',
    howItWorks:
      'Median filtering slides a window over the image, sorts neighborhood intensities in numerical order, and picks the median value. Extreme outliers (such as 0 or 255 impulses) are relegated to list extremes and never chosen. Bilateral filtering combines spatial proximity with radiometric intensity similarity, smoothing only pixels of similar shade.',
    mathModel:
      '\\hat{f}(x, y) = \\text{median}_{(s, t) \\in S_{xy}} \\{g(s, t)\\} \\\\\nBF[I]_p = \\frac{1}{W_p} \\sum_{q \\in \\Omega} I_q \\cdot g_{\\sigma_s}(\\|p - q\\|) \\cdot g_{\\sigma_r}(|I_p - I_q|)',
    limitations:
      'Large median kernels (ksize > 7) round sharp corners and remove legitimate fine details (such as thin lines or stars in astrophotography).',
  },
  {
    id: 'image-restoration',
    category: 'Image Restoration',
    title: 'Degradation Modeling, PSNR Fidelity & 2D FFT',
    whatItDoes:
      'Reconstructs a clean estimate of an image from a degraded observation and quantifies recovery accuracy.',
    whenUseful:
      'Evaluating restoration pipelines, scientific imaging calibration, and frequency-domain noise filtering.',
    howItWorks:
      'Degradation is modeled as g(x,y) = f(x,y) * h(x,y) + eta(x,y). In the frequency domain via 2D FFT, convolution becomes multiplication: G(u,v) = F(u,v)H(u,v) + N(u,v). Reconstruction fidelity is measured objectively using Mean Squared Error (MSE) and Peak Signal-to-Noise Ratio (PSNR) in decibels.',
    mathModel:
      '\\text{MSE} = \\frac{1}{MN} \\sum_{x,y} [f(x, y) - \\hat{f}(x, y)]^2 \\\\\n\\text{PSNR} = 10 \\log_{10}\\left(\\frac{255^2}{\\text{MSE}}\\right) \\quad (\\text{dB})',
    limitations:
      'PSNR calculates pixel-wise differences and does not fully reflect human visual perception (HVS) factors such as structural luminance masking. Structural Similarity (SSIM) provides a complementary perceptual measure.',
  },
  {
    id: 'spatial-resampling',
    category: 'Spatial Resolution',
    title: 'Spatial Resampling: Subsampling & Interpolation Kernels',
    whatItDoes:
      'Alters image matrix dimensions through downsampling (subsampling) or upsampling (interpolation using Nearest, Bilinear, Bicubic, or Lanczos-4 kernels).',
    whenUseful:
      'Creating multi-scale image pyramids, optimizing bandwidth for web delivery, photographic print magnification, and comparing reconstruction fidelity.',
    howItWorks:
      'Downsampling decimate spatial coordinates. According to the Nyquist-Shannon criterion, if spatial frequencies exceed half the sampling rate, high-frequency textures fold into false low-frequency aliasing patterns. Upsampling reconstructs continuous spatial intensities via 2D convolution with a reconstruction kernel K(u): Nearest Neighbor (zero-order hold, blocky), Bilinear (1st-order linear average over 2x2), Bicubic (3rd-order spline over 4x4), and Lanczos-4 (8x8 sinc-windowed filter preserving high-frequency edge acuity).',
    mathModel:
      '\\text{Nyquist: } f_s \\ge 2 \\cdot f_{max} \\\\\n\\text{Interpolation: } f(x, y) = \\sum_{i} \\sum_{j} f(i, j) K(x - i) K(y - j) \\\\\n\\text{Lanczos: } L(x) = \\begin{cases} \\text{sinc}(x) \\cdot \\text{sinc}(x / a) & \\text{if } |x| < a \\\\ 0 & \\text{otherwise} \\end{cases}',
    limitations:
      'Upsampling cannot synthesize genuine scene information that was never captured by the physical optical sensor. Nearest-neighbor yields pixelation steps, bilinear blurs high-contrast edges, and aggressive lanczos filtering can produce subtle ringing around extreme transitions.',
  },
];

export const ProcessingGuidePage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({
    'brightness-contrast': true,
    'histograms': true,
  });

  const categories = ['All', ...Array.from(new Set(GUIDE_TOPICS.map((t) => t.category)))];

  const filteredTopics =
    selectedCategory === 'All'
      ? GUIDE_TOPICS
      : GUIDE_TOPICS.filter((t) => t.category === selectedCategory);

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-surface to-elevated p-6 sm:p-8 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-mono font-medium">
          <BookOpen className="w-3.5 h-3.5" />
          <span>TECHNICAL REFERENCE & PRINCIPLES</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-primary font-heading tracking-tight">
          Image Processing Guide
        </h1>
        <p className="text-secondary text-xs sm:text-sm max-w-3xl leading-relaxed">
          Explore the mathematical models, spatial algorithms, and frequency-domain principles powering ImageRevive.
          Designed for developers, designers, and visual researchers seeking deep technical clarity.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-accent text-surface shadow-xs'
                : 'bg-elevated text-secondary hover:text-primary'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Technical Topics List */}
      <div className="space-y-4">
        {filteredTopics.map((topic) => {
          const isExpanded = expandedTopics[topic.id] ?? false;

          return (
            <div
              key={topic.id}
              className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs transition-colors"
            >
              {/* Header Accordion Bar */}
              <button
                onClick={() => toggleTopic(topic.id)}
                className="w-full px-5 py-4 bg-elevated/60 flex items-center justify-between text-left hover:bg-elevated transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-accent font-semibold uppercase">
                      {topic.category}
                    </span>
                    <h3 className="text-sm font-bold text-primary font-heading tracking-tight mt-1">
                      {topic.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-muted">
                  <span className="text-xs font-mono hidden sm:inline">
                    {isExpanded ? 'Collapse' : 'Expand Details'}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-accent" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {/* Accordion Content */}
              {isExpanded && (
                <div className="p-5 space-y-4 text-xs border-t border-border bg-surface">
                  {/* Grid 2 Cols: What It Does & When Useful */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-lg bg-elevated border border-border space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-semibold">
                        What It Does
                      </span>
                      <p className="text-secondary leading-relaxed">{topic.whatItDoes}</p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-elevated border border-border space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-semibold">
                        When Useful
                      </span>
                      <p className="text-secondary leading-relaxed">{topic.whenUseful}</p>
                    </div>
                  </div>

                  {/* Mathematical Model */}
                  <div className="p-4 rounded-lg bg-main border border-border space-y-1.5">
                    <span className="text-[10px] font-mono text-muted uppercase tracking-wider block mb-1">
                      Mathematical Model & Formulation
                    </span>
                    <MathFormula formula={topic.mathModel} />
                  </div>

                  {/* How It Works */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
                      How It Works
                    </span>
                    <p className="text-secondary leading-relaxed text-xs">{topic.howItWorks}</p>
                  </div>

                  {/* Important Limitations */}
                  <div className="p-3.5 rounded-lg bg-accent/10 border border-accent/25 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-semibold block">
                      Practical Considerations & Limitations
                    </span>
                    <p className="text-primary leading-relaxed text-xs">{topic.limitations}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Architecture & Engine Disclosure */}
      <div className="p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-3">
        <div className="flex items-center gap-2.5 text-primary font-semibold text-sm">
          <div className="w-5 h-5 rounded overflow-hidden border border-border/80 bg-black shadow-xs shrink-0 flex items-center justify-center">
            <img src="/logo.png" alt="ImageRevive Logo" className="w-full h-full object-cover select-none" />
          </div>
          <span>ImageRevive Architecture & Processing Engine</span>
        </div>
        <p className="text-secondary text-xs leading-relaxed">
          All image transformations are executed directly by your configured local FastAPI engine using pure NumPy and OpenCV computational routines.
          Images remain stored in volatile memory during your active browser session and are never transmitted to external cloud providers.
        </p>
      </div>
    </div>
  );
};
