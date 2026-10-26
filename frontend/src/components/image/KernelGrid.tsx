import React, { useState } from 'react';
import { Grid, RotateCw } from 'lucide-react';

interface KernelPreset {
  name: string;
  size: 3 | 5;
  kernel: number[][];
  description: string;
}

export const KERNEL_PRESETS: KernelPreset[] = [
  {
    name: 'Identity (Pass-through)',
    size: 3,
    kernel: [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ],
    description: 'Leaves the image unchanged.',
  },
  {
    name: 'Box Blur (Mean 3x3)',
    size: 3,
    kernel: [
      [1 / 9, 1 / 9, 1 / 9],
      [1 / 9, 1 / 9, 1 / 9],
      [1 / 9, 1 / 9, 1 / 9],
    ],
    description: 'Uniform spatial averaging smoothing filter.',
  },
  {
    name: 'Gaussian Approximation 3x3',
    size: 3,
    kernel: [
      [1 / 16, 2 / 16, 1 / 16],
      [2 / 16, 4 / 16, 2 / 16],
      [1 / 16, 2 / 16, 1 / 16],
    ],
    description: 'Binomial approximation of 2D Gaussian distribution.',
  },
  {
    name: 'Sharpen (Standard)',
    size: 3,
    kernel: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ],
    description: 'Accentuates transitions using 4-neighbor second derivative.',
  },
  {
    name: 'Laplacian Edge Detector (8-neighbor)',
    size: 3,
    kernel: [
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1],
    ],
    description: 'Isotropic second-order derivative isolating sharp edge boundaries.',
  },
  {
    name: 'Sobel Horizontal (Gx)',
    size: 3,
    kernel: [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ],
    description: 'First derivative measuring horizontal gradient (detects vertical lines).',
  },
  {
    name: 'Sobel Vertical (Gy)',
    size: 3,
    kernel: [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ],
    description: 'First derivative measuring vertical gradient (detects horizontal lines).',
  },
  {
    name: 'Emboss Filter',
    size: 3,
    kernel: [
      [-2, -1, 0],
      [-1, 1, 1],
      [0, 1, 2],
    ],
    description: 'Highlights directional relief and simulated surface elevation.',
  },
];

interface KernelGridProps {
  kernel: number[][];
  onChange: (newKernel: number[][]) => void;
  operation: 'convolution' | 'correlation';
  onOperationChange: (op: 'convolution' | 'correlation') => void;
  paddingMode: 'replicate' | 'reflect' | 'constant';
  onPaddingModeChange: (pad: 'replicate' | 'reflect' | 'constant') => void;
  normalize: boolean;
  onNormalizeChange: (norm: boolean) => void;
  onApply: () => void;
  isLoading?: boolean;
}

export const KernelGrid: React.FC<KernelGridProps> = ({
  kernel,
  onChange,
  operation,
  onOperationChange,
  paddingMode,
  onPaddingModeChange,
  normalize,
  onNormalizeChange,
  onApply,
  isLoading = false,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('Sharpen (Standard)');
  const rows = kernel.length;
  const cols = kernel[0]?.length || 0;

  const handlePresetSelect = (presetName: string) => {
    setSelectedPreset(presetName);
    const found = KERNEL_PRESETS.find((p) => p.name === presetName);
    if (found) {
      onChange(found.kernel);
    }
  };

  const handleCellChange = (r: number, c: number, valStr: string) => {
    setSelectedPreset('Custom');
    const val = parseFloat(valStr) || 0;
    const newK = kernel.map((row, rIdx) =>
      row.map((colVal, cIdx) => (rIdx === r && cIdx === c ? val : colVal))
    );
    onChange(newK);
  };

  const kernelSum = kernel.flat().reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Grid className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-semibold text-primary uppercase font-mono tracking-wider">
            Kernel Explorer ({rows}×{cols})
          </h3>
        </div>
        <span className="font-mono text-xs text-muted">
          Sum: <span className="text-primary font-medium">{kernelSum.toFixed(2)}</span>
        </span>
      </div>

      {/* Preset Selector */}
      <div className="mt-3">
        <label className="block text-[11px] font-mono text-muted mb-1">Predefined Kernel</label>
        <select
          value={selectedPreset}
          onChange={(e) => handlePresetSelect(e.target.value)}
          className="w-full text-xs font-mono bg-elevated border border-border rounded-lg px-2.5 py-1.5 text-primary focus:outline-none focus:border-accent"
        >
          {KERNEL_PRESETS.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
          <option value="Custom">Custom User Matrix</option>
        </select>
      </div>

      {/* Interactive Matrix Grid */}
      <div className="my-3 flex flex-col items-center">
        <div
          className="grid gap-1.5 p-3 rounded-lg bg-main border border-border"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {kernel.map((row, r) =>
            row.map((val, c) => (
              <input
                key={`${r}-${c}`}
                type="number"
                step="any"
                value={Number(val.toFixed(3))}
                onChange={(e) => handleCellChange(r, c, e.target.value)}
                className="w-14 h-11 text-center font-mono text-xs bg-surface border border-border rounded text-primary focus:border-accent focus:bg-elevated focus:outline-none transition-colors"
              />
            ))
          )}
        </div>
      </div>

      {/* Operation & Boundary Controls */}
      <div className="space-y-2.5 pt-2 border-t border-border text-xs">
        {/* Convolution vs Correlation Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-secondary">Operation:</span>
          <div className="flex items-center bg-elevated border border-border rounded-md p-0.5 font-mono text-[11px]">
            <button
              onClick={() => onOperationChange('convolution')}
              className={`px-2 py-0.5 rounded transition-colors ${
                operation === 'convolution' ? 'bg-surface text-accent font-semibold shadow-xs' : 'text-muted'
              }`}
            >
              Convolution (180° Rotated)
            </button>
            <button
              onClick={() => onOperationChange('correlation')}
              className={`px-2 py-0.5 rounded transition-colors ${
                operation === 'correlation' ? 'bg-surface text-accent font-semibold shadow-xs' : 'text-muted'
              }`}
            >
              Correlation
            </button>
          </div>
        </div>

        {/* Boundary Padding Mode */}
        <div className="flex items-center justify-between">
          <span className="text-secondary">Boundary Padding:</span>
          <select
            value={paddingMode}
            onChange={(e) => onPaddingModeChange(e.target.value as any)}
            className="text-xs font-mono bg-elevated border border-border rounded px-2 py-1 text-primary focus:outline-none focus:border-accent"
          >
            <option value="replicate">Replicate (Edge clamp)</option>
            <option value="reflect">Reflect (Mirror boundary)</option>
            <option value="constant">Constant (Zero padding)</option>
          </select>
        </div>

        {/* Normalize Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-secondary">
          <input
            type="checkbox"
            checked={normalize}
            onChange={(e) => onNormalizeChange(e.target.checked)}
            className="rounded border-border text-accent focus:ring-accent"
          />
          <span>Normalize Kernel Coefficients (divide by sum)</span>
        </label>
      </div>

      {/* Apply Button */}
      <button
        onClick={onApply}
        disabled={isLoading}
        className="mt-4 w-full py-2 rounded-lg bg-accent text-surface font-semibold text-xs tracking-wide uppercase hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-surface border-t-transparent rounded-full animate-spin" />
            <span>Convolving Matrix...</span>
          </>
        ) : (
          <>
            <RotateCw className="w-3.5 h-3.5" />
            <span>Apply 2D Filter</span>
          </>
        )}
      </button>
    </div>
  );
};
