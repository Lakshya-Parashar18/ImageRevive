import type { PixelInspectionResult } from '../../types';
import { Crosshair, Info } from 'lucide-react';

interface PixelLoupeProps {
  inspection: PixelInspectionResult | null;
  isLoading?: boolean;
  className?: string;
}

export const PixelLoupe: React.FC<PixelLoupeProps> = ({
  inspection,
  className = '',
}) => {
  if (!inspection) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 rounded-xl border border-border bg-surface text-center ${className}`}>
        <Crosshair className="w-8 h-8 text-muted mb-2 animate-pulse" />
        <h4 className="text-xs font-semibold text-primary uppercase font-mono tracking-wider">
          Pixel Inspection Loupe
        </h4>
        <p className="text-xs text-muted max-w-[220px] mt-1">
          Click or hover anywhere on the image preview to inspect raw pixel coordinates and values.
        </p>
      </div>
    );
  }

  const { x, y, rgb, hex, normalized, neighborhood, neighborhood_coords, neighborhood_size } = inspection;

  return (
    <div className={`flex flex-col rounded-xl border border-border bg-surface p-4 shadow-xs ${className}`}>
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-semibold text-primary uppercase font-mono tracking-wider">
            Pixel Loupe (f(x, y))
          </h3>
        </div>
        <span className="font-mono text-xs text-accent font-semibold">
          X: {x}, Y: {y}
        </span>
      </div>

      {/* Main Coordinate & Color Readout */}
      <div className="flex items-center gap-3 my-3 p-2.5 rounded-lg bg-elevated border border-border">
        {/* Color Swatch */}
        <div
          className="w-12 h-12 rounded-lg border-2 border-border shadow-xs shrink-0 flex items-center justify-center"
          style={{ backgroundColor: hex }}
        >
          <span
            className="text-[10px] font-mono font-bold"
            style={{
              color: rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 128 ? '#000000' : '#FFFFFF',
            }}
          >
            ●
          </span>
        </div>

        {/* Numeric Values */}
        <div className="flex-1 space-y-1 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted">RGB:</span>
            <span className="font-semibold text-primary">
              [{rgb[0]}, {rgb[1]}, {rgb[2]}]
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Hex Code:</span>
            <span className="font-semibold text-accent">{hex}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Normalized [0, 1]:</span>
            <span className="text-secondary text-[11px]">
              [{normalized[0]}, {normalized[1]}, {normalized[2]}]
            </span>
          </div>
        </div>
      </div>

      {/* Magnified Neighborhood Grid */}
      <div className="mt-1">
        <div className="flex items-center justify-between text-[11px] font-mono text-muted mb-2">
          <span>Neighborhood Grid ({neighborhood_size}×{neighborhood_size})</span>
          <span className="text-[10px] text-accent">Center = f({x},{y})</span>
        </div>

        <div
          className="grid gap-1 p-2 rounded-lg bg-main/70 border border-border justify-center"
          style={{
            gridTemplateColumns: `repeat(${neighborhood_size}, minmax(0, 1fr))`,
          }}
        >
          {neighborhood.map((row, rIdx) =>
            row.map((pixelRgb, cIdx) => {
              const coord = neighborhood_coords[rIdx]?.[cIdx];
              const isCenter = rIdx === Math.floor(neighborhood_size / 2) && cIdx === Math.floor(neighborhood_size / 2);
              const cellHex = `rgb(${pixelRgb[0]}, ${pixelRgb[1]}, ${pixelRgb[2]})`;
              const lum = pixelRgb[0] * 0.299 + pixelRgb[1] * 0.587 + pixelRgb[2] * 0.114;

              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  title={`f(${coord?.x}, ${coord?.y}) = [${pixelRgb.join(', ')}]`}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                    isCenter ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface z-10' : 'border border-border/40'
                  }`}
                  style={{ backgroundColor: cellHex }}
                >
                  <span
                    className="text-[9px] font-mono select-none"
                    style={{ color: lum > 128 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)' }}
                  >
                    {Math.round(lum)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Educational Note */}
      <div className="mt-3 pt-2 border-t border-border flex items-start gap-1.5 text-[11px] text-muted">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-secondary" />
        <p className="leading-tight">
          Coordinate convention: origin (0, 0) is top-left. X axis extends horizontally (columns); Y axis extends vertically downward (rows).
        </p>
      </div>
    </div>
  );
};
