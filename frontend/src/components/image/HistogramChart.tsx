import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import type { HistogramData, ChannelStats } from '../../types';
import { BarChart3, Scissors } from 'lucide-react';

export interface HistogramChartProps {
  histogram?: HistogramData;
  channelStats?: Record<string, ChannelStats>;
  entropy?: number;
  title?: string;
  className?: string;
  // Intensity Slicing integration
  enableSlicing?: boolean;
  activeSlice?: [number, number] | null;
  onSliceChange?: (range: [number, number] | null) => void;
}

export const HistogramChart: React.FC<HistogramChartProps> = ({
  histogram,
  channelStats,
  entropy,
  title = 'Intensity Distribution Histogram',
  className = '',
  enableSlicing = false,
  activeSlice,
  onSliceChange,
}) => {
  const [showRed, setShowRed] = useState(true);
  const [showGreen, setShowGreen] = useState(true);
  const [showBlue, setShowBlue] = useState(true);
  const [showGray, setShowGray] = useState(true);

  // Slicing state: uncontrolled fallback if activeSlice is not provided
  const [isSlicingActive, setIsSlicingActive] = useState<boolean>(Boolean(activeSlice || enableSlicing));
  const [localSliceMin, setLocalSliceMin] = useState<number>(activeSlice ? activeSlice[0] : 80);
  const [localSliceMax, setLocalSliceMax] = useState<number>(activeSlice ? activeSlice[1] : 180);

  const sliceMin = activeSlice ? activeSlice[0] : localSliceMin;
  const sliceMax = activeSlice ? activeSlice[1] : localSliceMax;

  const hasColor = Boolean(histogram?.red && histogram?.green && histogram?.blue);
  const hasGray = Boolean(histogram?.grayscale);

  // Downsample to 128 points for smooth rendering
  const chartData = useMemo(() => {
    if (!histogram || !histogram.bins) return [];
    const step = 2; // sample every 2 bins (128 bars)
    const data = [];
    for (let i = 0; i < 256; i += step) {
      const item: Record<string, any> = { bin: i };
      if (histogram.red) item.red = (histogram.red[i] + (histogram.red[i + 1] || 0)) / 2;
      if (histogram.green) item.green = (histogram.green[i] + (histogram.green[i + 1] || 0)) / 2;
      if (histogram.blue) item.blue = (histogram.blue[i] + (histogram.blue[i + 1] || 0)) / 2;
      if (histogram.grayscale) item.grayscale = (histogram.grayscale[i] + (histogram.grayscale[i + 1] || 0)) / 2;
      data.push(item);
    }
    return data;
  }, [histogram]);

  // Calculate slice statistics (matching pixel count and percentage)
  const sliceStats = useMemo(() => {
    if (!histogram || !isSlicingActive) return null;
    const bins = histogram.grayscale || histogram.red || [];
    if (!bins.length) return null;

    let total = 0;
    let matching = 0;
    for (let i = 0; i < 256; i++) {
      const val = bins[i] || 0;
      total += val;
      if (i >= sliceMin && i <= sliceMax) {
        matching += val;
      }
    }

    const pct = total > 0 ? (matching / total) * 100 : 0;
    return {
      total,
      matching,
      percentage: pct.toFixed(1),
    };
  }, [histogram, isSlicingActive, sliceMin, sliceMax]);

  const updateSlice = (min: number, max: number) => {
    const clampedMin = Math.max(0, Math.min(min, max));
    const clampedMax = Math.min(255, Math.max(min, max));
    setLocalSliceMin(clampedMin);
    setLocalSliceMax(clampedMax);
    if (onSliceChange) {
      onSliceChange([clampedMin, clampedMax]);
    }
  };

  const toggleSlicing = () => {
    const nextState = !isSlicingActive;
    setIsSlicingActive(nextState);
    if (onSliceChange) {
      onSliceChange(nextState ? [sliceMin, sliceMax] : null);
    }
  };

  const applyPreset = (min: number, max: number) => {
    setIsSlicingActive(true);
    updateSlice(min, max);
  };

  return (
    <div className={`flex flex-col rounded-xl border border-border bg-surface p-4 shadow-xs ${className}`}>
      {/* Header with Title and Channel Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-semibold text-primary uppercase font-mono tracking-wider">
            {title}
          </h3>
        </div>

        {/* Channel & Slicing Toggles */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {hasColor && (
            <>
              <button
                onClick={() => setShowRed(!showRed)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                  showRed
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                    : 'bg-elevated border-border text-muted hover:text-secondary'
                }`}
              >
                R
              </button>
              <button
                onClick={() => setShowGreen(!showGreen)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                  showGreen
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-elevated border-border text-muted hover:text-secondary'
                }`}
              >
                G
              </button>
              <button
                onClick={() => setShowBlue(!showBlue)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                  showBlue
                    ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                    : 'bg-elevated border-border text-muted hover:text-secondary'
                }`}
              >
                B
              </button>
            </>
          )}
          {hasGray && (
            <button
              onClick={() => setShowGray(!showGray)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                showGray
                  ? 'bg-amber-500/15 border-amber-500/40 text-accent font-semibold'
                  : 'bg-elevated border-border text-muted hover:text-secondary'
              }`}
            >
              Luminance
            </button>
          )}

          {/* Intensity Slicing Toggle Button */}
          <button
            onClick={toggleSlicing}
            className={`px-2.5 py-0.5 rounded text-[11px] font-medium border transition-all flex items-center gap-1 ${
              isSlicingActive
                ? 'bg-accent text-surface border-accent font-bold shadow-xs'
                : 'bg-elevated border-border text-muted hover:text-primary'
            }`}
            title="Toggle DIP Intensity Slicing Band"
          >
            <Scissors className="w-3 h-3" />
            <span>Intensity Slicing</span>
          </button>
        </div>
      </div>

      {/* Slicing Controls Ribbon (when slicing active) */}
      {isSlicingActive && (
        <div className="mt-3 p-2.5 rounded-lg border border-accent/30 bg-accent/5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-secondary font-semibold text-[11px]">Slicing Band [A, B]:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max={sliceMax}
                value={sliceMin}
                onChange={(e) => updateSlice(Number(e.target.value), sliceMax)}
                className="w-14 px-1.5 py-0.5 rounded bg-surface border border-border text-center text-primary font-bold"
              />
              <span className="text-muted">to</span>
              <input
                type="number"
                min={sliceMin}
                max="255"
                value={sliceMax}
                onChange={(e) => updateSlice(sliceMin, Number(e.target.value))}
                className="w-14 px-1.5 py-0.5 rounded bg-surface border border-border text-center text-primary font-bold"
              />
            </div>

            {/* Presets */}
            <div className="hidden sm:flex items-center gap-1 ml-2">
              <button
                onClick={() => applyPreset(0, 64)}
                className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] text-muted hover:text-primary"
              >
                Shadows
              </button>
              <button
                onClick={() => applyPreset(64, 180)}
                className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] text-muted hover:text-primary"
              >
                Midtones
              </button>
              <button
                onClick={() => applyPreset(180, 255)}
                className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] text-muted hover:text-primary"
              >
                Highlights
              </button>
              <button
                onClick={() => applyPreset(0, 255)}
                className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] text-muted hover:text-primary"
              >
                Full Range
              </button>
            </div>
          </div>

          {/* Realtime Matching Stats */}
          {sliceStats && (
            <div className="flex items-center gap-2">
              <span className="text-muted text-[11px]">Active Pixels:</span>
              <span className="text-accent font-bold">
                {sliceStats.matching.toLocaleString()} px ({sliceStats.percentage}%)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Recharts Area Container */}
      <div className="h-44 w-full pt-3">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F87171" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#F87171" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34D399" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#34D399" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradGray" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E5A34D" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#E5A34D" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="bin"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                ticks={[0, 64, 128, 192, 255]}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const bin = payload[0].payload.bin;
                    return (
                      <div className="bg-elevated border border-border rounded-md p-2 shadow-lg text-[11px] font-mono space-y-1">
                        <div className="text-muted border-b border-border pb-1">
                          Intensity Level: <span className="text-primary font-bold">{bin}</span>
                        </div>
                        {payload.map((entry: any) => (
                          <div key={entry.name} className="flex justify-between gap-3" style={{ color: entry.color }}>
                            <span className="capitalize">{entry.name}:</span>
                            <span className="font-semibold">{Math.round(entry.value)} px</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Intensity Slicing Reference Area Highlight */}
              {isSlicingActive && (
                <ReferenceArea
                  x1={sliceMin}
                  x2={sliceMax}
                  fill="#E5A34D"
                  fillOpacity={0.22}
                  stroke="#E5A34D"
                  strokeDasharray="3 3"
                />
              )}

              {hasColor && showRed && (
                <Area type="monotone" dataKey="red" stroke="#F87171" strokeWidth={1.5} fill="url(#gradRed)" name="Red" />
              )}
              {hasColor && showGreen && (
                <Area type="monotone" dataKey="green" stroke="#34D399" strokeWidth={1.5} fill="url(#gradGreen)" name="Green" />
              )}
              {hasColor && showBlue && (
                <Area type="monotone" dataKey="blue" stroke="#60A5FA" strokeWidth={1.5} fill="url(#gradBlue)" name="Blue" />
              )}
              {hasGray && showGray && (
                <Area type="monotone" dataKey="grayscale" stroke="#E5A34D" strokeWidth={1.5} fill="url(#gradGray)" name="Luminance" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-muted font-mono">
            Histogram computation pending...
          </div>
        )}
      </div>

      {/* Dual Slider for Slicing when active */}
      {isSlicingActive && (
        <div className="mt-2 pt-2 border-t border-border flex items-center gap-3 text-xs font-mono">
          <span className="text-muted text-[10px]">Min:</span>
          <input
            type="range"
            min="0"
            max="255"
            value={sliceMin}
            onChange={(e) => updateSlice(Number(e.target.value), sliceMax)}
            className="flex-1 accent-accent"
          />
          <span className="text-muted text-[10px]">Max:</span>
          <input
            type="range"
            min="0"
            max="255"
            value={sliceMax}
            onChange={(e) => updateSlice(sliceMin, Number(e.target.value))}
            className="flex-1 accent-accent"
          />
        </div>
      )}

      {/* Channel Statistics Footer */}
      {channelStats && (
        <div className="mt-3 pt-2.5 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
          {Object.entries(channelStats).slice(0, 4).map(([name, stat]) => (
            <div key={name} className="bg-elevated/70 rounded p-1.5 border border-border/70">
              <span className="text-muted block text-[10px]">{name}</span>
              <div className="flex justify-between text-secondary mt-0.5">
                <span>μ: {stat.mean}</span>
                <span>σ: {stat.std}</span>
              </div>
            </div>
          ))}
          {entropy !== undefined && (
            <div className="col-span-2 sm:col-span-4 flex items-center justify-between px-2 py-1 rounded bg-accent/10 border border-accent/25 text-xs">
              <span className="text-secondary font-medium">Shannon Information Entropy H:</span>
              <span className="font-bold text-accent font-mono">{entropy} bits/pixel</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
