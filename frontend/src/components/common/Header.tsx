import { Sun, Moon, Laptop, Image as ImageIcon, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useImage } from '../../contexts/ImageContext';

interface HeaderProps {
  pageTitle: string;
  pageSubtitle?: string;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle, pageSubtitle }) => {
  const { themeMode, setThemeMode } = useTheme();
  const { activeImage, backendHealthy, checkBackendHealth } = useImage();

  return (
    <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-primary flex items-center gap-2">
            {pageTitle}
          </h1>
          {pageSubtitle && (
            <p className="text-xs text-muted -mt-0.5 hidden sm:block">{pageSubtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Active Image Indicator */}
        {activeImage ? (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-elevated border border-border text-xs text-secondary">
            <ImageIcon className="w-3.5 h-3.5 text-accent" />
            <span className="font-medium truncate max-w-[140px] text-primary">{activeImage.filename}</span>
            <span className="font-mono text-[11px] text-muted">
              ({activeImage.width}×{activeImage.height})
            </span>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-elevated border border-border text-xs text-muted">
            <ImageIcon className="w-3.5 h-3.5 text-muted" />
            <span>No image selected</span>
          </div>
        )}

        {/* Backend Health Indicator */}
        <button
          onClick={() => checkBackendHealth()}
          title={backendHealthy ? "Backend connected (FastAPI)" : "Backend offline - click to reconnect"}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors ${
            backendHealthy
              ? "bg-success/10 border-success/30 text-success hover:bg-success/15"
              : "bg-error/10 border-error/30 text-error hover:bg-error/15"
          }`}
        >
          {backendHealthy ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Engine Online</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Engine Offline</span>
              <RefreshCw className="w-3 h-3 ml-1 animate-spin" />
            </>
          )}
        </button>

        {/* Theme Mode Selector */}
        <div className="flex items-center bg-elevated border border-border rounded-lg p-0.5 text-secondary">
          <button
            onClick={() => setThemeMode('light')}
            title="Light Theme"
            className={`p-1.5 rounded-md text-xs transition-colors ${
              themeMode === 'light' ? 'bg-surface text-accent shadow-sm font-medium' : 'hover:text-primary'
            }`}
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            onClick={() => setThemeMode('dark')}
            title="Dark Theme"
            className={`p-1.5 rounded-md text-xs transition-colors ${
              themeMode === 'dark' ? 'bg-surface text-accent shadow-sm font-medium' : 'hover:text-primary'
            }`}
          >
            <Moon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setThemeMode('system')}
            title="System Preference"
            className={`p-1.5 rounded-md text-xs transition-colors ${
              themeMode === 'system' ? 'bg-surface text-accent shadow-sm font-medium' : 'hover:text-primary'
            }`}
          >
            <Laptop className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
