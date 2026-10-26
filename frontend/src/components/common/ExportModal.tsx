import React, { useState } from 'react';
import {
  X,
  Download,
  FileImage,
  Sliders,
  CheckCircle2,
  Binary,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { exportImage } from '../../utils/exportUtils';
import type { ExportMetadata } from '../../utils/exportUtils';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalUrl: string;
  processedUrl?: string;
  defaultFilename?: string;
  metadata?: ExportMetadata;
  isGray?: boolean;
}

type ExportFormat = 'png' | 'jpeg' | 'webp' | 'bmp' | 'npy' | 'academic-card';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  originalUrl,
  processedUrl,
  defaultFilename = 'imagerevive_export',
  metadata,
  isGray = false,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('png');
  const [useProcessed, setUseProcessed] = useState<boolean>(Boolean(processedUrl));
  const [quality, setQuality] = useState<number>(90); // 10 - 100
  const [scale, setScale] = useState<number>(1.0);
  const [filename, setFilename] = useState<string>(defaultFilename);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const activeUrl = useProcessed && processedUrl ? processedUrl : originalUrl;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportSuccess(false);

      await exportImage({
        imageUrl: activeUrl,
        format: selectedFormat,
        scale,
        quality: quality / 100,
        filename: filename || 'imagerevive_export',
        metadata,
        isGray,
      });

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onClose();
      }, 900);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please check browser console.');
    } finally {
      setIsExporting(false);
    }
  };

  const formats: Array<{
    id: ExportFormat;
    name: string;
    ext: string;
    desc: string;
    tag: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'png',
      name: 'PNG Image',
      ext: '.png',
      desc: 'Lossless RGB/RGBA compression, preserving every discrete pixel value exactly.',
      tag: 'Lossless',
      icon: <FileImage className="w-4 h-4 text-accent" />,
    },
    {
      id: 'jpeg',
      name: 'JPEG Image',
      ext: '.jpg',
      desc: 'Standard lossy DCT compression with adjustable quality factor.',
      tag: 'Compressed',
      icon: <Sliders className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: 'webp',
      name: 'WebP Image',
      ext: '.webp',
      desc: 'Modern web standard offering superior compression and high visual fidelity.',
      tag: 'Next-Gen',
      icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
    },
    {
      id: 'bmp',
      name: 'Windows BMP',
      ext: '.bmp',
      desc: 'Uncompressed raw 24-bit bitmap file format used in classic DIP labs.',
      tag: 'Uncompressed',
      icon: <FileImage className="w-4 h-4 text-purple-400" />,
    },
    {
      id: 'npy',
      name: 'NumPy Binary (.npy)',
      ext: '.npy',
      desc: 'Standard Python uint8 tensor. Load instantly with numpy.load() in Jupyter.',
      tag: 'Python / ML',
      icon: <Binary className="w-4 h-4 text-amber-400" />,
    },
    {
      id: 'academic-card',
      name: 'Academic DIP Card',
      ext: '.png',
      desc: 'Framed inspection sheet with metadata stamp, entropy, mean, and std values.',
      tag: 'Viva Ready',
      icon: <GraduationCap className="w-4 h-4 text-indigo-400" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-surface shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent/15 border border-accent/25 text-accent">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-primary font-mono tracking-wide uppercase">
                Multi-Format Export Studio
              </h2>
              <p className="text-xs text-muted">
                Save images in academic, web, or raw tensor formats
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source Selection (if both available) */}
        {processedUrl && (
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-secondary">Export Source Image:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUseProcessed(true)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                  useProcessed
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-elevated text-secondary hover:text-primary'
                }`}
              >
                <span>Processed Output</span>
                {useProcessed && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setUseProcessed(false)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                  !useProcessed
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-elevated text-secondary hover:text-primary'
                }`}
              >
                <span>Original Image</span>
                {!useProcessed && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Format Grid */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-secondary">Select Export Format:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {formats.map((fmt) => {
              const isSelected = selectedFormat === fmt.id;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setSelectedFormat(fmt.id)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'border-accent bg-accent/10 shadow-xs'
                      : 'border-border bg-elevated/60 hover:bg-elevated hover:border-border/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {fmt.icon}
                      <span className="text-xs font-bold text-primary font-mono">{fmt.name}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-accent text-surface font-semibold'
                          : 'bg-surface text-muted border border-border'
                      }`}
                    >
                      {fmt.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted leading-tight">{fmt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Compression Quality Slider (for JPEG / WebP) */}
        {(selectedFormat === 'jpeg' || selectedFormat === 'webp') && (
          <div className="p-3.5 rounded-xl border border-border bg-elevated/40 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-secondary">Compression Quality Factor:</span>
              <span className="font-bold text-accent">{quality}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted">
              <span>High Compression (Small Size)</span>
              <span>Visually Lossless (High Fidelity)</span>
            </div>
          </div>
        )}

        {/* Resolution Scale & Filename Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-mono text-secondary">Export Resolution:</label>
            <select
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="w-full text-xs font-mono rounded-lg border border-border bg-elevated px-3 py-2 text-primary focus:outline-hidden focus:border-accent"
            >
              <option value={1.0}>1.0x (Native Resolution)</option>
              <option value={0.5}>0.5x (Downsampled 50%)</option>
              <option value={2.0}>2.0x (High-Res 200%)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-secondary">Target Filename:</label>
            <div className="flex items-center rounded-lg border border-border bg-elevated px-3 py-2 text-xs font-mono focus-within:border-accent">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="imagerevive_export"
                className="w-full bg-transparent text-primary outline-hidden"
              />
              <span className="text-muted ml-1">
                {formats.find((f) => f.id === selectedFormat)?.ext}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-mono text-secondary hover:text-primary transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold font-mono tracking-wide flex items-center gap-2 transition-all shadow-md ${
              exportSuccess
                ? 'bg-emerald-500 text-white'
                : 'bg-accent hover:bg-accent/90 text-surface'
            } disabled:opacity-50`}
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
            ) : exportSuccess ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              {exportSuccess
                ? 'Exported Successfully!'
                : `Export as ${formats.find((f) => f.id === selectedFormat)?.name.split(' ')[0]}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
