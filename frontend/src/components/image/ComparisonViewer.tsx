import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Columns2,
  SplitSquareVertical,
  ZoomIn,
  ZoomOut,
  Download,
  Eye,
  RotateCcw
} from 'lucide-react';
import { ExportModal } from '../common/ExportModal';

interface ComparisonViewerProps {
  originalUrl: string;
  processedUrl?: string;
  originalLabel?: string;
  processedLabel?: string;
  width?: number;
  height?: number;
  onDownload?: () => void;
  className?: string;
  isProcessing?: boolean;
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  originalUrl,
  processedUrl,
  originalLabel = 'Before',
  processedLabel = 'After',
  width,
  height,
  onDownload,
  className = '',
  isProcessing = false,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'sideBySide'>('split');
  const [splitPos, setSplitPos] = useState<number>(50); // percentage 0-100
  const [zoom, setZoom] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [peekOriginal, setPeekOriginal] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      setSplitPos(Math.round((x / rect.width) * 100));
    },
    [isDragging]
  );

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Keyboard shortcut: hold space to peek original
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        setPeekOriginal(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setPeekOriginal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    setIsExportModalOpen(true);
  };

  const effectiveProcessedUrl = peekOriginal ? originalUrl : processedUrl || originalUrl;

  return (
    <div className={`flex flex-col rounded-xl border border-border bg-surface overflow-hidden ${className}`}>
      {/* Top Toolbar */}
      <div className="h-11 px-4 border-b border-border bg-elevated/80 flex items-center justify-between text-xs text-secondary select-none">
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-surface border border-border rounded-md p-0.5">
            <button
              onClick={() => setViewMode('split')}
              title="Split Comparison Slider"
              className={`px-2 py-1 rounded flex items-center gap-1.5 transition-colors ${
                viewMode === 'split' ? 'bg-elevated text-accent font-medium shadow-xs' : 'hover:text-primary'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
            <button
              onClick={() => setViewMode('sideBySide')}
              title="Side-by-Side Comparison"
              className={`px-2 py-1 rounded flex items-center gap-1.5 transition-colors ${
                viewMode === 'sideBySide' ? 'bg-elevated text-accent font-medium shadow-xs' : 'hover:text-primary'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
          </div>

          {/* Peek Original Button */}
          {processedUrl && (
            <button
              onMouseDown={() => setPeekOriginal(true)}
              onMouseUp={() => setPeekOriginal(false)}
              onTouchStart={() => setPeekOriginal(true)}
              onTouchEnd={() => setPeekOriginal(false)}
              title="Hold to peek original (or hold Spacebar)"
              className={`px-2 py-1 rounded border flex items-center gap-1.5 transition-colors ${
                peekOriginal
                  ? 'bg-accent/20 border-accent text-accent font-medium'
                  : 'bg-surface border-border hover:text-primary'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hold to Peek</span>
            </button>
          )}

          {/* Resolution Badge */}
          {width && height && (
            <div className="hidden sm:flex items-center font-mono text-[11px] text-muted px-2 py-0.5 rounded bg-surface border border-border">
              {width}×{height} px
            </div>
          )}
        </div>

        {/* Zoom & Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
            title="Zoom Out"
            className="p-1.5 rounded hover:bg-surface hover:text-primary transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-[11px] min-w-[42px] text-center text-primary">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
            title="Zoom In"
            className="p-1.5 rounded hover:bg-surface hover:text-primary transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            title="Reset Zoom to 100%"
            className="p-1.5 rounded hover:bg-surface hover:text-primary transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Download Processed */}
          <button
            onClick={handleDownload}
            title="Download Result Image"
            className="px-2.5 py-1 rounded bg-accent text-surface hover:bg-accent-hover font-medium flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="relative flex-1 min-h-[380px] bg-main/50 overflow-auto flex items-center justify-center p-4 technical-grid select-none">
        {/* Processing Spinner Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-surface/60 backdrop-blur-xs flex items-center justify-center z-30 transition-all">
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-elevated border border-border shadow-lg">
              <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono text-primary font-medium">Computing Transform...</span>
            </div>
          </div>
        )}

        {viewMode === 'split' ? (
          /* Split Slider Mode */
          <div
            ref={containerRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative inline-block max-w-full max-h-[70vh] shadow-md border border-border/60 rounded-md overflow-hidden bg-black/40"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          >
            {/* Background Image: Processed Result */}
            <img
              src={effectiveProcessedUrl}
              alt={processedLabel}
              className="block max-w-full max-h-[70vh] object-contain pointer-events-none"
            />

            {/* Foreground Clipped Image: Original */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
            >
              <img
                src={originalUrl}
                alt={originalLabel}
                className="block max-w-full max-h-[70vh] object-contain"
              />
            </div>

            {/* Split Handle Divider */}
            <div
              onPointerDown={handlePointerDown}
              className="absolute top-0 bottom-0 w-1 bg-accent cursor-ew-resize z-20 flex items-center justify-center hover:w-1.5 transition-all"
              style={{ left: `${splitPos}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-7 h-7 rounded-full bg-accent border-2 border-surface flex items-center justify-center shadow-lg text-surface">
                <SplitSquareVertical className="w-3.5 h-3.5 rotate-90" />
              </div>
            </div>

            {/* Badges for Before / After */}
            <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-surface/85 backdrop-blur-xs border border-border text-[11px] font-mono text-primary shadow-xs pointer-events-none z-10">
              {originalLabel}
            </div>
            <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-surface/85 backdrop-blur-xs border border-border text-[11px] font-mono text-accent shadow-xs pointer-events-none z-10">
              {processedLabel}
            </div>
          </div>
        ) : (
          /* Side-by-Side Mode */
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-5xl"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          >
            {/* Original Card */}
            <div className="flex flex-col rounded-lg border border-border bg-surface overflow-hidden shadow-xs">
              <div className="px-3 py-1.5 border-b border-border bg-elevated text-xs font-mono text-secondary flex items-center justify-between">
                <span>{originalLabel}</span>
                <span className="text-muted text-[10px]">Reference</span>
              </div>
              <div className="p-2 flex items-center justify-center min-h-[260px] bg-black/20">
                <img
                  src={originalUrl}
                  alt={originalLabel}
                  className="max-h-[50vh] max-w-full object-contain rounded"
                />
              </div>
            </div>

            {/* Processed Card */}
            <div className="flex flex-col rounded-lg border border-border bg-surface overflow-hidden shadow-xs">
              <div className="px-3 py-1.5 border-b border-border bg-elevated text-xs font-mono text-accent flex items-center justify-between">
                <span>{processedLabel}</span>
                <span className="text-[10px] text-muted">Output</span>
              </div>
              <div className="p-2 flex items-center justify-center min-h-[260px] bg-black/20">
                <img
                  src={effectiveProcessedUrl}
                  alt={processedLabel}
                  className="max-h-[50vh] max-w-full object-contain rounded"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        originalUrl={originalUrl}
        processedUrl={processedUrl}
        defaultFilename={`imagerevive_${(processedLabel || 'export').toLowerCase().replace(/[^a-z0-9]+/g, '_')}`}
        metadata={{
          operationName: processedLabel,
          resolution: width && height ? `${width} × ${height}` : undefined,
        }}
      />
    </div>
  );
};
