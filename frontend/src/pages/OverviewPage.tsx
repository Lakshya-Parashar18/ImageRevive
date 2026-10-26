import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileImage,
  Sliders,
  Filter,
  Wrench,
  Search,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  History as HistoryIcon,
} from 'lucide-react';
import { useImage } from '../contexts/ImageContext';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeImage, sampleImages, uploadFile, loadSample, history, isAnalyzing } = useImage();

  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    setUploadError(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError(`Invalid format "${file.type || 'unknown'}". Supported image formats are JPEG, PNG, and WebP.`);
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds 15 MB limit. Please select a smaller image.');
      return;
    }

    try {
      await uploadFile(file);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload and analyze image.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Studio Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface via-elevated to-surface p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-mono font-medium">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>IMAGE ENHANCEMENT • ANALYSIS • RESTORATION</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-primary tracking-tight font-heading">
              Your Images, Refined.
            </h1>
            <p className="text-secondary text-sm sm:text-base leading-relaxed">
              Enhance images, explore their visual properties, and experiment with powerful processing tools.
              Upload an image to get started, compare results, and keep control of every adjustment.
            </p>
          </div>
          <div className="hidden md:flex shrink-0 items-center justify-center">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border border-border/80 bg-black shadow-lg flex items-center justify-center">
              <img src="/logo.png" alt="ImageRevive Logo" className="w-full h-full object-cover select-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Action Grid: Upload Dropzone & Active Workspace Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drag and Drop Upload Card */}
        <div className="lg:col-span-2 flex flex-col justify-between p-6 rounded-2xl border border-border bg-surface shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
              <h2 className="text-sm font-semibold uppercase font-mono tracking-wider text-primary flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-accent" />
                <span>Upload an image</span>
              </h2>
              <span className="text-[11px] font-mono text-muted">JPEG, PNG, WebP • Up to 15 MB</span>
            </div>

            {/* Drop Zone Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-accent bg-accent/10 scale-[0.99]'
                  : 'border-border/80 hover:border-accent hover:bg-elevated/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mx-auto mb-3">
                {isAnalyzing ? (
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <p className="text-sm font-medium text-primary mb-1">
                {isAnalyzing ? 'Analyzing image properties and calculating histograms...' : 'Drop an image here or browse files'}
              </p>
              <p className="text-xs text-muted">
                Images are processed through your local engine and retained in-memory during your active session.
              </p>
            </div>

            {uploadError && (
              <div className="mt-3 p-3 rounded-lg bg-error/10 border border-error/30 text-error text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Quick Benchmark Samples */}
          <div className="mt-6 pt-4 border-t border-border">
            <span className="text-xs font-mono uppercase text-muted block mb-2.5">
              Try a Sample Image:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {sampleImages.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadSample(s.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    activeImage?.filename === `${s.id}.png`
                      ? 'border-accent bg-accent/10 shadow-xs'
                      : 'border-border bg-elevated hover:border-border-strong hover:bg-surface'
                  }`}
                >
                  <span className="font-semibold text-xs text-primary block truncate">{s.title.split('&')[0]}</span>
                  <span className="text-[10px] font-mono text-muted block">{s.category}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Loaded Image Status Card */}
        <div className="flex flex-col rounded-2xl border border-border bg-surface p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
            <h2 className="text-sm font-semibold uppercase font-mono tracking-wider text-primary flex items-center gap-2">
              <FileImage className="w-4 h-4 text-accent" />
              <span>Image Details</span>
            </h2>
            {activeImage && (
              <span className="flex items-center gap-1 text-[11px] text-success font-mono font-medium">
                <CheckCircle className="w-3 h-3" /> Ready
              </span>
            )}
          </div>

          {activeImage ? (
            <div className="flex-1 flex flex-col justify-between space-y-4">
              <div className="relative rounded-lg overflow-hidden border border-border bg-black/30 flex items-center justify-center p-2 min-h-[160px]">
                <img
                  src={activeImage.dataUrl}
                  alt={activeImage.filename}
                  className="max-h-40 max-w-full object-contain rounded"
                />
              </div>

              <div className="space-y-1.5 text-xs font-mono bg-elevated p-3 rounded-lg border border-border">
                <div className="flex justify-between">
                  <span className="text-muted">Filename:</span>
                  <span className="text-primary font-medium truncate max-w-[150px]">{activeImage.filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Dimensions:</span>
                  <span className="text-primary">{activeImage.width} × {activeImage.height} px</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Channels:</span>
                  <span className="text-primary">{activeImage.analysis?.channels || 3} ({activeImage.analysis?.color_mode || 'RGB'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Entropy:</span>
                  <span className="text-accent font-semibold">{activeImage.analysis?.entropy || 0} bits</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/inspector')}
                className="w-full py-2.5 rounded-lg bg-accent text-surface text-xs font-semibold uppercase tracking-wider hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <span>Inspect in Image Inspector</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-muted space-y-2">
              <FileImage className="w-10 h-10 opacity-40" />
              <p className="text-xs">No image loaded yet. Upload your image or choose a sample to begin.</p>
            </div>
          )}
        </div>
      </div>

      {/* Workspace Quick-Access Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-primary font-heading tracking-tight">
            Image Processing Workspaces
          </h2>
          <span className="text-xs font-mono text-muted">Interactive Workspaces</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Inspector */}
          <div
            onClick={() => navigate('/inspector')}
            className="group cursor-pointer p-5 rounded-xl border border-border bg-surface hover:border-accent hover:bg-elevated transition-all shadow-xs space-y-3"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-accent uppercase font-semibold">Analysis</span>
              <h3 className="font-heading font-bold text-sm text-primary group-hover:text-accent transition-colors">
                Image Inspector
              </h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Explore dimensions, color channels, intensity distributions, and individual pixels.
              </p>
            </div>
          </div>

          {/* Card 2: Enhancement */}
          <div
            onClick={() => navigate('/enhancement')}
            className="group cursor-pointer p-5 rounded-xl border border-border bg-surface hover:border-accent hover:bg-elevated transition-all shadow-xs space-y-3"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-accent/30 text-accent flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-accent uppercase font-semibold">Enhancement</span>
              <h3 className="font-heading font-bold text-sm text-primary group-hover:text-accent transition-colors">
                Enhance
              </h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Adjust brightness and contrast, redistribute intensity values, and refine image appearance.
              </p>
            </div>
          </div>

          {/* Card 3: Filtering */}
          <div
            onClick={() => navigate('/filtering')}
            className="group cursor-pointer p-5 rounded-xl border border-border bg-surface hover:border-accent hover:bg-elevated transition-all shadow-xs space-y-3"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-accent uppercase font-semibold">Filters</span>
              <h3 className="font-heading font-bold text-sm text-primary group-hover:text-accent transition-colors">
                Filters
              </h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Smooth noise, sharpen details, and explore how spatial kernels transform an image.
              </p>
            </div>
          </div>

          {/* Card 4: Restoration */}
          <div
            onClick={() => navigate('/restoration')}
            className="group cursor-pointer p-5 rounded-xl border border-border bg-surface hover:border-accent hover:bg-elevated transition-all shadow-xs space-y-3"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-accent uppercase font-semibold">Restoration</span>
              <h3 className="font-heading font-bold text-sm text-primary group-hover:text-accent transition-colors">
                Restore
              </h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Experiment with noise reduction and restoration techniques to recover useful image detail.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Edits */}
      {history.length > 0 && (
        <div className="p-6 rounded-2xl border border-border bg-surface shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
            <h2 className="text-sm font-semibold uppercase font-mono tracking-wider text-primary flex items-center gap-2">
              <HistoryIcon className="w-4 h-4 text-accent" />
              <span>Recent Edits ({history.length})</span>
            </h2>
            <button
              onClick={() => navigate('/history')}
              className="text-xs font-mono text-accent hover:underline flex items-center gap-1"
            >
              <span>View All History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {history.slice(0, 3).map((item) => (
              <div key={item.id} className="p-3 rounded-lg bg-elevated border border-border text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-primary">{item.operationName}</span>
                  <span className="font-mono text-[10px] text-muted">{item.timestamp}</span>
                </div>
                <p className="text-secondary text-[11px] line-clamp-2">{item.explanation || 'Processing completed.'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
