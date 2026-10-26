import React from 'react';
import { useImage } from '../contexts/ImageContext';
import { History, Download, Trash2, ArrowUpRight, Clock, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HistoryPage: React.FC = () => {
  const { history, clearHistory, setActiveImage, activeImage } = useImage();
  const navigate = useNavigate();

  const handleDownloadItem = (dataUrl: string, name: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `imagerevive_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadAsActive = (entry: any) => {
    if (entry.outputImageBase64) {
      setActiveImage({
        id: entry.outputImageId,
        dataUrl: entry.outputImageBase64,
        filename: `${entry.operationName}.png`,
        width: activeImage?.width || 512,
        height: activeImage?.height || 512,
      });
      navigate('/inspector');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Clear Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-base font-bold text-primary font-heading tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-accent" />
            <span>Recent Edits ({history.length})</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Review recent edits, revisit available results, and download processed images.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="px-3 py-1.5 rounded-lg border border-error/30 bg-error/10 text-error hover:bg-error/20 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Persistence Notice Alert */}
      <div className="p-3.5 rounded-xl border border-border bg-elevated/70 text-xs text-secondary flex items-start gap-2.5">
        <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-primary font-semibold">Session Storage Policy:</strong> Processed images are maintained in memory during your active session. Download any results you wish to keep before closing your browser.
        </p>
      </div>

      {/* History Items List */}
      {history.length > 0 ? (
        <div className="space-y-4">
          {history.map((entry, index) => (
            <div
              key={entry.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface hover:border-border-strong transition-all shadow-xs"
            >
              <div className="flex items-center gap-4 min-w-0">
                {/* Index & Timestamp Badge */}
                <div className="w-10 h-10 rounded-lg bg-elevated border border-border flex flex-col items-center justify-center shrink-0 text-center font-mono">
                  <span className="text-[10px] text-muted">#{history.length - index}</span>
                  <Clock className="w-3 h-3 text-accent -mt-0.5" />
                </div>

                {/* Operation Details */}
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading font-bold text-sm text-primary truncate">
                      {entry.operationName}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-elevated border border-border text-muted">
                      {entry.timestamp}
                    </span>
                  </div>

                  {entry.explanation && (
                    <p className="text-xs text-secondary line-clamp-1">{entry.explanation}</p>
                  )}

                  {/* Parameters JSON Pill */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Object.entries(entry.parameters || {}).map(([k, v]) => (
                      <span
                        key={k}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-main border border-border text-muted"
                      >
                        {k}: <span className="text-accent">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                      </span>
                    ))}
                    {entry.metrics && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-success/10 border border-success/30 text-success">
                        PSNR: {entry.metrics.psnr} dB
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {entry.outputImageBase64 && (
                  <>
                    <button
                      onClick={() => handleDownloadItem(entry.outputImageBase64, entry.operationName)}
                      title="Download Result Image"
                      className="p-2 rounded-lg bg-elevated border border-border text-secondary hover:text-accent hover:border-accent transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleLoadAsActive(entry)}
                      title="Load into Active Workspace"
                      className="px-3 py-1.5 rounded-lg bg-accent text-surface hover:bg-accent-hover text-xs font-medium font-mono flex items-center gap-1 transition-colors shadow-xs"
                    >
                      <span>Load to Workspace</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="p-16 text-center rounded-2xl border border-dashed border-border bg-surface text-muted space-y-3">
          <History className="w-12 h-12 mx-auto opacity-30 text-accent" />
          <h3 className="text-base font-semibold text-primary font-heading">No Operations in Active Session</h3>
          <p className="text-xs max-w-sm mx-auto">
            Transformations, filters, and restorations executed in the labs will appear here with parameter snapshots and download actions.
          </p>
        </div>
      )}
    </div>
  );
};
